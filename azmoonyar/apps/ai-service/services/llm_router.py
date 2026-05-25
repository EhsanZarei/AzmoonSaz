import logging
from typing import Optional
from openai import AsyncOpenAI
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)


class LLMRouter:
    """مسیریاب هوشمند بین مدل‌های مختلف با Fallback خودکار"""

    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)

    async def generate(self, prompt: str, system: str = "", json_mode: bool = False) -> str:
        """تولید متن با Fallback خودکار"""
        providers = [
            self._call_openai,
            self._call_gemini,
        ]

        for provider in providers:
            try:
                result = await provider(prompt, system, json_mode)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"Provider failed: {e}, trying next...")
                continue

        raise Exception("همه مدل‌های AI در دسترس نیستند")

    async def _call_openai(self, prompt: str, system: str, json_mode: bool) -> Optional[str]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": "gpt-4o",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4000,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.openai.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    async def _call_gemini(self, prompt: str, system: str, json_mode: bool) -> Optional[str]:
        if not settings.GEMINI_API_KEY:
            return None

        model = genai.GenerativeModel("gemini-pro")
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = await model.generate_content_async(full_prompt)
        return response.text


llm_router = LLMRouter()
