from fastapi import APIRouter, Depends, HTTPException
from firebase_auth import verify_token
from config import users_col, preferences_col
from models.user import UserProfile, JobPreferences
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import shutil, os

router = APIRouter()


def serialize_doc(doc: dict) -> dict:
    """MongoDB returns ObjectId — convert to string for JSON response"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── GET /users/me ────────────────────────────────────────────────────────────
@router.get("/me")
async def get_my_profile(user_data: dict = Depends(verify_token)):
    """Returns the logged-in user's profile from MongoDB"""
    firebase_uid = user_data.get("uid")

    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return serialize_doc(user)


# ── PUT /users/me ────────────────────────────────────────────────────────────
@router.put("/me")
async def update_my_profile(
    profile: UserProfile,
    user_data: dict = Depends(verify_token)
):
    """Updates WhatsApp phone number for the logged-in user"""
    firebase_uid = user_data.get("uid")

    await users_col.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {
            "phone"     : profile.phone,
            "updated_at": datetime.utcnow()
        }}
    )

    return {"message": "Profile updated successfully"}


# ── GET /users/me/preferences ────────────────────────────────────────────────
@router.get("/me/preferences")
async def get_preferences(user_data: dict = Depends(verify_token)):
    """Returns job search preferences for the logged-in user"""
    firebase_uid = user_data.get("uid")

    # First get the user to find their _id
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prefs = await preferences_col.find_one({"user_id": str(user["_id"])})

    if not prefs:
        # Return default preferences if none saved yet
        return {
            "job_title"    : "full-stack developer",
            "location"     : "Bangalore",
            "experience"   : "0-2 years",
            "skills"       : "Python, JavaScript, React, Node.js",
            "min_score"    : 70,
            "schedule_time": "09:00"
        }

    return serialize_doc(prefs)


# ── PUT /users/me/preferences ────────────────────────────────────────────────
@router.put("/me/preferences")
async def update_preferences(
    prefs: JobPreferences,
    user_data: dict = Depends(verify_token)
):
    """Saves or updates job search preferences for the logged-in user"""
    firebase_uid = user_data.get("uid")

    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user["_id"])

    # upsert=True means: update if exists, insert if not
    await preferences_col.update_one(
    {"user_id": user_id},
    {"$set": {
        "user_id"         : user_id,
        "job_title"       : prefs.job_title,
        "location"        : prefs.location,
        "experience"      : prefs.experience,
        "skills"          : prefs.skills,
        "min_score"       : prefs.min_score,
        "schedule_time"   : prefs.schedule_time,
        "use_ai_filter"   : prefs.use_ai_filter,
        "use_cover_letter": prefs.use_cover_letter,
        "use_resume_match": prefs.use_resume_match,
        "send_whatsapp"   : prefs.send_whatsapp,
        "updated_at"      : datetime.utcnow()
    }},
    upsert=True
)

    return {"message": "Preferences saved successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# ADD THIS to your existing backend/routes/users.py
# Add the imports at the top, then paste the route below your existing routes
# ─────────────────────────────────────────────────────────────────────────────

# NEW IMPORTS to add at the top of users.py (if not already there):
# from fastapi import APIRouter, Depends, UploadFile, File
# import shutil, os

@router.post("/me/resume")
async def upload_resume(
    file: UploadFile = File(...),
    user_data: dict = Depends(verify_token),
):
    # 1. validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # 2. save PDF to backend root folder (where main.py lives)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_path    = os.path.join(backend_dir, "resume.pdf")
    txt_path    = os.path.join(backend_dir, "resume.txt")

    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 3. extract text from PDF → resume.txt
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"PDF text extraction failed: {e}")
        text = ""

    # 4. save filename to MongoDB using existing users_col
    firebase_uid = user_data.get("uid")
    await users_col.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"resume_filename": file.filename}}
    )

    return {
        "message"    : "Resume uploaded successfully",
        "filename"   : file.filename,
        "text_length": len(text),
    }