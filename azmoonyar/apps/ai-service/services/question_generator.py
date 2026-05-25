import json
import logging
from typing import List
from models import GenerateRequest, Question
from services.llm_router import llm_router

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """تو یک متخصص طراحی سوال آموزشی هستی که به زبان فارسی کار می‌کنی.
وظیفه تو ساخت سوالات آموزشی با کیفیت بالا است.

قوانین مهم:
- سوالات باید کاملاً فارسی باشند
- گزینه‌ها باید واضح و بدون ابهام باشند
- از تعصب جنسیتی، فرهنگی یا منطقه‌ای پرهیز کن
- توضیح پاسخ باید آموزنده باشد
- خروجی باید دقیقاً JSON معتبر باشد"""


async def generate_questions(request: GenerateRequest) -> List[Question]:
    """تولید سوال از محتوای ورودی"""

    difficulty_map = {
        "easy": "آسان",
        "medium": "متوسط",
        "hard": "سخت",
        "mixed": "ترکیبی (آسان، متوسط و سخت)"
    }

    type_map = {
        "mcq_single": "چهارگزینه‌ای (یک پاسخ صحیح)",
        "true_false": "درست/غلط",
        "fill_blank": "پر کردن جای خالی",
        "short_answer": "پاسخ کوتاه",
        "matching": "جور کردن"
    }

    question_types_str = ", ".join([
        type_map.get(t, t) for t in request.question_types
    ])

    prompt = f"""بر اساس متن زیر، دقیقاً {request.count} سوال بساز.

متن:
{request.content[:8000]}

مشخصات سوالات:
- تعداد: {request.count} سوال
- سطح دشواری: {difficulty_map.get(request.difficulty, request.difficulty)}
- انواع سوال: {question_types_str}
- زبان: فارسی

خروجی را دقیقاً به این فرمت JSON برگردان:
{{
  "questions": [
    {{
      "type": "mcq_single",
      "text": "متن سوال",
      "options": [
        {{"id": "a", "text": "گزینه الف"}},
        {{"id": "b", "text": "گزینه ب"}},
        {{"id": "c", "text": "گزینه ج"}},
        {{"id": "d", "text": "گزینه د"}}
      ],
      "correct_answer": "b",
      "explanation": "توضیح پاسخ صحیح",
      "difficulty": "medium",
      "tags": ["موضوع۱"]
    }}
  ]
}}"""

    try:
        response = await llm_router.generate(prompt, SYSTEM_PROMPT, json_mode=True)
        data = json.loads(response)
        questions = data.get("questions", [])

        # اعتبارسنجی و تبدیل
        validated = []
        for q in questions:
            try:
                validated.append(Question(**q))
            except Exception as e:
                logger.warning(f"Invalid question skipped: {e}")

        return validated

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise Exception("خطا در پردازش پاسخ AI")
