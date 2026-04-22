import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_cover_letter(job: dict, preferences: dict, your_name: str, resume_text: str = "") -> dict:
    skills     = preferences.get("skills", "")
    experience = preferences.get("experience", "")
    job_title  = job.get("job_title", "")
    company    = job.get("company", "")
    desc       = job.get("description", "")[:600]

    # Use resume text if available, otherwise fall back to skills from prefs
    resume_section = f"- Resume Summary: {resume_text[:400]}" if resume_text else ""

    prompt = f"""
You are a career coach AI writing on behalf of a job applicant.

STRICT RULES — follow every one:
- Only mention skills from the candidate's skill list below. Do NOT invent any skill.
- Do NOT say "I don't have experience", "I lack", "although I", "as a fresh graduate", "I don't have a specific project". These phrases are BANNED.
- Always write confidently. The candidate HAS projects — pick the most relevant one and mention it by name.
- Keep the letter to exactly 3 sentences on a single line.

Candidate:
- Name       : {your_name}
- Skills     : {skills}
- Experience : {experience}
- Internship : Web Dev Intern at Internsforge (Jun–Sep 2025)
- Projects   : ThinkBoard (MERN notes app), Chat App (Firebase + React),
               Voting App (MERN stack), Drone control (gesture + voice commands)
- Education  : B.E. CSE — Yenepoya Institute of Technology (2026, CGPA 8.1)
{resume_section}

Job:
- Title      : {job_title}
- Company    : {company}
- Description: {desc}

Do TWO things:

1. Calculate resume match % — compare candidate skills vs job requirements honestly.
   - Job needs 5+ years and candidate is fresher → score below 40
   - Skills mostly match → score 60–80
   - Strong match → score 80–95

2. Write a confident 3-sentence cover letter:
   Sentence 1: Excitement for the role + one relevant skill the candidate actually has.
   Sentence 2: Name ONE project from the projects list that is most relevant to this job.
   Sentence 3: Mention the Internsforge internship and eagerness to contribute immediately.
   Never say "I don't have" or "although I lack" — stay positive and confident.

Reply in this EXACT format — nothing else, no extra text:
MATCH: <number only>
LETTER: <3 sentences all on one line>
"""

    try:
        response = client.chat.completions.create(
            model      = "llama-3.3-70b-versatile",
            messages   = [{"role": "user", "content": prompt}],
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
                cover_letter  = line.replace("LETTER:", "").strip()

        if not cover_letter:
            parts = text.split("LETTER:")
            if len(parts) > 1:
                cover_letter = parts[1].strip().replace("\n", " ")

        # Only set match_percent if ai_filter didn't already set it
        if not job.get("match_percent"):
            job["match_percent"] = match_percent
        job["cover_letter"] = cover_letter

        print(f"[cover_letter] {job_title} at {company} → Match: {match_percent}%")

    except Exception as e:
        print(f"[cover_letter] Error: {e}")
        job["match_percent"] = job.get("match_percent", 0)
        job["cover_letter"]  = "Could not generate cover letter."

    return job