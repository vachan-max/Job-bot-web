import os
import random
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

def fetch_jobs(job_title: str, location: str, num_results: int = 10, page: int = None) -> list:
    """
    Fetches jobs from JSearch API.
    Parameters come from user preferences (not .env)
    
    page: optional — if None, picks a random page (1-5) for variety
    """
    url = "https://jsearch.p.rapidapi.com/search"

    # If no page specified, rotate randomly so each run gets fresh results
    selected_page = page if page is not None else random.randint(1, 1)

    querystring = {
        "query"      : f"{job_title} in {location}",
        "page"       : str(selected_page),
        "num_pages"  : "1",
        "date_posted": "3days"
    }

    headers = {
        "X-RapidAPI-Key" : RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    print(f"[job_fetcher] Fetching page {selected_page} for '{job_title}' in '{location}'")

    try:
        response = requests.get(url, headers=headers, params=querystring)

        # Catch non-200 responses (rate limit, bad key, etc.)
        if response.status_code != 200:
            print(f"[job_fetcher] API returned status {response.status_code}: {response.text}")
            return []

        data = response.json()

        # Check if API returned an error message inside the JSON
        if data.get("status") != "OK":
            print(f"[job_fetcher] API error: {data.get('message', 'Unknown error')}")
            return []

        jobs = data.get("data", [])
        print(f"[job_fetcher] Got {len(jobs)} raw jobs from API")

        result = []
        for job in jobs[:num_results]:
            apply_link = job.get("job_apply_link", "")

            # Skip jobs with no apply link — useless to send
            if not apply_link:
                continue

            result.append({
                "job_title"  : job.get("job_title", ""),
                "company"    : job.get("employer_name", ""),
                "location"   : job.get("job_city", location),
                "description": job.get("job_description", ""),
                "apply_link" : apply_link,
            })

        print(f"[job_fetcher] Returning {len(result)} jobs (filtered no-link jobs)")
        return result

    except Exception as e:
        print(f"[job_fetcher] Error: {e}")
        return []