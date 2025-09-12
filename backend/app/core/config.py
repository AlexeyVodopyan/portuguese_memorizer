from pathlib import Path
import os

# core/config.py -> core -> app -> backend ; we need backend directory
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

WORDS_FILE = DATA_DIR / "words.json"
USERS_FILE = DATA_DIR / "users.json"
PROGRESS_DIR = DATA_DIR / "progress"
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
VERBS_FILE = DATA_DIR / "verbs.json"  # new verbs dataset

APP_SECRET = os.getenv("APP_SECRET", "dev-insecure-secret")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days
PBKDF_ITER = 48_000
