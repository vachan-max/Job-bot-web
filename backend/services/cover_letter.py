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

    skills     = preferences.get("skills", "")
    experience = preferences.get("experience", "")
    job_title  = job.get("job_title", "")
    company    = job.get("company", "")
    desc       = job.get("description", "")[:600]

    prompt = f"""
You are a career coach AI writing on behalf of a job applicant.

STRICT RULE: Only mention skills from the candidate's actual skill list below.
Do NOT invent, assume, or add any skill that is not explicitly listed.
Do NOT mention TensorFlow, PyTorch, AWS, Docker, or any tool unless it appears in the skill list.

Candidate:
- Name      : {your_name}
- Skills    : {skills}
- Experience: {experience}

Job:
- Title     : {job_title}
- Company   : {company}
- Description: {desc}

Do TWO things:

1. Calculate resume match % — compare candidate skills vs job requirements honestly.
   If the job needs 5+ years experience and candidate is a fresher, score below 40.
   If skills mostly match, score 60-80. Perfect match = 80-95.

2. Write a 3-sentence cover letter using ONLY the candidate's actual skills listed above.
   Sentence 1: enthusiasm for the role + one relevant skill they actually have.
   Sentence 2: one specific project or experience from their background.
   Sentence 3: availability and eagerness to contribute.

Reply in this EXACT format and nothing else:
MATCH: <number only, no % sign>
LETTER: <all 3 sentences on a single line>
"""

    try:
        response = client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [{"role": "user", "content": prompt}],
            max_tokens = 400
        )

        text = response.choices[0].message.content.strip()

        match_percent = 0
        cover_letter  = ""

        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("MATCH:"):
                digits        = "".join(filter(str.isdigit, line.replace("MATCH:", "")))
                match_percent = int(digits) if digits else 0
            elif line.startswith("LETTER:"):
                cover_letter = line.replace("LETTER:", "").strip()

        # Fallback — if LETTER: line was empty, take everything after MATCH line
        if not cover_letter:
            parts = text.split("LETTER:")
            if len(parts) > 1:
                cover_letter = parts[1].strip().replace("\n", " ")

        job["match_percent"] = match_percent
        job["cover_letter"]  = cover_letter

        print(f"[cover_letter] {job_title} at {company} → Match: {match_percent}%")

    except Exception as e:
        print(f"[cover_letter] Error: {e}")
        job["match_percent"] = 0
        job["cover_letter"]  = "Could not generate cover letter."

    return job