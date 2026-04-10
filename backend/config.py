import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "jobbot")

client = AsyncIOMotorClient(MONGO_URI)
db     = client[DB_NAME]

# Collections
users_col       = db["users"]
preferences_col = db["preferences"]
job_alerts_col  = db["job_alerts"]
job_links_col   = db["job_links"]   