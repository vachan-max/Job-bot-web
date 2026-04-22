# ─────────────────────────────────────────────────────────────────
# resume_parser.py — Fetches resume text from MongoDB per user
# ─────────────────────────────────────────────────────────────────

from config import users_col
from bson import ObjectId


async def get_resume_text(user_id: str) -> str:
    """
    Fetches resume text from MongoDB for a specific user.
    Returns empty string if no resume uploaded.
    """
    try:
        user = await users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            print(f"[resume_parser] User {user_id} not found")
            return ""

        text = user.get("resume_text", "").strip()

        if not text:
            print(f"[resume_parser] No resume uploaded for user {user_id}")
            return ""

        print(f"[resume_parser] Loaded resume ({len(text)} chars) for user {user_id}")
        return text

    except Exception as e:
        print(f"[resume_parser] Error fetching resume: {e}")
        return ""