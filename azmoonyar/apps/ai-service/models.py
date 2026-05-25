from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class GenerateRequest(BaseModel):
    content: str = Field(..., min_length=50, description="متن ورودی")
    count: int = Field(default=10, ge=1, le=100)
    difficulty: str = Field(default="medium")
    question_types: List[str] = Field(default=["mcq_single"])
    language: str = Field(default="fa")
    focus_topic: Optional[str] = None


class GenerateFromFileRequest(BaseModel):
    extracted_text: str
    count: int = Field(default=10, ge=1, le=100)
    difficulty: str = "medium"
    question_types: List[str] = ["mcq_single"]
    language: str = "fa"


class QuestionOption(BaseModel):
    id: str
    text: str
    image_url: Optional[str] = None


class Question(BaseModel):
    type: str
    text: str
    options: Optional[List[QuestionOption]] = None
    correct_answer: Any = None
    explanation: Optional[str] = None
    difficulty: str = "medium"
    tags: List[str] = []
    media_url: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str
    exam_id: Optional[str] = None
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    action: Optional[str] = None
    data: Optional[Dict] = None
