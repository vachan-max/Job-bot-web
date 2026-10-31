from datetime import datetime, timedelta

from config import rate_limits_col

LIMITS = {
    "jsearch": {"daily": 30, "weekly": 100},
    "groq": {"daily": 40, "weekly": 100},
    "email": {"daily": 50, "weekly": 100},
    "serpapi": {"daily": 1000, "weekly": 50000},
    "firecrawl": {"daily": 5000, "weekly": 25000},
}

# The SerpAPI key is shared by the whole deployment. Keep a shared safety cap,
# but leave enough headroom that one busy day across users does not disable the
# primary provider for everyone. Each individual user still has the 10/day cap.
GLOBAL_LIMITS = {
    "serpapi": {"daily": 100, "weekly": 500},
}


async def check_and_increment(service: str, cost: int = 1, user_id: str = "global") -> dict:
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    doc = await rate_limits_col.find_one({"service": service, "user_id": user_id}) or {}

    daily_count = doc.get("daily_count", 0) if doc.get("date") == today else 0
    weekly_count = doc.get("weekly_count", 0) if doc.get("week_start") == week_start else 0
    limits = (GLOBAL_LIMITS if user_id == "global" else {}).get(
        service, LIMITS.get(service, {"daily": 999, "weekly": 9999})
    )

    if daily_count + cost > limits["daily"]:
        return {"allowed": False, "reason": f"{service} daily limit reached ({limits['daily']}/day). Resets tomorrow."}
    if weekly_count + cost > limits["weekly"]:
        return {"allowed": False, "reason": f"{service} weekly limit reached ({limits['weekly']}/week). Resets Monday."}

    await rate_limits_col.update_one(
        {"service": service, "user_id": user_id},
        {"$set": {
            "service": service,
            "user_id": user_id,
            "date": today,
            "week_start": week_start,
            "daily_count": daily_count + cost,
            "weekly_count": weekly_count + cost,
            "last_used": now,
        }},
        upsert=True,
    )
    return {"allowed": True, "daily_used": daily_count + cost, "weekly_used": weekly_count + cost}


async def get_usage(user_id: str = "global") -> dict:
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    usage = {}
    async for doc in rate_limits_col.find({"user_id": user_id}):
        service = doc.get("service")
        limits = (GLOBAL_LIMITS if user_id == "global" else {}).get(
            service, LIMITS.get(service, {"daily": 999, "weekly": 9999})
        )
        usage[service] = {
            "daily_used": doc.get("daily_count", 0) if doc.get("date") == today else 0,
            "weekly_used": doc.get("weekly_count", 0) if doc.get("week_start") == week_start else 0,
            "daily_limit": limits["daily"],
            "weekly_limit": limits["weekly"],
        }
    for service, limits in LIMITS.items():
        if user_id == "global":
            limits = GLOBAL_LIMITS.get(service, limits)
        usage.setdefault(service, {
            "daily_used": 0,
            "weekly_used": 0,
            "daily_limit": limits["daily"],
            "weekly_limit": limits["weekly"],
        })
    return usage
