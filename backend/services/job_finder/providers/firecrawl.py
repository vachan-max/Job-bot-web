import os
from urllib.parse import urlparse

import requests


def enrich_description(job: dict) -> str:
    """Fetch readable page text for an already-discovered job URL; never invent details."""
    api_key = os.getenv("FIRECRAWL_API_KEY")
    url = job.get("apply_link", "")
    parsed = urlparse(url)
    if not api_key or parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    try:
        response = requests.post(
            "https://api.firecrawl.dev/v2/scrape",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
            timeout=25,
        )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or {}
        return str(data.get("markdown") or "")[:12000]
    except (requests.RequestException, ValueError) as exc:
        print(f"[job_finder/firecrawl] Enrichment failed: {exc}")
        return ""
