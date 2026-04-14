from pydantic import BaseModel
from typing import Optional

class UserProfile(BaseModel):
    phone           : Optional[str] = ""
    resume_filename : Optional[str] = None

class JobPreferences(BaseModel):
    job_title        : str  = "full-stack developer"
    location         : str  = "Bangalore"
    experience       : str  = "0-2 years"
    skills           : str  = "Python, JavaScript, React, Node.js"
    min_score        : int  = 70
    schedule_time    : str  = "09:00"
    use_ai_filter    : bool = True
    use_cover_letter : bool = True
    use_resume_match : bool = True
    send_whatsapp    : bool = True