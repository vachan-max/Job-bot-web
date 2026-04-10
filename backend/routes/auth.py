from fastapi import APIRouter, Depends
from firebase_auth import verify_token
from config import users_col
from datetime import datetime

# Create router instance for auth routes
router = APIRouter()


# This endpoint handles Google login
# URL will be: POST /auth/google
@router.post("/google")
async def google_login(user_data: dict = Depends(verify_token)):
    """
    This route is called AFTER user logs in with Google on React.

    Flow:
    React → Firebase login → gets token
          → sends token to this endpoint
          → verify_token validates token
          → decoded user data passed as 'user_data'
    """

    # Extract user details from Firebase decoded token
    firebase_uid = user_data.get("uid")        # Unique Firebase user ID
    email        = user_data.get("email")      # User email
    name         = user_data.get("name", "")   # User name (default empty)
    photo_url    = user_data.get("picture", "")# Profile picture URL

    # Check if user already exists in MongoDB
    # We search using firebase_uid (unique for each user)
    existing_user = await users_col.find_one({
        "firebase_uid": firebase_uid
    })

    # If user already exists → login successful
    if existing_user:
        # Return existing user information
        return {
            "message"  : "Login successful",
            "user_id"  : str(existing_user["_id"]),  # MongoDB ObjectId → string
            "name"     : existing_user["name"],
            "email"    : existing_user["email"],
            "photo_url": existing_user["photo_url"],
            "is_new"   : False  # Frontend knows this is NOT first login
        }

    # If user does NOT exist → create new user
    # This happens only on first Google login
    new_user = {
        "firebase_uid": firebase_uid,  # store Firebase UID
        "name"        : name,
        "email"       : email,
        "photo_url"   : photo_url,
        "phone"       : "",            # user will fill later
        "active"      : True,          # account status
        "created_at"  : datetime.utcnow()  # account creation time
    }

    # Insert new user into MongoDB
    result = await users_col.insert_one(new_user)

    # Return newly created user data
    return {
        "message"  : "Account created",
        "user_id"  : str(result.inserted_id),  # newly created Mongo ID
        "name"     : name,
        "email"    : email,
        "photo_url": photo_url,
        "is_new"   : True  # Frontend will redirect to setup/profile page
    }