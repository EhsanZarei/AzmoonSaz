from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse
from services.chat_service import process_chat
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """گفتگو با AI برای ساخت آزمون"""
    try:
        return await process_chat(request)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
