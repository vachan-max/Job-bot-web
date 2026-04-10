from pydantic import BaseModel
from typing import Optional


class JobAlert(BaseModel):
    job_title     : str
    company       : str
    location      : str
    ai_score      : int
    match_percent : int
    cover_letter  : str
    apply_link    : str