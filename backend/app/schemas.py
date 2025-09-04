from pydantic import BaseModel
from typing import List, Dict, Optional

class Question(BaseModel):
    card_id: int
    mode: str
    prompt: str
    options: Optional[List[str]] = None

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

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    expires_at: int

