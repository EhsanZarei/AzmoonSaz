#!/bin/bash
# ===== اسکریپت Deploy آزمون‌یار =====
# اجرا روی سرور: bash deploy.sh

set -e

echo "🚀 شروع deploy آزمون‌یار..."

# ===== بررسی پیش‌نیازها =====
if ! command -v docker &> /dev/null; then
    echo "❌ Docker نصب نیست. در حال نصب..."
    apt update -y
    apt install -y docker.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
fi

if ! command -v git &> /dev/null; then
    apt install -y git
fi

echo "✅ پیش‌نیازها آماده"

# ===== بررسی فایل .env =====
if [ ! -f ".env" ]; then
    echo "❌ فایل .env وجود ندارد!"
    echo "لطفاً .env.production را به .env کپی کنید و مقادیر را تنظیم کنید"
    exit 1
fi

echo "✅ فایل .env موجود است"

# ===== Pull آخرین تغییرات =====
echo "📥 دریافت آخرین تغییرات..."
git pull origin main

# ===== Build و Start =====
echo "🔨 Build سرویس‌ها..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "⬇️ توقف سرویس‌های قدیمی..."
docker compose -f docker-compose.prod.yml down

echo "▶️ شروع سرویس‌ها..."
docker compose -f docker-compose.prod.yml up -d

# ===== Migration دیتابیس =====
echo "🗄️ اجرای migration دیتابیس..."
sleep 10  # صبر برای آماده شدن PostgreSQL
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api npx prisma db seed

echo ""
echo "✅ Deploy با موفقیت انجام شد!"
echo ""
echo "🌐 وب‌سایت: https://azmoonai.ir"
echo "🔌 API: https://api.azmoonai.ir"
echo ""
echo "برای مشاهده لاگ‌ها:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
