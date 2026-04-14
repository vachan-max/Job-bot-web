from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from firebase_auth import verify_token
from config import users_col, preferences_col
from models.user import UserProfile, JobPreferences
from datetime import datetime
from bson import ObjectId
import shutil
import os

router = APIRouter()


def serialize_doc(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/me")
async def get_my_profile(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)


@router.put("/me")
async def update_my_profile(profile: UserProfile, user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    await users_col.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"phone": profile.phone, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Profile updated successfully"}


@router.get("/me/preferences")
async def get_preferences(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    prefs = await preferences_col.find_one({"user_id": str(user["_id"])})
    if not prefs:
        return {
            "job_title"       : "full-stack developer",
            "location"        : "Bangalore",
            "experience"      : "0-2 years",
            "skills"          : "Python, JavaScript, React, Node.js",
            "min_score"       : 70,
            "schedule_time"   : "09:00",
            "use_ai_filter"   : True,
            "use_cover_letter": True,
            "use_resume_match": True,
            "send_whatsapp"   : True,
        }
    return serialize_doc(prefs)


@router.put("/me/preferences")
async def update_preferences(prefs: JobPreferences, user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    user = await users_col.find_one({"firebase_uid": firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = str(user["_id"])
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
            "updated_at"      : datetime.utcnow(),
        }},
        upsert=True
    )
    return {"message": "Preferences saved successfully"}


@router.post("/me/resume")
async def upload_resume(file: UploadFile = File(...), user_data: dict = Depends(verify_token)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_path    = os.path.join(backend_dir, "resume.pdf")
    txt_path    = os.path.join(backend_dir, "resume.txt")

    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"PDF text extraction failed: {e}")
        text = ""

    firebase_uid = user_data.get("uid")
    await users_col.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"resume_filename": file.filename}}
    )

    return {"message": "Resume uploaded successfully", "filename": file.filename, "text_length": len(text)}


@router.delete("/me/resume")
async def delete_resume(user_data: dict = Depends(verify_token)):
    firebase_uid = user_data.get("uid")
    await users_col.update_one(
        {"firebase_uid": firebase_uid},
        {"$unset": {"resume_filename": ""}}
    )
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for filename in ["resume.pdf", "resume.txt"]:
        path = os.path.join(backend_dir, filename)
        if os.path.exists(path):
            os.remove(path)
    return {"message": "Resume removed successfully"}