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

def send_whatsapp(jobs: list, phone: str, prefs: dict = None):
    if not jobs:
        print("[whatsapp] No jobs to send")
        return

    if prefs is None:
        prefs = {}

    use_ai_filter    = prefs.get("use_ai_filter",    True)
    use_resume_match = prefs.get("use_resume_match",  True)
    use_cover_letter = prefs.get("use_cover_letter",  True)

    client = Client(TWILIO_SID, TWILIO_TOKEN)
    to     = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone

    # ── Build summary in chunks to avoid hitting 1500 char limit ──
    header = (
        f"🔔 *Job Bot Alert*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"Found *{len(jobs)} job{'s' if len(jobs) > 1 else ''}* matching your profile!\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
    )

    # Send header first
    try:
        _send(client, to, header)
        print(f"[whatsapp] Header sent")
    except Exception as e:
        print(f"[whatsapp] Header error: {e}")
        return

    time.sleep(1.5)

    # ── Send jobs in batches of 5 to avoid hitting char limit ──
    BATCH_SIZE = 5
    for batch_start in range(0, len(jobs), BATCH_SIZE):
        batch = jobs[batch_start:batch_start + BATCH_SIZE]
        chunk = ""

        for i, job in enumerate(batch, batch_start + 1):
            title      = job.get("job_title")     or "Job"
            company    = job.get("company")       or "Company"
            location   = job.get("location")      or "N/A"
            ai_score   = job.get("ai_score")      or 0
            match_pct  = job.get("match_percent") or 0
            apply_link = job.get("apply_link")    or "N/A"
            skills_gap = job.get("skills_gap")    or ""

            line = f"*{i}. {title}*\n"
            line += f"🏢 {company} | 📍 {location}\n"

            # Only show score/match if toggles are on
            if use_ai_filter:
                score_emoji = "🟢" if ai_score >= 80 else "🟡" if ai_score >= 60 else "🔴"
                line += f"{score_emoji} AI Score: *{ai_score}/100*"
                if use_resume_match:
                    match_emoji = "✅" if match_pct >= 70 else "🔶" if match_pct >= 40 else "❌"
                    line += f"  {match_emoji}  Resume Match: *{match_pct}%*"
                line += "\n"

            if skills_gap:
                line += f"📚 Learn: {skills_gap}\n"

            line += f"🔗 {apply_link}\n\n"
            chunk += line

        try:
            _send(client, to, chunk)
            print(f"[whatsapp] Batch {batch_start//BATCH_SIZE + 1} sent ({len(batch)} jobs)")
            time.sleep(1.5)
        except Exception as e:
            print(f"[whatsapp] Batch error: {e}")

    if not use_cover_letter:
        print("[whatsapp] Cover letter SKIPPED — toggle is off")
        return

    time.sleep(1.5)

    # Collect only jobs that have a cover letter
    jobs_with_covers = [(i+1, job) for i, job in enumerate(jobs) if job.get("cover_letter")]

    if not jobs_with_covers:
        print("[whatsapp] No cover letters to send")
        return

    # Send in batches of 3
    COVER_BATCH = 3
    for batch_start in range(0, len(jobs_with_covers), COVER_BATCH):
        batch = jobs_with_covers[batch_start:batch_start + COVER_BATCH]

        covers = ""
        if batch_start == 0:
            covers = f"✉️ *Cover Letters*\n━━━━━━━━━━━━━━━━━━━━\n\n"

        for num, job in batch:
            title = job.get("job_title") or "Job"
            cover = job.get("cover_letter") or ""

            if len(cover) > 500:
                cut = cover[:500].rfind(".")
                cover_short = cover[:cut + 1] if cut != -1 else cover[:500] + "..."
            else:
                cover_short = cover

            covers += f"*{num}. {title}*\n{cover_short}\n\n"

        try:
            _send(client, to, covers)
            print(f"[whatsapp] Cover batch {batch_start//COVER_BATCH + 1} sent")
            time.sleep(1.5)
        except Exception as e:
            print(f"[whatsapp] Cover batch error: {e}")