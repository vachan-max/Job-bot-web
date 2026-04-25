import os
import random
import requests
from dotenv import load_dotenv

load_dotenv()

# 🔑 Load all API keys dynamically (RAPIDAPI_KEY_1, RAPIDAPI_KEY_2, ...)
RAPIDAPI_KEYS = [
    os.getenv(k) for k in os.environ if k.startswith("RAPIDAPI_KEY_")
]

# Remove None values
RAPIDAPI_KEYS = [key for key in RAPIDAPI_KEYS if key]


def fetch_jobs(job_title: str, location: str, num_results: int = 10, page: int = None) -> list:
    url = "https://jsearch.p.rapidapi.com/search"

    selected_page = page if page is not None else random.randint(1, 3)

    print(f"[job_fetcher] Fetching page {selected_page} for '{job_title}' in '{location}'")

    # 🔁 Loop through API keys
    for api_key in RAPIDAPI_KEYS:

        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }

        print(f"[job_fetcher] Using key: {api_key[:5]}****")

        # 📅 Date filters (same as your logic)
        for date_filter in ["3days", "week", "month"]:

            querystring = {
                "query": f"{job_title} in {location}",
                "page": str(selected_page),
                "num_pages": "1",
                "date_posted": date_filter
            }

            try:
                response = requests.get(url, headers=headers, params=querystring)

                # 🚫 If rate limit → try next key
                if response.status_code in [429, 403]:
                    print(f"[job_fetcher] Key hit limit ({response.status_code}) → switching key")
                    break  # move to next API key

                if response.status_code != 200:
                    print(f"[job_fetcher] API status {response.status_code} → trying next key")
                    break

                data = response.json()

                if data.get("status") != "OK":
                    print(f"[job_fetcher] API error: {data.get('message', 'Unknown error')}")
                    return []

                jobs = data.get("data", [])
                print(f"[job_fetcher] Got {len(jobs)} jobs (filter: {date_filter})")

                if not jobs:
                    continue

                result = []
                for job in jobs[:num_results]:
                    apply_link = job.get("job_apply_link", "")
                    if not apply_link:
                        continue

                    result.append({
                        "job_title": job.get("job_title", ""),
                        "company": job.get("employer_name", ""),
                        "location": job.get("job_city", location),
                        "description": job.get("job_description", ""),
                        "apply_link": apply_link,
                    })

                if result:
                    print(f"[job_fetcher] Returning {len(result)} jobs")
                    return result

            except Exception as e:
                print(f"[job_fetcher] Error: {e}")
                return []

    print("[job_fetcher] All API keys exhausted or no jobs found")
    return []