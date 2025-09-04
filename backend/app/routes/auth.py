from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import json
from typing import Dict

from ..schemas import RegisterRequest, LoginRequest, TokenResponse
from ..core.config import USERS_FILE
from ..core.security import hash_password, verify_password, create_token
from ..core.deps import get_current_user

router = APIRouter()

# ---- user store helpers ----

def _load_users() -> Dict:
    if not USERS_FILE.exists():
        return {"users": {}}
    try:
        with USERS_FILE.open('r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {"users": {}}

def _save_users(data: Dict) -> None:
    tmp = USERS_FILE.with_suffix('.tmp')
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(USERS_FILE)

@router.post('/register', response_model=TokenResponse)
def register(payload: RegisterRequest):
    users = _load_users()
    if payload.username in users['users']:
        raise HTTPException(status_code=400, detail='Username taken')
    users['users'][payload.username] = {
        'password_hash': hash_password(payload.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    _save_users(users)
    token, exp = create_token(payload.username)
    return TokenResponse(token=token, expires_at=exp)

@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest):
    users = _load_users()
    user = users['users'].get(payload.username)
    if not user or not verify_password(payload.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token, exp = create_token(payload.username)
    return TokenResponse(token=token, expires_at=exp)

@router.get('/me')
def me(username: str = Depends(get_current_user)):
    return {"username": username}
