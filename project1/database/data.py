from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from .db_connection import get_db_connection
import bcrypt

router = APIRouter()

def query(sql, params=()):
    db = get_db_connection()
    cur = db.cursor()
    cur.execute(sql, params)
    result = cur.fetchall()
    cur.close()
    db.close()
    return result


@router.get("/all-users")
async def get_all_users():
    rows = query("SELECT id, username FROM users")
    users = [{"user_id": r[0], "username": r[1]} for r in rows]
    return {"users": users}


@router.get("/public-key/{user_id}")
async def get_public_key(user_id: int):
    rows = query("SELECT public_key FROM users WHERE id = %s", (user_id,))
    
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user_id": user_id, "public_key": rows[0][0]}


# ✅ Request body এর জন্য Pydantic model — dict এর চেয়ে safe
class PrivateKeyRequest(BaseModel):
    user_id: int
    password: str


@router.post("/private-key")
async def get_private_key(data: PrivateKeyRequest):
    rows = query("SELECT private_key, password FROM users WHERE id = %s", (data.user_id,))
    
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")

    private_key, stored_pw = rows[0]

    # bcrypt checkpw এর জন্য bytes দরকার
    if isinstance(stored_pw, str):
        stored_pw = stored_pw.encode()

    if not bcrypt.checkpw(data.password.encode(), stored_pw):
        raise HTTPException(status_code=401, detail="Wrong password")

    return {"user_id": data.user_id, "private_key": private_key}