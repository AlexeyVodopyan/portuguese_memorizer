from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from datetime import datetime, timezone
from pathlib import Path
import random, json, threading

from app.schemas import (
    Question,
    AnswerRequest,
    AnswerResponse,
    ProgressSummary,
    VerbQuestion,
    VerbAnswerRequest,
    VerbAnswerResponse,
    PRONOUN_ORDER,
    VerbProgressSummary,
)
from app.core.config import WORDS_FILE, PROGRESS_DIR, VERBS_FILE
from app.core.deps import get_current_user

router = APIRouter()

_progress_lock = threading.Lock()

# -------- Data helpers ---------

def _load_words() -> List[Dict]:
    if not WORDS_FILE.exists():
        raise HTTPException(status_code=500, detail="Words file missing")
    try:
        with WORDS_FILE.open('r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Words file corrupt")

def _load_verbs() -> List[Dict]:
    if not VERBS_FILE.exists():
        raise HTTPException(status_code=500, detail="Verbs file missing")
    try:
        with VERBS_FILE.open('r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Verbs file corrupt")

def _progress_path(username: str) -> Path:
    safe = ''.join(c for c in username if c.isalnum() or c in ('_', '-', '.')) or 'anon'
    return PROGRESS_DIR / f"{safe}.json"


def _load_progress(username: str) -> Dict:
    p = _progress_path(username)
    if not p.exists():
        return {"cards": {}}
    try:
        with p.open('r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {"cards": {}}

def _save_progress(username: str, progress: Dict) -> None:
    p = _progress_path(username)
    tmp = p.with_suffix('.tmp')
    with _progress_lock:
        with tmp.open('w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
        tmp.replace(p)

# -------- Logic helpers ---------

def _is_learned(card_stats: Dict) -> bool:
    return card_stats.get('correct', 0) >= 3 and card_stats.get('streak', 0) >= 2


def _update_progress_on_answer(progress: Dict, card_id: int, correct: bool) -> None:
    card_key = str(card_id)
    stats = progress.setdefault('cards', {}).setdefault(card_key, {"seen": 0, "correct": 0, "incorrect": 0, "streak": 0})
    stats['seen'] += 1
    if correct:
        stats['correct'] += 1
        stats['streak'] = stats.get('streak', 0) + 1
    else:
        stats['incorrect'] += 1
        stats['streak'] = 0
    stats['last_seen'] = datetime.now(timezone.utc).isoformat()


def _progress_summary(words: List[Dict], progress: Dict) -> ProgressSummary:
    cards_stats = progress.get('cards', {})
    studied = sum(1 for w in words if str(w['id']) in cards_stats)
    learned = 0
    by_card: Dict[int, Dict[str, int]] = {}
    for w in words:
        stats = cards_stats.get(str(w['id']), {"seen": 0, "correct": 0, "incorrect": 0, "streak": 0})
        if _is_learned(stats):
            learned += 1
        by_card[w['id']] = {
            'seen': stats.get('seen', 0),
            'correct': stats.get('correct', 0),
            'incorrect': stats.get('incorrect', 0),
            'streak': stats.get('streak', 0),
        }
    return ProgressSummary(total=len(words), studied=studied, learned=learned, by_card=by_card)


def _normalize_text(s: str) -> str:
    return ' '.join(s.strip().lower().split())


def _get_card_by_id(words: List[Dict], card_id: int) -> Dict:
    for w in words:
        if int(w['id']) == int(card_id):
            return w
    raise KeyError


def _sample_question(words: List[Dict], mode: str, progress: Dict, options_count: int = 4) -> Question:
    not_learned = [w for w in words if not _is_learned(progress.get('cards', {}).get(str(w['id']), {}))]
    pool = not_learned if not_learned else words
    card = random.choice(pool)
    if mode == 'pt2ru_choice':
        prompt = card['pt']
        correct_value = card['ru']
        others = [w['ru'] for w in words if w['id'] != card['id']]
    elif mode == 'ru2pt_choice':
        prompt = card['ru']
        correct_value = card['pt']
        others = [w['pt'] for w in words if w['id'] != card['id']]
    elif mode == 'pt2ru_input':
        return Question(card_id=card['id'], mode=mode, prompt=card['pt'])
    elif mode == 'ru2pt_input':  # NEW MODE
        return Question(card_id=card['id'], mode=mode, prompt=card['ru'])
    else:
        raise HTTPException(status_code=400, detail='Invalid mode')
    distractors = random.sample(others, k=min(max(1, options_count - 1), len(others))) if others else []
    options = distractors + [correct_value]
    random.shuffle(options)
    return Question(card_id=card['id'], mode=mode, prompt=prompt, options=options)

def _update_verb_progress(progress: Dict, verb_id: int, all_correct: bool) -> None:
    key = f"verb_{verb_id}"
    stats = progress.setdefault('verbs', {}).setdefault(key, {"seen": 0, "mastered": 0})
    stats['seen'] += 1
    if all_correct:
        stats['mastered'] += 1
    stats['last_seen'] = datetime.now(timezone.utc).isoformat()


def _get_verb_by_id(verbs: List[Dict], verb_id: int) -> Dict:
    for v in verbs:
        if int(v['id']) == int(verb_id):
            return v
    raise KeyError


def _sample_verb_question(verbs: List[Dict]) -> VerbQuestion:
    verb = random.choice(verbs)
    return VerbQuestion(verb_id=verb['id'], infinitive=verb['infinitive'])

def _verb_progress_summary(verbs: List[Dict], progress: Dict) -> VerbProgressSummary:
    stats_src = progress.get('verbs', {})
    by_verb: Dict[int, Dict[str, int]] = {}
    seen = 0
    mastered = 0
    for v in verbs:
        s = stats_src.get(f"verb_{v['id']}", {"seen": 0, "mastered": 0})
        if s.get('seen', 0) > 0:
            seen += 1
        if s.get('mastered', 0) > 0:
            mastered += 1
        by_verb[v['id']] = {"seen": s.get('seen', 0), "mastered": s.get('mastered', 0)}
    return VerbProgressSummary(total=len(verbs), seen=seen, mastered=mastered, by_verb=by_verb)

# -------- Routes ---------

@router.get('/words')
async def list_words():
    return _load_words()

@router.get('/question', response_model=Question)
async def get_question(mode: str, options: int = 4, categories: str | None = None, username: str = Depends(get_current_user)):
    words = _load_words()
    if categories:
        wanted = {c.strip() for c in categories.split(',') if c.strip()}
        filtered = [w for w in words if w.get('category') in wanted]
        if filtered:
            words = filtered
    progress = _load_progress(username)
    return _sample_question(words, mode=mode, progress=progress, options_count=max(2, min(6, options)))

@router.post('/answer', response_model=AnswerResponse)
async def submit_answer(payload: AnswerRequest, username: str = Depends(get_current_user)):
    words = _load_words()
    try:
        card = _get_card_by_id(words, payload.card_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Card not found')
    if payload.mode not in {"pt2ru_choice", "pt2ru_input", "ru2pt_choice", "ru2pt_input"}:  # added ru2pt_input
        raise HTTPException(status_code=400, detail='Invalid mode')
    correct_answer = card['ru'] if payload.mode in {"pt2ru_choice", "pt2ru_input"} else card['pt']
    is_correct = _normalize_text(correct_answer) == _normalize_text(payload.answer)
    progress = _load_progress(username)
    _update_progress_on_answer(progress, payload.card_id, is_correct)
    _save_progress(username, progress)
    return AnswerResponse(correct=is_correct, correct_answer=correct_answer)

@router.get('/progress', response_model=ProgressSummary)
async def get_progress(username: str = Depends(get_current_user)):
    words = _load_words()
    progress = _load_progress(username)
    return _progress_summary(words, progress)

@router.post('/reset')
async def reset_progress(username: str = Depends(get_current_user)):
    _save_progress(username, {"cards": {}})
    return {"status": "ok"}

# -------- Verb Routes ---------
@router.get('/verb/question', response_model=VerbQuestion)
async def get_verb_question(username: str = Depends(get_current_user)):
    verbs = _load_verbs()
    return _sample_verb_question(verbs)

@router.post('/verb/answer', response_model=VerbAnswerResponse)
async def submit_verb_answer(payload: VerbAnswerRequest, username: str = Depends(get_current_user)):
    verbs = _load_verbs()
    try:
        verb = _get_verb_by_id(verbs, payload.verb_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Verb not found')
    results: Dict[str, bool] = {}
    correct_forms: Dict[str, str] = {p: verb[p] for p in PRONOUN_ORDER}
    for p in PRONOUN_ORDER:
        user_ans = payload.answers.get(p, '').strip()
        results[p] = _normalize_text(user_ans) == _normalize_text(verb[p]) if user_ans else False
    all_correct = all(results[p] for p in PRONOUN_ORDER)
    # progress update
    progress = _load_progress(username)
    _update_verb_progress(progress, verb['id'], all_correct)
    _save_progress(username, progress)
    return VerbAnswerResponse(verb_id=verb['id'], infinitive=verb['infinitive'], results=results, correct_forms=correct_forms, all_correct=all_correct)

@router.get('/verb/progress', response_model=VerbProgressSummary)
async def get_verb_progress(username: str = Depends(get_current_user)):
    verbs = _load_verbs()
    progress = _load_progress(username)
    return _verb_progress_summary(verbs, progress)

@router.get('/verb/list')
async def list_verbs(username: str = Depends(get_current_user)):
    verbs = _load_verbs()
    return [{"id": v['id'], "infinitive": v['infinitive']} for v in verbs]
