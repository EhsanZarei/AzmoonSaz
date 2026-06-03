from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # AI Providers — اولویت: DeepSeek → OpenRouter → Gemini
    DEEPSEEK_API_KEY: Optional[str] = None      # از ایران کار می‌کنه
    OPENROUTER_API_KEY: Optional[str] = None    # مدل‌های رایگان
    GEMINI_API_KEY: Optional[str] = None        # رایگان ۱۰۰۰/روز
    OPENAI_API_KEY: Optional[str] = None        # پشتیبان (تحریم)

    REDIS_URL: str = "redis://localhost:6379"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    API_URL: str = "http://localhost:4000"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
