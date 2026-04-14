from datetime import datetime, timedelta
from config import rate_limits_col

LIMITS = {
    "jsearch": {"daily": 70,  "weekly": 50},
    "groq"   : {"daily": 180, "weekly": 300},
    "twilio" : {"daily": 80, "weekly": 600},
}


async def check_and_increment(service: str, cost: int = 1) -> dict:
    now        = datetime.utcnow()
    today      = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    doc = await rate_limits_col.find_one({"service": service}) or {}

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
        {"service": service},
        {"$set": {
            "service"      : service,
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


async def get_usage() -> dict:
    now        = datetime.utcnow()
    today      = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    usage = {}
    async for doc in rate_limits_col.find():
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