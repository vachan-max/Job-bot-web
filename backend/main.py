from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import db
from routes.auth  import router as auth_router
from routes.users import router as users_router
from routes.jobs  import router as jobs_router
from routes.job_finder import router as job_finder_router, ensure_job_finder_indexes
from scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[main] Starting Job Bot API...")
    try:
        await ensure_job_finder_indexes()
    except Exception as exc:
        print(f"[main] Could not create job finder indexes: {exc}")
    start_scheduler()
    yield
    print("[main] Shutting down...")


app = FastAPI(title="Job Bot API", version="1.0.0", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://job-bot-web.vercel.app",
    "https://job-bot-web-ekwq.onrender.com",
    "https://job-bot-web-1.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
    expose_headers=["*"],
)





app.include_router(auth_router,  prefix="/auth",  tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(jobs_router,  prefix="/jobs",  tags=["Jobs"])
app.include_router(job_finder_router, prefix="/jobs/finder", tags=["Job Finder"])


@app.get("/health")
async def health():
    try:
        await db.command("ping")
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"error: {str(e)}"
    return {"status": "ok", "mongodb": mongo_status}


@app.get("/")
async def root():
    return {"message": "Job Bot API is running"}
