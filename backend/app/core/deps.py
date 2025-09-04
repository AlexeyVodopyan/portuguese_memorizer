from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .security import parse_token

_security = HTTPBearer(auto_error=False)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_security)) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="Authorization required")
    return parse_token(creds.credentials)

