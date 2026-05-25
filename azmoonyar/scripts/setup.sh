#!/bin/bash
set -e

echo "🚀 راه‌اندازی محیط توسعه آزمونیار..."

# بررسی پیش‌نیازها
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 نصب نشده. لطفاً ابتدا آن را نصب کنید."
    exit 1
  fi
}

check_command node
check_command npm
check_command docker
check_command docker-compose

echo "✅ پیش‌نیازها بررسی شدند"

# کپی فایل محیطی
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ فایل .env ایجاد شد — لطفاً مقادیر را تنظیم کنید"
fi

# نصب dependencies
echo "📦 نصب dependencies..."
npm install

# راه‌اندازی Docker
echo "🐳 راه‌اندازی سرویس‌های Docker..."
docker-compose up -d postgres redis minio elasticsearch mailhog

# انتظار برای آماده شدن دیتابیس
echo "⏳ انتظار برای آماده شدن PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U azmoonyar -d azmoonyar_dev; do
  sleep 2
done
echo "✅ PostgreSQL آماده است"

# انتظار برای Redis
echo "⏳ انتظار برای آماده شدن Redis..."
until docker-compose exec -T redis redis-cli ping | grep -q PONG; do
  sleep 2
done
echo "✅ Redis آماده است"

# اجرای migration دیتابیس
echo "🗄️ اجرای migration دیتابیس..."
npm run db:migrate

# اجرای seed data
echo "🌱 بارگذاری داده‌های اولیه..."
npm run db:seed

echo ""
echo "✅ راه‌اندازی کامل شد!"
echo ""
echo "🌐 آدرس‌های سرویس‌ها:"
echo "   Web App:        http://localhost:3000"
echo "   API:            http://localhost:4000"
echo "   API Docs:       http://localhost:4000/docs"
echo "   AI Service:     http://localhost:8000"
echo "   MinIO Console:  http://localhost:9001"
echo "   MailHog:        http://localhost:8025"
echo ""
echo "🚀 برای شروع توسعه: npm run dev"
