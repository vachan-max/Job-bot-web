import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header
from dotenv import load_dotenv


# Load environment variables from .env file
# This allows us to read FIREBASE_CREDENTIALS
load_dotenv()


# Get path of Firebase service account key from .env
# If not found, default to "serviceAccountKey.json"
cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")


# Initialize Firebase app ONLY once (important!)
# firebase_admin._apps checks if Firebase is already initialized
# Without this check, FastAPI reload would crash with "already initialized"
if not firebase_admin._apps:
    # Load credentials from service account JSON file
    cred = credentials.Certificate(cred_path)

    # Initialize Firebase Admin SDK
    firebase_admin.initialize_app(cred)


# This function verifies Firebase ID token
# It will be used in protected routes using Depends()
async def verify_token(authorization: str = Header(...)) -> dict:
     
    """
    This function runs before protected routes.

    React sends:
    Authorization: Bearer <firebase_id_token>

    We:
    1. Extract the token
    2. Verify it with Firebase
    3. Return decoded user info
    """

    # Check if Authorization header starts with "Bearer "
    # Example expected format:
    # Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid auth header format"
        )

    # Extract token from header
    # Split "Bearer <token>" → get only <token>
    token = authorization.split("Bearer ")[1]

    try:
        # Verify token using Firebase
        # Firebase checks:
        # - token is real
        # - not expired
        # - belongs to your project
        decoded = auth.verify_id_token(token)

        # decoded contains user info like:
        # {
        #   "uid": "...",
        #   "email": "...",
        #   "name": "...",
        #   "picture": "...",
        # }
        return decoded

    except Exception as e:
        # If token is invalid, expired, or tampered
        # return 401 Unauthorized
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )