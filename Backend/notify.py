# notify.py
import os, requests, json
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from db import AsyncSessionLocal
from google.oauth2 import service_account
from googleapiclient.discovery import build


TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DOCTOR_CHAT_ID = os.getenv("DOCTOR_CHAT_ID")
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
DOCTOR_CALENDAR_ID = os.getenv("DOCTOR_CALENDAR_ID")

def send_telegram_text(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    r = requests.post(url, json={"chat_id": DOCTOR_CHAT_ID, "text": text, "parse_mode": "Markdown"})
    return r.json()

def find_next_slot_and_create_event(patient_email, description, patient_name, event_minutes=15, start_after_hours=1):
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=["https://www.googleapis.com/auth/calendar"])
    service = build("calendar", "v3", credentials=creds)
    now = datetime.utcnow() + timedelta(hours=start_after_hours)
    # round to next 15 min
    minutes = ((now.minute // 15) + 1) * 15
    candidate = now.replace(minute=0, second=0, microsecond=0) + timedelta(minutes=minutes)
    end_search = candidate + timedelta(days=7)
    while candidate < end_search:
        tmin = candidate.isoformat() + "Z"
        tmax = (candidate + timedelta(minutes=event_minutes)).isoformat() + "Z"
        fb = service.freebusy().query(body={"timeMin": tmin, "timeMax": tmax, "items":[{"id": DOCTOR_CALENDAR_ID}]}).execute()
        busy = fb["calendars"][DOCTOR_CALENDAR_ID]["busy"]
        if not busy:
            event = {
                "summary": f"Cardio consult: {patient_name}",
                "description": description,
                "start": {"dateTime": tmin},
                "end": {"dateTime": tmax},
                "attendees": [{"email": patient_email}, {"email": DOCTOR_CALENDAR_ID}],
            }
            ev = service.events().insert(calendarId=DOCTOR_CALENDAR_ID, body=event, sendUpdates="all").execute()
            return ev
        candidate = candidate + timedelta(minutes=event_minutes)
    return None

async def send_telegram_and_schedule(consult_id: int):
    async with AsyncSessionLocal() as db:
        # fetch consult + patient
        consult = await db.get(Consult, consult_id)
        await db.refresh(consult)
        patient = await db.get(Patient, consult.patient_id)
        # build message
        lines = [f"*New Cardiology Consult*\n*Patient*: {patient.name}\n*Email*: {patient.email}\n*Symptoms*: {', '.join(consult.symptoms)}\n", "*Follow-ups:*"]
        for k, answers in (consult.follow_up_answers or {}).items():
            lines.append(f"_{k}_")
            for i, a in enumerate(answers):
                lines.append(f"{i+1}. {a}")
        text = "\n".join(lines)
        send_telegram_text(text)
        # create calendar event
        description = "\n".join(lines)
        ev = find_next_slot_and_create_event(patient.email, description, patient.name)
        if ev:
            consult.calendar_event_id = ev.get("id")
            consult.status = "scheduled"
        else:
            consult.status = "needs_manual_schedule"
        await db.commit()
        
