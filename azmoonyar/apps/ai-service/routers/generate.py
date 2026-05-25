from fastapi import APIRouter, UploadFile, File, HTTPException
from models import GenerateRequest, GenerateFromFileRequest
from services.question_generator import generate_questions
from services.file_processor import process_file
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/questions")
async def generate_from_text(request: GenerateRequest):
    """تولید سوال از متن"""
    try:
        questions = await generate_questions(request)
        return {
            "questions": [q.dict() for q in questions],
            "count": len(questions),
        }
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """آپلود و پردازش فایل"""
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg", "image/png", "image/webp",
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="فرمت فایل پشتیبانی نمی‌شود")

    if file.size and file.size > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=400, detail="حجم فایل بیش از ۵۰ مگابایت است")

    try:
        content = await file.read()
        extracted_text = await process_file(content, file.content_type, file.filename)
        return {
            "filename": file.filename,
            "extracted_text": extracted_text[:5000],  # پیش‌نمایش
            "char_count": len(extracted_text),
        }
    except Exception as e:
        logger.error(f"File processing failed: {e}")
        raise HTTPException(status_code=500, detail="خطا در پردازش فایل")


@router.post("/from-file")
async def generate_from_file(request: GenerateFromFileRequest):
    """تولید سوال از فایل پردازش‌شده"""
    gen_request = GenerateRequest(
        content=request.extracted_text,
        count=request.count,
        difficulty=request.difficulty,
        question_types=request.question_types,
        language=request.language,
    )
    questions = await generate_questions(gen_request)
    return {"questions": [q.dict() for q in questions], "count": len(questions)}
