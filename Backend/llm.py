# llm.py
import os
import json
import httpx
import json

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API = "https://api.openai.com/v1/chat/completions"

SYSTEM_PROMPT = """
You are a friendly, concise assistant that only rewrites or wraps follow-up questions provided by the system.
RULES:
1. Do NOT invent medical follow-up questions or infer medical conclusions.
2. Use only the follow-up question text provided by the system.
3. Keep output short (1-2 sentences) appropriate for a chat UI.
4. Do not give medical advice or interpret answers.
"""

async def call_llm(prompt: str, system: str = "You are a helpful assistant.", max_tokens: int = 150, temperature: float = 0.2) -> str:
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(OPENAI_API, headers=headers, json=payload)
        r.raise_for_status()
        resp = r.json()
        return resp["choices"][0]["message"]["content"].strip()

async def extract_symptoms(user_text: str, known_symptoms: list[str]) -> list[str]:
    prompt = f"""
    Extract from this text all symptoms that match or are similar to this known list:
    {", ".join(known_symptoms)}.

    Text: "{user_text}"

    Respond with ONLY a JSON list of symptoms exactly as in the known list, if present.
    Example: ["chest pain", "shortness of breath"]
    """
    raw = await call_llm(prompt, system="You are a strict symptom extractor.", max_tokens=150, temperature=0.0)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
            return parsed
    except Exception:
        if "[" in raw and "]" in raw:
            try:
                snippet = raw[raw.index("["): raw.rindex("]")+1]
                parsed = json.loads(snippet)
                if isinstance(parsed, list):
                    return [str(x) for x in parsed]
            except Exception:
                pass
    return []

async def rephrase_followup(patient_name: str, follow_up_question: str, prev_user_text: str | None = None) -> str:
    prompt_user = f"Patient name: {patient_name}\nFollow-up question (do not change meaning): {follow_up_question}\n"
    if prev_user_text:
        prompt_user += f"Patient said previously: {prev_user_text}\n"
    prompt_user += "Return a single short message that asks this question politely."
    return await call_llm(prompt_user, system=SYSTEM_PROMPT, max_tokens=80, temperature=0.2)

async def explain_answer(question: str, answer: str, symptom: str) -> str:
    prompt = (
        f"Patient symptom: {symptom}\n"
        f"Follow-up question: \"{question}\"\n"
        f"Patient answer: \"{answer}\"\n\n"
        "Rewrite the patient's answer into a concise, clinician-friendly note (1-2 short sentences). "
        "Use clinical wording (e.g., 'acute onset', 'intermittent', 'worse with exertion'). "
        "If the answer is vague, summarize the gist and mention uncertainty."
    )
    return await call_llm(prompt, system="You are a medical scribe.", max_tokens=80, temperature=0.3)

async def is_vague_answer(question: str, answer: str) -> tuple[bool, str | None]:
    """
    Detect vague answers. If vague, suggest a clarifying follow-up.
    Returns (is_vague, clarifying_question).
    """
    prompt = f"""
    The bot asked: "{question}"
    Patient answered: "{answer}"

    1. Decide if the patient's answer is vague or unclear.
    2. If vague, suggest ONE clarifying question to get more useful detail.

    Respond ONLY in JSON:
    {{"vague": true, "clarify": "Can you tell me when it started (yesterday, today, etc.)?"}}
    or
    {{"vague": false}}
    """
    raw = await call_llm(prompt, system="You are a strict JSON generator.", max_tokens=100, temperature=0.3)
    try:
        parsed = json.loads(raw)
        return parsed.get("vague", False), parsed.get("clarify")
    except Exception:
        return False, None

async def extract_field(field: str, user_text: str) -> str | None:
    """
    Use LLM to extract a specific field (name, age, or email) from user_text.
    Returns a clean string or None if not found.
    """
    prompt = f"""
    Extract the {field} from this patient response: "{user_text}".

    Rules:
    - If field is 'age', return only the integer number (e.g., 24).
    - If field is 'email', return only the email address.
    - If field is 'name', return only the name (first + last if given).
    - Respond in JSON format: {{"{field}": "value"}}
    """

    raw = await call_llm(prompt, system="You are a strict extractor that only outputs JSON.", max_tokens=50)

    try:
        data = json.loads(raw)
        return str(data.get(field))
    except Exception:
        return None
    
