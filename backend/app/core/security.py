import hmac, hashlib, base64, os, time, json
from fastapi import HTTPException
from .config import APP_SECRET, TOKEN_TTL_SECONDS, PBKDF_ITER

# Password hashing (PBKDF2-SHA256)

def hash_password(password: str, salt: str | None = None) -> str:
    if salt is None:
        salt = base64.urlsafe_b64encode(os.urandom(16)).decode()
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), PBKDF_ITER)
    return f"pbkdf2_sha256${PBKDF_ITER}${salt}${base64.urlsafe_b64encode(dk).decode()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_s, salt, hash_b64 = stored.split('$')
        iter_n = int(iter_s)
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iter_n)
    return hmac.compare_digest(base64.urlsafe_b64encode(dk).decode(), hash_b64)

# Minimal JWT-like token (header.payload.signature)

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')

def _b64json(obj: dict) -> str:
    return _b64(json.dumps(obj, separators=(',', ':')).encode())

def _sign(data: bytes) -> str:
    sig = hmac.new(APP_SECRET.encode(), data, hashlib.sha256).digest()
    return _b64(sig)

def create_token(username: str) -> tuple[str, int]:
    header = {"alg": "HS256", "typ": "JWT"}
    exp = int(time.time()) + TOKEN_TTL_SECONDS
    payload = {"sub": username, "exp": exp}
    signing_input = f"{_b64json(header)}.{_b64json(payload)}".encode()
    sig = _sign(signing_input)
    return signing_input.decode() + '.' + sig, exp

def parse_token(token: str) -> str:
    try:
        header_b64, payload_b64, sig = token.split('.')
    except ValueError:
        raise HTTPException(status_code=401, detail='Invalid token format')
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected = _sign(signing_input)
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail='Bad signature')
    def _pad(s: str) -> str: return s + '=' * (-len(s) % 4)
    try:
        payload_raw = base64.urlsafe_b64decode(_pad(payload_b64))
        payload = json.loads(payload_raw)
    except Exception:
        raise HTTPException(status_code=401, detail='Malformed payload')
    if payload.get('exp', 0) < int(time.time()):
        raise HTTPException(status_code=401, detail='Token expired')
    return payload.get('sub')

