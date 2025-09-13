import socketio
from fastapi import FastAPI, Depends, Body
from db import engine, Base, get_db, async_session_maker as AsyncSessionLocal
import schemas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import models
from models import Patient, Consult, SymptomRule
from fastapi.middleware.cors import CORSMiddleware
from difflib import get_close_matches
import traceback
import logging
from fastapi import HTTPException
from models import FollowUpRule
from schemas import FollowUpRuleOut
from word2number import w2n

from llm import rephrase_followup, extract_symptoms, explain_answer, is_vague_answer, extract_field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("consult")

import re

app = FastAPI()
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals
SID_TO_STATE = {}       # sid -> { stage, name, age, email }
SID_TO_CONSULT = {}     # sid -> { id, name, age, email }
CONSULT_QUEUES = {}     # sid -> list of follow-up questions
LAST_QUESTION = {}      # sid -> last asked question
RETRY_COUNT = {}        # sid -> retry attempts

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ---------------- REST ---------------- #
@app.get("/patients", response_model=list[schemas.PatientOut])
async def get_patients(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Patient))
    return res.scalars().all()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/symptoms")
async def get_symptoms(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SymptomRule))
    rules = res.scalars().all()
    return [{"symptom": r.symptom_key, "questions": r.follow_up_questions} for r in rules]


@app.post("/symptoms")
async def add_symptom(rule: dict = Body(...), db: AsyncSession = Depends(get_db)):
    new_rule = SymptomRule(symptom_key=rule["symptom_key"], follow_up_questions=rule["follow_up_questions"])
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return {"symptom": new_rule.symptom_key, "questions": new_rule.follow_up_questions}

# Escalations alias endpoints
@app.get("/escalations", response_model=list[FollowUpRuleOut])
async def get_escalations(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(FollowUpRule))
    return res.scalars().all()   # ✅ now works because orm_mode=True
@app.post("/escalations", response_model=FollowUpRuleOut)
async def create_escalation(rule: dict = Body(...), db: AsyncSession = Depends(get_db)):
    new_rule = FollowUpRule(
        symptom_key=rule["symptom_key"],
        question_pattern=rule["question_pattern"],
        trigger_values=rule["trigger_values"],
        new_urgency=rule["new_urgency"],
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@app.delete("/escalations/{rule_id}")
async def delete_escalation(rule_id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(FollowUpRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Escalation not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Escalation deleted"}


@app.get("/followup-rules", response_model=list[FollowUpRuleOut])
async def get_followup_rules(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(FollowUpRule))
    return res.scalars().all()

@app.post("/followup-rules", response_model=FollowUpRuleOut)
async def create_followup_rule(rule: dict = Body(...), db: AsyncSession = Depends(get_db)):
    new_rule = FollowUpRule(
        symptom_key=rule["symptom_key"],
        question_pattern=rule["question_pattern"],
        trigger_values=rule["trigger_values"],
        new_urgency=rule["new_urgency"],
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@app.delete("/followup-rules/{rule_id}")
async def delete_followup_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    rule = await db.get(FollowUpRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Rule deleted"}
# ---------------- Helpers ---------------- #
def normalize_and_match(extracted: list[str], known: list[str]) -> list[str]:
    matched = []
    for e in extracted:
        e_norm = e.strip().lower()
        for k in known:
            if e_norm == k.lower():
                matched.append(k)
                break
        else:
            close = get_close_matches(e_norm, [k.lower() for k in known], n=1, cutoff=0.6)
            if close:
                for k in known:
                    if k.lower() == close[0]:
                        matched.append(k)
                        break
    return list(dict.fromkeys(matched))


def normalize_to_canonical(sym_input: str, canonical_list: list[str]) -> str | None:
    if not sym_input or not canonical_list:
        return None
    s = sym_input.strip()
    for k in canonical_list:
        if s.lower() == k.lower():
            return k
    close = get_close_matches(s.lower(), [k.lower() for k in canonical_list], n=1, cutoff=0.6)
    if close:
        for k in canonical_list:
            if k.lower() == close[0]:
                return k
    return None


# ---------------- SOCKET HANDLERS ---------------- #
@sio.event
async def connect(sid, environ):
    logger.info("Socket connected: %s", sid)
    SID_TO_STATE[sid] = {"stage": "ask_name"}
    RETRY_COUNT[sid] = 0
    phrased = await rephrase_followup("Patient", "Please tell me your name?")
    await sio.emit("bot_message", {"msg": phrased}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info("Socket disconnected: %s", sid)
    SID_TO_STATE.pop(sid, None)
    SID_TO_CONSULT.pop(sid, None)
    CONSULT_QUEUES.pop(sid, None)
    LAST_QUESTION.pop(sid, None)
    RETRY_COUNT.pop(sid, None)


# Step 1: Name → Age → Email (uses LLM extract_field with safeties)
@sio.event
@sio.event
async def start_consult(sid, data):
    try:
        state = SID_TO_STATE.get(sid, {})
        stage = state.get("stage")

        # ---- Step 1: Name ----
        if stage == "ask_name":
            raw_name = data.get("name") if isinstance(data, dict) else str(data)
            extracted_name = await extract_field("name", str(raw_name))
            state["name"] = extracted_name or str(raw_name).strip()
            state["stage"] = "ask_age"
            phrased = await rephrase_followup(state["name"], "Now please tell me your age.")
            await sio.emit("bot_message", {"msg": phrased}, to=sid)
            return

        # ---- Step 2: Age ----
        if stage == "ask_age":
            raw_age = data.get("age") if isinstance(data, dict) else str(data)
            extracted_age = await extract_field("age", str(raw_age))
            state["age"] = extracted_age or str(raw_age).strip()
            state["stage"] = "ask_email"
            phrased = await rephrase_followup(state["age"], "Now please provide your email ID.")
            await sio.emit("bot_message", {"msg": phrased}, to=sid)
            return
        # ---- Step 3: Email ----
        if stage == "ask_email":
            raw_email = data.get("email") if isinstance(data, dict) else str(data)
            extracted_email = await extract_field("email", str(raw_email))
            state["email"] = extracted_email or str(raw_email).strip()

            async with AsyncSessionLocal() as db:
                existing = (
                    await db.execute(select(Patient).where(Patient.email == state["email"]).limit(1))
                ).scalar_one_or_none()

                if existing:
                    patient = existing
                    if not patient.age and "age" in state:
                        patient.age = state["age"]
                        await db.commit()
                else:
                    patient = Patient(
                        name=state["name"],
                        age=state.get["age"],
                        email=state["email"],
                    )
                    db.add(patient)
                    await db.commit()
                    await db.refresh(patient)

                consult = Consult(patient_id=patient.id, symptoms=[], follow_up_answers={})
                db.add(consult)
                await db.commit()
                await db.refresh(consult)

                SID_TO_CONSULT[sid] = {
                    "id": consult.id,
                    "name": state["name"],
                    "age": state.get["age"],
                    "email": state["email"],
                }

            state["stage"] = "collect_symptoms"
            phrased = await rephrase_followup(
                state["name"], "Please tell me your symptoms (e.g., chest pain, shortness of breath)."
            )
            await sio.emit("bot_message", {"msg": phrased}, to=sid)
            return

        await sio.emit("bot_message", {"msg": "⚠️ Unexpected input."}, to=sid)

    except Exception:
        traceback.print_exc()
        await sio.emit("bot_message", {"msg": "❌ Error while starting consult."}, to=sid)
# Step 2: Collect Symptoms
@sio.event
async def patient_symptoms(sid, data):
    try:
        state = SID_TO_STATE.get(sid, {})
        if state.get("stage") != "collect_symptoms":
            await sio.emit("bot_message", {"msg": "⚠️ Session not started."}, to=sid)
            return

        consult_info = SID_TO_CONSULT.get(sid)
        if not consult_info:
            await sio.emit("bot_message", {"msg": "⚠️ No consult found."}, to=sid)
            return

        consult_id = consult_info["id"]
        text = data.get("symptoms_text", "") if isinstance(data, dict) else str(data)

        async with AsyncSessionLocal() as db:
            all_rules = (await db.execute(select(SymptomRule))).scalars().all()
            known_keys = [r.symptom_key for r in all_rules]

            extracted = await extract_symptoms(text, known_keys)
            matched_keys = normalize_and_match(extracted, known_keys)

            if not matched_keys:
                all_keys = ", ".join(known_keys)
                phrased = await rephrase_followup(
                    consult_info["name"],
                    f"Sorry, I couldn’t recognise your symptoms. Please choose from: {all_keys}"
                )
                await sio.emit("bot_message", {"msg": phrased}, to=sid)
                return

            matched_rules = []
            for key in matched_keys:
                r = await db.execute(select(SymptomRule).where(SymptomRule.symptom_key == key))
                rule = r.scalar_one_or_none()
                if rule:
                    matched_rules.append(rule)

            res = await db.execute(select(Consult).options(selectinload(Consult.patient)).where(Consult.id == consult_id))
            consult = res.scalar_one()

            if not consult.follow_up_answers:
                consult.follow_up_answers = {k.symptom_key: [] for k in matched_rules}

            consult.symptoms = [m.symptom_key for m in matched_rules]
            await db.commit()

            CONSULT_QUEUES[sid] = []
            for m in matched_rules:
                for idx, q in enumerate(m.follow_up_questions or []):
                    CONSULT_QUEUES[sid].append({
                        "symptoms": [m.symptom_key],
                        "qIndex": idx,
                        "text": q,
                        "questionText": q
                    })

        state["stage"] = "followups"
        if CONSULT_QUEUES.get(sid):
            first_item = CONSULT_QUEUES[sid].pop(0)
            LAST_QUESTION[sid] = first_item
            phrased = await rephrase_followup(
                consult_info["name"],
                f"For your {', '.join(first_item['symptoms'])}, {first_item['text']}"
            )
            await sio.emit("ask_question", {**first_item, "question": phrased}, to=sid)
        else:
            await _send_doctor_summary_and_finish(sid)

    except Exception:
        traceback.print_exc()
        await sio.emit("bot_message", {"msg": "❌ Error while collecting symptoms."}, to=sid)


# Step 3: Save Answer with vagueness check
@sio.event
async def answer_question(sid, data):
    try:
        consult_info = SID_TO_CONSULT.get(sid)
        if not consult_info:
            await sio.emit("bot_message", {"msg": "⚠️ No consult found."}, to=sid)
            return

        consult_id = consult_info["id"]
        symptoms_for_question = data.get("symptoms") or []
        answer = (data.get("answerText") or data.get("answer") or "").strip()
        q_obj = LAST_QUESTION.get(sid)
        question_text = (data.get("questionText") or data.get("text") or (q_obj and (q_obj.get("questionText") or q_obj.get("text"))) or "").strip()
        if not question_text:
            question_text = "Follow-up question"

        # ✅ vagueness check
        is_vague, clarifying = await is_vague_answer(question_text, answer)
        if is_vague and RETRY_COUNT.get(sid, 0) < 2:
            RETRY_COUNT[sid] = RETRY_COUNT.get(sid, 0) + 1
            phrased = clarifying or f"Could you clarify: {question_text}"
            await sio.emit("ask_question", {
                "symptoms": symptoms_for_question,
                "qIndex": q_obj.get("qIndex") if q_obj else 0,
                "text": question_text,
                "question": phrased
            }, to=sid)
            return
        RETRY_COUNT[sid] = 0  # reset

        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Consult).options(selectinload(Consult.patient)).where(Consult.id == consult_id))
            consult = res.scalar_one_or_none()
            if not consult:
                await sio.emit("bot_message", {"msg": "⚠️ Consult not found."}, to=sid)
                return

            if not consult.follow_up_answers:
                consult.follow_up_answers = {}
            for k in consult.symptoms or []:
                consult.follow_up_answers.setdefault(k, [])

            # Determine canonical targets
            canonical_targets = []
            for s in symptoms_for_question:
                canonical = normalize_to_canonical(s, consult.symptoms or [])
                if canonical:
                    canonical_targets.append(canonical)
            if not canonical_targets and q_obj:
                for s in (q_obj.get("symptoms") or []):
                    canonical = normalize_to_canonical(s, consult.symptoms or [])
                    if canonical:
                        canonical_targets.append(canonical)
            if not canonical_targets:
                canonical_targets = list(consult.symptoms or [])

            updated = dict(consult.follow_up_answers or {})
            for sym in canonical_targets:
                updated.setdefault(sym, [])
                new_entry = {"question": question_text, "answer": answer}
                try:
                    doctor_note = await explain_answer(question_text, answer, sym)
                    if doctor_note:
                        new_entry["doctor_note"] = doctor_note
                except Exception as e:
                    logger.exception("explain_answer failed: %s", e)
                updated[sym] = updated[sym] + [new_entry]

            consult.follow_up_answers = updated
            consult.urgency = await determine_urgency(consult.symptoms, updated, db)
            await db.commit()

        # next question or finish
        if CONSULT_QUEUES.get(sid):
            next_item = CONSULT_QUEUES[sid].pop(0)
            LAST_QUESTION[sid] = next_item
            phrased = await rephrase_followup(
                consult_info["name"],
                f"For your {', '.join(next_item['symptoms'])}, {next_item['text']}",
                prev_user_text=answer
            )
            await sio.emit("ask_question", {**next_item, "question": phrased}, to=sid)
        else:
            await _send_doctor_summary_and_finish(sid)

    except Exception:
        traceback.print_exc()
        await sio.emit("bot_message", {"msg": "❌ Error while recording answer."}, to=sid)


# ---------------- Summary ---------------- #
async def _send_doctor_summary_and_finish(sid):
    consult_info = SID_TO_CONSULT.get(sid)
    if not consult_info:
        return
    consult_id = consult_info["id"]
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(Consult).options(selectinload(Consult.patient)).where(Consult.id == consult_id)
            )
            consult = res.scalar_one_or_none()
            if not consult:
                return

            summary_lines = [
                "🩺 Doctor Summary",
                f"Patient: {consult_info.get('name')}",
                f"Age: {consult_info.get('age')}" if consult_info.get("age") else "Age: Not provided",
                f"Email: {consult_info.get('email')}",
                f"Urgency: {(consult.urgency or 'normal').upper()}",
                "Symptoms reported: " + (", ".join(consult.symptoms or []) if consult.symptoms else "None"),
                ""
            ]

            # 📝 Regular Q/A answers
            for s in (consult.symptoms or []):
                summary_lines.append(f"--- {s} ---")
                answers = (consult.follow_up_answers or {}).get(s, [])
                if not isinstance(answers, list) or not answers:
                    summary_lines.append("No follow-up answers provided.")
                else:
                    answers = merge_related_answers(answers)
                    for i, qa in enumerate(answers, start=1):
                        if not isinstance(qa, dict):
                            continue
                        qtxt = qa.get("question") or "Follow-up question"
                        atxt = qa.get("answer") or ""
                        if atxt.strip():
                            summary_lines.append(f"Q{i}: {qtxt}")
                            summary_lines.append(f"A{i}: {atxt}")
                            doc_note = qa.get("doctor_note")
                            if doc_note:
                                summary_lines.append(f"🧾 Doctor Note: {doc_note}")
                    summary_lines.append("")

            # 🆙 Add escalation info separately
            res = await db.execute(select(FollowUpRule))
            followup_rules = res.scalars().all()

            escalation_notes = []
            for s, answers in (consult.follow_up_answers or {}).items():
                for qa in answers:
                    q = qa.get("question", "")
                    a = qa.get("answer", "")

                    for rule in followup_rules:
                        if rule.symptom_key != s:
                            continue
                        if re.search(rule.question_pattern, q, re.I) and any(
                            tv.lower() in a.lower() for tv in rule.trigger_values
                        ):
                            escalation_notes.append(
                                f"{s}: Escalated → {rule.new_urgency.upper()} (Q matched '{rule.question_pattern}', Answer matched)"
                            )

            if escalation_notes:
                summary_lines.append("⚠️ Escalations Applied:")
                summary_lines.extend(escalation_notes)

            # Finalize
            summary_text = "\n".join(summary_lines)
            await sio.emit("bot_message", {"msg": summary_text}, to=sid)
            await sio.emit("bot_message", {"msg": "✅ Thanks — I have all your answers. I'll notify the doctor."}, to=sid)

            consult.status = "completed"
            await db.commit()
    except Exception as e:
        traceback.print_exc()
        await sio.emit("bot_message", {"msg": f"❌ Failed to prepare doctor summary: {e}"}, to=sid)
    finally:
        CONSULT_QUEUES.pop(sid, None)
        SID_TO_STATE.pop(sid, None)
        SID_TO_CONSULT.pop(sid, None)
        LAST_QUESTION.pop(sid, None)
        RETRY_COUNT.pop(sid, None)

def merge_related_answers(symptom_answers: list[dict]) -> list[dict]:
    """
    Merge related follow-up answers (like onset/date/year) into a single Q/A entry.
    """
    merged = []
    onset_group = []

    for qa in symptom_answers:
        q = (qa.get("question") or "").lower()
        a = qa.get("answer") or ""

        if any(keyword in q for keyword in ["when", "date", "year", "start"]):
            if a.strip():
                onset_group.append(a.strip())
        else:
            merged.append(qa)

    if onset_group:
        combined = ", ".join(onset_group)
        merged.insert(0, {
            "question": "When did the pain start?",
            "answer": combined
        })

    return merged

import re
from models import Patient, Consult, SymptomRule, FollowUpRule

# ---------------- Helpers ---------------- #
# ---------------- Helpers ---------------- #
async def judge_rule_match(question: str, answer: str, rule: FollowUpRule) -> bool:
    """
    Use the LLM to decide if a patient's answer effectively satisfies a follow-up rule,
    even if it doesn't literally match regex/trigger values.
    """
    from llm import call_llm  # reuse your existing LLM call

    prompt = f"""
    You are a medical reasoning assistant. 

    Follow-up Rule:
    - Symptom: {rule.symptom_key}
    - Question pattern: {rule.question_pattern}
    - Trigger values: {rule.trigger_values}
    - Intended urgency level: {rule.new_urgency}

    Patient's response:
    Q: {question}
    A: {answer}

    Based on the rule's intent, does the patient's answer satisfy the condition?
    Reply strictly with JSON: {{"match": true}} or {{"match": false}}
    """

    try:
        raw = await call_llm(prompt, system="You are a strict JSON generator.", max_tokens=50)
        import json
        data = json.loads(raw)
        return data.get("match", False)
    except Exception as e:
        logger.warning("LLM rule match failed: %s", e)
        return False


async def determine_urgency(symptoms, follow_up_answers, db):
    # 1. Base urgency from symptom rules
    res = await db.execute(select(SymptomRule))
    symptom_rules = res.scalars().all()
    urgency = "normal"

    urgency_rank = {
        "normal": 0,
        "semi-urgent": 1,
        "urgent": 2,
        "very_urgent": 3,
        "high": 4
    }

    for s in symptoms:
        rule = next((r for r in symptom_rules if r.symptom_key == s), None)
        if rule and urgency_rank.get(rule.urgency, 0) > urgency_rank[urgency]:
            urgency = rule.urgency

    # 2. Escalation from follow-up answers
    res = await db.execute(select(FollowUpRule))
    followup_rules = res.scalars().all()

    for s, answers in (follow_up_answers or {}).items():
        for qa in answers:
            q = qa.get("question", "")
            a = (qa.get("answer") or "").lower()

            for rule in followup_rules:
                if rule.symptom_key != s:
                    continue

                # --- literal regex + string match ---
                if re.search(rule.question_pattern, q, re.I):
                    if any(tv.lower() in a for tv in rule.trigger_values):
                        if urgency_rank[rule.new_urgency] > urgency_rank[urgency]:
                            urgency = rule.new_urgency
                            continue

                    # --- 🔥 LLM semantic fallback ---
                    llm_match = await judge_rule_match(q, a, rule)
                    if llm_match and urgency_rank[rule.new_urgency] > urgency_rank[urgency]:
                        urgency = rule.new_urgency

    return urgency
