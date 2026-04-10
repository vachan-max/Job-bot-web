import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_cover_letter(job: dict, preferences: dict, your_name: str) -> dict:
    """
    Generates cover letter + resume match % for one job.
    Returns job with cover_letter and match_percent added.
    """
    prompt = f"""
You are a career coach AI.

Candidate:
- Name      : {your_name}
- Skills    : {preferences.get('skills')}
- Experience: {preferences.get('experience')}

Job:
- Title     : {job.get('job_title')}
- Company   : {job.get('company')}
- Description: {job.get('description', '')[:500]}

Do TWO things:
1. Write a short 3-sentence cover letter for this job
2. Give a resume match percentage (0-100)

Reply in this exact format:
MATCH: <number>
LETTER: <cover letter text>
"""
    try:
        response = client.chat.completions.create(
            model   ="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )
        text  = response.choices[0].message.content.strip()
        lines = text.split("\n")

        match_percent = 0
        cover_letter  = ""

        for line in lines:
            if line.startswith("MATCH:"):
                digits        = "".join(filter(str.isdigit, line))
                match_percent = int(digits) if digits else 0
            elif line.startswith("LETTER:"):
                cover_letter = line.replace("LETTER:", "").strip()

        job["match_percent"] = match_percent
        job["cover_letter"]  = cover_letter

    except Exception as e:
        print(f"[cover_letter] Error: {e}")
        job["match_percent"] = 0
        job["cover_letter"]  = "Could not generate cover letter."

    return job