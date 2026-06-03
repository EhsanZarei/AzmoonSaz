import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)


async def generate_image(prompt: str, style: str = "educational") -> dict:
    """تولید تصویر آموزشی با DALL-E"""

    style_prompts = {
        "educational": "educational illustration, clean, simple, suitable for students",
        "diagram": "scientific diagram, labeled, clear, white background",
        "illustration": "colorful illustration, engaging, educational",
    }

    full_prompt = f"{prompt}, {style_prompts.get(style, style_prompts['educational'])}"

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = await client.images.generate(
            model="dall-e-3",
            prompt=full_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        return {
            "image_url": response.data[0].url,
            "revised_prompt": response.data[0].revised_prompt,
        }
    except Exception as e:
        logger.error(f"DALL-E error: {e}")
        raise Exception("خطا در تولید تصویر")
