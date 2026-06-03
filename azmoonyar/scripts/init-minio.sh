#!/bin/bash
# ===================================================
# اسکریپت راه‌اندازی MinIO برای محیط production
# ===================================================
# پیش‌نیاز: mc (MinIO Client) نصب شده باشد
# نحوه اجرا: ./scripts/init-minio.sh

set -e

MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
ALIAS="azmoonyar-minio"

echo "🚀 راه‌اندازی MinIO..."
echo "Endpoint: $MINIO_ENDPOINT"

# تنظیم alias
mc alias set "$ALIAS" "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# ایجاد bucket‌ها
echo "📦 ایجاد bucket‌ها..."

mc mb "$ALIAS/azmoonyar" --ignore-existing
echo "  ✅ azmoonyar (bucket اصلی)"

mc mb "$ALIAS/azmoonyar-temp" --ignore-existing
echo "  ✅ azmoonyar-temp (آپلود موقت)"

mc mb "$ALIAS/azmoonyar-certificates" --ignore-existing
echo "  ✅ azmoonyar-certificates (گواهینامه‌ها - خصوصی)"

mc mb "$ALIAS/azmoonyar-avatars" --ignore-existing
echo "  ✅ azmoonyar-avatars (آواتار کاربران - عمومی)"

mc mb "$ALIAS/azmoonyar-exam-media" --ignore-existing
echo "  ✅ azmoonyar-exam-media (رسانه آزمون - عمومی)"

# تنظیم سیاست دسترسی
echo "🔒 تنظیم سیاست‌های دسترسی..."

# آواتار و رسانه آزمون: عمومی (قابل خواندن بدون احراز هویت)
mc anonymous set public "$ALIAS/azmoonyar-avatars"
echo "  ✅ azmoonyar-avatars → public"

mc anonymous set public "$ALIAS/azmoonyar-exam-media"
echo "  ✅ azmoonyar-exam-media → public"

# گواهینامه‌ها: خصوصی (فقط با presigned URL)
mc anonymous set none "$ALIAS/azmoonyar-certificates"
echo "  ✅ azmoonyar-certificates → private"

# bucket اصلی: فقط پوشه public قابل دسترس عمومی
mc anonymous set download "$ALIAS/azmoonyar"
echo "  ✅ azmoonyar → download"

# تنظیم lifecycle برای bucket موقت (حذف خودکار بعد از ۲۴ ساعت)
mc ilm rule add --expire-days 1 "$ALIAS/azmoonyar-temp"
echo "  ✅ azmoonyar-temp → lifecycle: expire after 1 day"

echo ""
echo "✅ MinIO با موفقیت راه‌اندازی شد!"
echo ""
echo "Buckets:"
mc ls "$ALIAS"
