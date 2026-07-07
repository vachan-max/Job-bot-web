

from fastapi import APIRouter


router = APIRouter()

@router.post("/txn")
async def read_users():
        return [{"username": "Rick"}, {"username": "Morty"}]