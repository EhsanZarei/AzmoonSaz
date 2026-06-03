import json
import logging
from models import ChatRequest, ChatResponse
from services.llm_router import llm_router

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """تو یک دستیار هوشمند برای ساخت آزمون آنلاین فارسی هستی.
کاربر می‌تواند از طریق گفتگو با تو آزمون بسازد، سوالات را ویرایش کند و تنظیمات را تغییر دهد.

قابلیت‌های تو:
- ساخت آزمون از موضوع یا متن
- ویرایش سوالات موجود
- تغییر تنظیمات آزمون (تایمر، نمره، دسترسی)
- پیشنهاد بهبود سوالات

فرمت پاسخ:
- همیشه به فارسی پاسخ بده
- اگر action انجام دادی، آن را در فیلد action مشخص کن
- اگر سوالاتی تولید کردی، آن‌ها را در فیلد data قرار بده"""

INTENT_PROMPT = """بر اساس پیام کاربر، intent را تشخیص بده و یکی از موارد زیر را برگردان:
- create_exam: ساخت آزمون جدید
- generate_questions: تولید سوال
- edit_question: ویرایش سوال
- update_settings: تغییر تنظیمات
- publish_exam: انتشار آزمون
- general: سوال عمومی

پیام: {message}
فقط یک کلمه برگردان."""


async def process_chat(request: ChatRequest) -> ChatResponse:
    """پردازش پیام چت و تشخیص intent"""

    # تشخیص intent
    intent_prompt = INTENT_PROMPT.format(message=request.message)
    intent = await llm_router.generate(intent_prompt)
    intent = intent.strip().lower()

    # ساخت context از تاریخچه
    history_text = ""
    for msg in request.history[-6:]:  # آخرین ۶ پیام
        role = "کاربر" if msg.role == "user" else "دستیار"
        history_text += f"{role}: {msg.content}\n"

    # prompt اصلی
    prompt = f"""تاریخچه مکالمه:
{history_text}

پیام جدید کاربر: {request.message}

وضعیت آزمون: {json.dumps(request.exam_id or "بدون آزمون")}

بر اساس intent "{intent}"، پاسخ مناسب بده.
اگر سوال تولید کردی، آن‌ها را به فرمت JSON در پاسخ بگنجان.
پاسخ را به فرمت JSON زیر برگردان:
{{
  "reply": "پاسخ متنی به کاربر",
  "action": "نام action یا null",
  "data": {{}} یا null
}}"""

    response_text = await llm_router.generate(prompt, SYSTEM_PROMPT, json_mode=True)

    try:
        data = json.loads(response_text)
        return ChatResponse(
            reply=data.get("reply", "متوجه نشدم، لطفاً دوباره توضیح بدید."),
            action=data.get("action"),
            data=data.get("data"),
        )
    except json.JSONDecodeError:
        return ChatResponse(reply=response_text)
