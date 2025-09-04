from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random
import json
from pathlib import Path
from datetime import datetime, timezone
import threading

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
WORDS_FILE = DATA_DIR / "words.json"
PROGRESS_FILE = DATA_DIR / "progress.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)

# Thread lock for progress file writes
_progress_lock = threading.Lock()

class Question(BaseModel):
    card_id: int
    mode: str
    prompt: str
    options: Optional[List[str]] = None  # present for choice modes

class AnswerRequest(BaseModel):
    card_id: int
    mode: str  # pt2ru_choice | ru2pt_choice | pt2ru_input
    answer: str

class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: str

class ProgressSummary(BaseModel):
    total: int
    studied: int
    learned: int
    by_card: Dict[int, Dict[str, int]]

# --- Data access helpers ---

def _load_words() -> List[Dict]:
    if not WORDS_FILE.exists():
        raise RuntimeError("Words file is missing.")
    with WORDS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _load_progress() -> Dict:
    if not PROGRESS_FILE.exists():
        return {"cards": {}}
    with PROGRESS_FILE.open("r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {"cards": {}}


def _save_progress(progress: Dict) -> None:
    tmp_path = PROGRESS_FILE.with_suffix(".tmp")
    with _progress_lock:
        with tmp_path.open("w", encoding="utf-8") as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
        tmp_path.replace(PROGRESS_FILE)


# --- App setup ---
app = FastAPI(title="Portuguese Memorizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Utility ---

def _normalize_text(s: str) -> str:
    return " ".join(s.strip().lower().split())


def _get_card_by_id(words: List[Dict], card_id: int) -> Dict:
    for w in words:
        if int(w["id"]) == int(card_id):
            return w
    raise KeyError(f"Card id {card_id} not found")


def _is_learned(card_stats: Dict) -> bool:
    # Define learned as at least 3 correct answers total and streak >= 2
    return card_stats.get("correct", 0) >= 3 and card_stats.get("streak", 0) >= 2


def _update_progress_on_answer(progress: Dict, card_id: int, correct: bool) -> None:
    card_key = str(card_id)
    cards = progress.setdefault("cards", {})
    stats = cards.setdefault(card_key, {"seen": 0, "correct": 0, "incorrect": 0, "streak": 0})
    stats["seen"] += 1
    if correct:
        stats["correct"] += 1
        stats["streak"] = stats.get("streak", 0) + 1
    else:
        stats["incorrect"] += 1
        stats["streak"] = 0
    stats["last_seen"] = datetime.now(timezone.utc).isoformat()


def _progress_summary(words: List[Dict], progress: Dict) -> ProgressSummary:
    cards_stats = progress.get("cards", {})
    studied = sum(1 for w in words if str(w["id"]) in cards_stats)
    learned = 0
    by_card: Dict[int, Dict[str, int]] = {}
    for w in words:
        stats = cards_stats.get(str(w["id"]), {"seen": 0, "correct": 0, "incorrect": 0, "streak": 0})
        if _is_learned(stats):
            learned += 1
        by_card[w["id"]] = {
            "seen": stats.get("seen", 0),
            "correct": stats.get("correct", 0),
            "incorrect": stats.get("incorrect", 0),
            "streak": stats.get("streak", 0),
        }
    return ProgressSummary(total=len(words), studied=studied, learned=learned, by_card=by_card)


def _sample_question(words: List[Dict], mode: str, options_count: int = 4) -> Question:
    # Prefer not-yet-learned cards
    progress = _load_progress()
    not_learned = []
    for w in words:
        stats = progress.get("cards", {}).get(str(w["id"]), {"seen": 0, "correct": 0, "incorrect": 0, "streak": 0})
        if not _is_learned(stats):
            not_learned.append(w)
    pool = not_learned if not_learned else words
    card = random.choice(pool)

    if mode == "pt2ru_choice":
        prompt = card["pt"]
        correct_value = card["ru"]
        # build distractors from other RU values
        others = [w["ru"] for w in words if w["id"] != card["id"]]
        distractors = random.sample(others, k=min(options_count - 1, len(others)))
        options = distractors + [correct_value]
        random.shuffle(options)
        return Question(card_id=card["id"], mode=mode, prompt=prompt, options=options)
    elif mode == "ru2pt_choice":
        prompt = card["ru"]
        correct_value = card["pt"]
        others = [w["pt"] for w in words if w["id"] != card["id"]]
        distractors = random.sample(others, k=min(options_count - 1, len(others)))
        options = distractors + [correct_value]
        random.shuffle(options)
        return Question(card_id=card["id"], mode=mode, prompt=prompt, options=options)
    elif mode == "pt2ru_input":
        prompt = card["pt"]
        return Question(card_id=card["id"], mode=mode, prompt=prompt)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode")


# --- Routes ---
@app.get("/api/question", response_model=Question)
def get_question(mode: str, options: int = 4):
    words = _load_words()
    return _sample_question(words, mode=mode, options_count=max(2, min(6, options)))


@app.post("/api/answer", response_model=AnswerResponse)
def submit_answer(payload: AnswerRequest):
    words = _load_words()
    try:
        card = _get_card_by_id(words, payload.card_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Card not found")

    correct_answer = None
    user_answer_norm = _normalize_text(payload.answer)

    if payload.mode == "pt2ru_choice" or payload.mode == "pt2ru_input":
        correct_answer = card["ru"]
    elif payload.mode == "ru2pt_choice":
        correct_answer = card["pt"]
    else:
        raise HTTPException(status_code=400, detail="Invalid mode")

    is_correct = _normalize_text(correct_answer) == user_answer_norm

    progress = _load_progress()
    _update_progress_on_answer(progress, payload.card_id, is_correct)
    _save_progress(progress)

    return AnswerResponse(correct=is_correct, correct_answer=correct_answer)


@app.get("/api/progress", response_model=ProgressSummary)
def get_progress():
    words = _load_words()
    progress = _load_progress()
    return _progress_summary(words, progress)


@app.post("/api/reset")
def reset_progress():
    _save_progress({"cards": {}})
    return {"status": "ok"}


@app.get("/api/words")
def list_words():
    return _load_words()

