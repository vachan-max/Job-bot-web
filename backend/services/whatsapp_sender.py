import os
import time
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

TWILIO_SID   = os.getenv("TWILIO_SID")
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
TWILIO_FROM  = os.getenv("TWILIO_FROM", "whatsapp:+14155238886")
MAX_CHARS    = 1500


def _send(client, to: str, body: str):
    if len(body) > MAX_CHARS:
        body = body[:MAX_CHARS - 3] + "..."
    client.messages.create(body=body, from_=TWILIO_FROM, to=to)


def send_whatsapp(jobs: list, phone: str):
    if not jobs:
        print("[whatsapp] No jobs to send")
        return

    client = Client(TWILIO_SID, TWILIO_TOKEN)
    to     = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone

    # header message
    header = (
        f"Top {len(jobs)} Job Alert{'s' if len(jobs) > 1 else ''} For You Today!\n\n"
        f"Detailed cards follow below"
    )
    try:
        _send(client, to, header)
        print(f"[whatsapp] Header sent to {to}")
    except Exception as e:
        print(f"[whatsapp] Header error: {e}")

    # one message per job with 1.5s delay between each
    for i, job in enumerate(jobs, 1):
        time.sleep(1.5)  # rate limit — Twilio recommends 1 msg/sec

        title      = job.get("job_title") or "Job"
        company    = job.get("company")   or "Company"
        location   = job.get("location")  or "Location N/A"
        ai_score   = job.get("ai_score")  or "N/A"
        match_pct  = job.get("match_percent") or "N/A"
        apply_link = job.get("apply_link") or "N/A"
        skills_gap = job.get("skills_gap") or ""
        cover      = job.get("cover_letter") or ""
        cover_short = (cover[:800] + "...") if len(cover) > 800 else cover

        msg = (
            f"{i}. {title}\n"
            f"Company : {company}\n"
            f"Location: {location}\n"
            f"AI Score: {ai_score}/100\n"
            f"Resume Match: {match_pct}%\n"
        )

        if skills_gap:
            msg += f"Skills to learn: {skills_gap}\n"

        msg += f"Apply: {apply_link}\n"

        if cover_short:
            msg += f"\nCover Letter:\n{cover_short}"

        try:
            _send(client, to, msg)
            print(f"[whatsapp] Job {i} sent -> {title} at {company}")
        except Exception as e:
            print(f"[whatsapp] Error sending job {i}: {e}")