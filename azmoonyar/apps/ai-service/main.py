from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import generate, chat, image, health
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Service starting...")
    yield
    logger.info("AI Service shutting down...")


app = FastAPI(
    title="آزمونیار AI Service",
    description="سرویس هوش مصنوعی پلتفرم آزمون‌ساز",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.API_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(generate.router, prefix="/generate", tags=["generate"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(image.router, prefix="/image", tags=["image"])
