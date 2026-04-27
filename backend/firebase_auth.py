import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    cred_b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
    if cred_b64:
        cred_dict = json.loads(base64.b64decode(cred_b64).decode())
        cred = credentials.Certificate(cred_dict)
    else:
        cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)


async def verify_token(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header format")
    token = authorization.split("Bearer ")[1]
    try:
        decoded = auth.verify_id_token(token, check_revoked=False)
        return decoded
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")