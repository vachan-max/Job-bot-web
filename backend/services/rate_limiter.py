from datetime import datetime, timedelta
from config import rate_limits_col

LIMITS = {
    "jsearch": {"daily": 50,   "weekly": 120},
    "groq"   : {"daily": 100, "weekly": 300},
    "email"  : {"daily": 20,  "weekly": 100},
}

async def check_and_increment(service: str, cost: int = 1, user_id: str = "global") -> dict:
    now        = datetime.utcnow()
    today      = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    # Each user+service gets its own document
    doc = await rate_limits_col.find_one({"service": service, "user_id": user_id}) or {}

    daily_count  = doc.get("daily_count",  0) if doc.get("date")       == today      else 0
    weekly_count = doc.get("weekly_count", 0) if doc.get("week_start") == week_start else 0

    limits = LIMITS.get(service, {"daily": 999, "weekly": 9999})

    if daily_count + cost > limits["daily"]:
        return {
            "allowed": False,
            "reason" : f"{service} daily limit reached ({limits['daily']}/day). Resets tomorrow."
        }

    if weekly_count + cost > limits["weekly"]:
        return {
            "allowed": False,
            "reason" : f"{service} weekly limit reached ({limits['weekly']}/week). Resets Monday."
        }

    await rate_limits_col.update_one(
        {"service": service, "user_id": user_id},
        {"$set": {
            "service"      : service,
            "user_id"      : user_id,
            "date"         : today,
            "week_start"   : week_start,
            "daily_count"  : daily_count  + cost,
            "weekly_count" : weekly_count + cost,
            "last_used"    : now,
        }},
        upsert=True
    )

    return {
        "allowed"     : True,
        "daily_used"  : daily_count  + cost,
        "weekly_used" : weekly_count + cost,
    }


async def get_usage(user_id: str = "global") -> dict:
    now        = datetime.utcnow()
    today      = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    usage = {}

    async for doc in rate_limits_col.find({"user_id": user_id}):
        service = doc.get("service")
        limits  = LIMITS.get(service, {"daily": 999, "weekly": 9999})
        usage[service] = {
            "daily_used"  : doc.get("daily_count",  0) if doc.get("date")       == today      else 0,
            "weekly_used" : doc.get("weekly_count", 0) if doc.get("week_start") == week_start else 0,
            "daily_limit" : limits["daily"],
            "weekly_limit": limits["weekly"],
        }

    for service, limits in LIMITS.items():
        if service not in usage:
            usage[service] = {
                "daily_used"  : 0,
                "weekly_used" : 0,
                "daily_limit" : limits["daily"],
                "weekly_limit": limits["weekly"],
            }

    return usage