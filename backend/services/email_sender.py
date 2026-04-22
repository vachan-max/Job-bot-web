import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER     = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

def _score_color(score: int) -> str:
    if score >= 80: return "#10b981"
    if score >= 60: return "#f59e0b"
    return "#ef4444"

def _match_color(match: int) -> str:
    if match >= 70: return "#10b981"
    if match >= 40: return "#f59e0b"
    return "#ef4444"

def _score_emoji(score: int) -> str:
    if score >= 80: return "🟢"
    if score >= 60: return "🟡"
    return "🔴"

def _match_emoji(match: int) -> str:
    if match >= 70: return "✅"
    if match >= 40: return "🔶"
    return "❌"

def _build_job_card(i: int, job: dict, show_ai: bool, show_match: bool, show_cover: bool) -> str:
    title      = job.get("job_title")     or "Job"
    company    = job.get("company")       or "Company"
    location   = job.get("location")      or "N/A"
    ai_score   = job.get("ai_score")      or 0
    match_pct  = job.get("match_percent") or 0
    apply_link = job.get("apply_link")    or "#"
    skills_gap = job.get("skills_gap")    or ""
    cover      = job.get("cover_letter")  or ""

    score_section = ""
    if show_ai:
        score_section += f"""
        <span style="background:{_score_color(ai_score)}18; color:{_score_color(ai_score)};
            padding:4px 12px; border-radius:99px; font-size:13px; font-weight:600;
            border:1px solid {_score_color(ai_score)}40;">
            {_score_emoji(ai_score)} AI Score: {ai_score}/100
        </span>
        """
    if show_match:
        score_section += f"""
        <span style="background:{_match_color(match_pct)}18; color:{_match_color(match_pct)};
            padding:4px 12px; border-radius:99px; font-size:13px; font-weight:600;
            border:1px solid {_match_color(match_pct)}40; margin-left:8px;">
            {_match_emoji(match_pct)} Resume Match: {match_pct}%
        </span>
        """

    skills_section = ""
    if skills_gap:
        skills_section = f"""
        <div style="margin-top:12px; padding:10px 14px; background:#fffbeb;
            border-radius:10px; border:1px solid #fde68a;">
            <span style="font-size:12px; color:#92400e; font-weight:500;">
                📚 Skills to learn: {skills_gap}
            </span>
        </div>
        """

    cover_section = ""
    if show_cover and cover:
        cover_section = f"""
        <div style="margin-top:14px; padding:14px 16px; background:#f8f9fc;
            border-radius:10px; border:1px solid #e5e7eb;">
            <p style="font-size:12px; font-weight:600; color:#6b7280;
                margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">
                ✉️ Cover Letter
            </p>
            <p style="font-size:13px; color:#374151; line-height:1.7; margin:0;">
                {cover}
            </p>
        </div>
        """

    return f"""
    <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:16px;
        padding:20px 24px; margin-bottom:16px;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);">

        <!-- title row -->
        <div style="display:flex; align-items:center; justify-content:space-between;
            margin-bottom:6px; flex-wrap:wrap; gap:8px;">
            <h2 style="font-size:16px; font-weight:700; color:#111827; margin:0;">
                {i}. {title}
            </h2>
        </div>

        <!-- meta -->
        <p style="font-size:13px; color:#6b7280; margin:0 0 12px;">
            🏢 {company} &nbsp;·&nbsp; 📍 {location}
        </p>

        <!-- scores -->
        <div style="margin-bottom:14px;">
            {score_section}
        </div>

        {skills_section}
        {cover_section}

        <!-- apply button -->
        <div style="margin-top:16px;">
            <a href="{apply_link}" target="_blank"
                style="display:inline-block; padding:10px 22px; background:#6366f1;
                color:#ffffff; border-radius:10px; font-size:13px; font-weight:600;
                text-decoration:none;">
                Apply Now →
            </a>
        </div>
    </div>
    """

def _build_html(jobs: list, prefs: dict) -> str:
    show_ai    = prefs.get("use_ai_filter",    True)
    show_match = prefs.get("use_resume_match",  True)
    show_cover = prefs.get("use_cover_letter",  True)

    cards = "".join(_build_job_card(i+1, job, show_ai, show_match, show_cover) for i, job in enumerate(jobs))

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0; padding:0; background:#f3f4f6; font-family:'Segoe UI',Arial,sans-serif;">

        <div style="max-width:620px; margin:32px auto; padding:0 16px;">

            <!-- header -->
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                border-radius:20px 20px 0 0; padding:28px 32px; text-align:center;">
                <h1 style="color:#ffffff; font-size:24px; font-weight:700;
                    margin:0 0 6px; letter-spacing:-0.025em;">
                    🔔 Job Bot Alert
                </h1>
                <p style="color:rgba(255,255,255,0.85); font-size:14px; margin:0;">
                    Found <strong>{len(jobs)} job{'s' if len(jobs) > 1 else ''}</strong> matching your profile today
                </p>
            </div>

            <!-- body -->
            <div style="background:#f8f9fc; padding:24px 0;">
                {cards}
            </div>

            <!-- footer -->
            <div style="background:#ffffff; border-radius:0 0 20px 20px;
                border-top:1px solid #e5e7eb; padding:20px 32px; text-align:center;">
                <p style="font-size:12px; color:#9ca3af; margin:0;">
                    Sent by <strong style="color:#6366f1;">PingScore Job Bot</strong> ·
                    Manage preferences at your dashboard
                </p>
            </div>

        </div>
    </body>
    </html>
    """

def send_email(jobs: list, to_email: str, prefs: dict = None):
    if not jobs:
        print("[email] No jobs to send")
        return

    if prefs is None:
        prefs = {}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔔 PingScore — {len(jobs)} Job Alert{'s' if len(jobs) > 1 else ''} For You"
        msg["From"]    = f"PingScore Job Bot <{GMAIL_USER}>"
        msg["To"]      = to_email

        html = _build_html(jobs, prefs)
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        print(f"[email] Sent {len(jobs)} jobs to {to_email}")

    except Exception as e:
        print(f"[email] Error: {e}")

def send_no_jobs_email(to_email: str, name: str, reason: str = ""):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🔔 PingScore — No New Jobs Today"
        msg["From"]    = f"PingScore Job Bot <{GMAIL_USER}>"
        msg["To"]      = to_email

        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
          <div style="max-width:620px;margin:32px auto;padding:0 16px;">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:20px 20px 0 0;padding:28px 32px;text-align:center;">
              <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">🔔 Job Bot Alert</h1>
            </div>
            <div style="background:#fff;padding:32px;border-radius:0 0 20px 20px;border:1px solid #e5e7eb;">
              <p style="font-size:16px;color:#374151;margin:0 0 12px;">Hi <strong>{name}</strong>,</p>
              <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 16px;">
                Your scheduled job search ran today but no new jobs were found to send.
              </p>
              <div style="background:#f8f9fc;border-radius:12px;padding:16px;border:1px solid #e5e7eb;margin-bottom:24px;">
                <p style="font-size:13px;color:#374151;margin:0;">📋 <strong>Reason:</strong> {reason}</p>
              </div>
              <p style="font-size:13px;color:#9ca3af;margin:0;">
                The bot will try again tomorrow at your scheduled time.
                You can also trigger a manual search from your dashboard.
              </p>
            </div>
          </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        print(f"[email] No-jobs notification sent to {to_email}")

    except Exception as e:
        print(f"[email] No-jobs email error: {e}")