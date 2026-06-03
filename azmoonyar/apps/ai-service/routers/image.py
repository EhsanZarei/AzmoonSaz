from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.image_service import generate_image
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ImageRequest(BaseModel):
    prompt: str
    style: str = "educational"  # educational, diagram, illustration


@router.post("/generate")
async def generate(request: ImageRequest):
    """تولید تصویر آموزشی با AI"""
    try:
        result = await generate_image(request.prompt, request.style)
        return result
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
