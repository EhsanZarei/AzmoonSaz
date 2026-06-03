
hnimport logging
import os
from typing import Optional
import httpx
from config import settings

logger = logging.getLogger(__name__)


class LLMRouter:
    """مسیریاب هوشمند بین مدل‌های مختلف با Fallback خودکار
    
    اولویت:
    1. DeepSeek (از ایران کار می‌کنه، ارزان‌ترین)
    2. OpenRouter → Gemma 4 31B (رایگان)
    3. Google Gemini 2.5 Flash-Lite (رایگان)
    """

    async def generate(self, prompt: str, system: str = "", json_mode: bool = False) -> str:
        """تولید متن با Fallback خودکار"""
        providers = [
            self._call_deepseek,
            self._call_openrouter,
            self._call_gemini,
        ]

        last_error = None
        for provider in providers:
            try:
                result = await provider(prompt, system, json_mode)
                if result:
                    return result
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {provider.__name__} failed: {e}, trying next...")
                continue

        raise Exception(f"همه مدل‌های AI در دسترس نیستند. آخرین خطا: {last_error}")

    async def _call_deepseek(self, prompt: str, system: str, json_mode: bool) -> Optional[str]:
        """DeepSeek API — از ایران کار می‌کنه"""
        api_key = settings.DEEPSEEK_API_KEY
        if not api_key:
            return None

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "deepseek-v4-flash",  # ارزان‌ترین مدل DeepSeek
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4000,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _call_openrouter(self, prompt: str, system: str, json_mode: bool) -> Optional[str]:
        """OpenRouter — مدل‌های رایگان (Gemma 4 31B)"""
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return None

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "google/gemma-4-31b-it:free",  # رایگان، کیفیت فارسی خوب
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 4000,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://azmoonai.ir",
                    "X-Title": "آزمون‌یار",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _call_gemini(self, prompt: str, system: str, json_mode: bool) -> Optional[str]:
        """Google Gemini 2.5 Flash-Lite — رایگان (۱۰۰۰ req/day)"""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return None

        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4000,
            },
        }
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={api_key}",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]


llm_router = LLMRouter()
