#!/bin/bash
# ===== راه‌اندازی اولیه سرور =====
# یک بار اجرا کنید: bash setup-server.sh

set -e

echo "🔧 راه‌اندازی سرور آزمون‌یار..."

# ===== آپدیت سیستم =====
apt update -y && apt upgrade -y

# ===== نصب پیش‌نیازها =====
apt install -y \
    docker.io \
    docker-compose-plugin \
    git \
    curl \
    wget \
    ufw \
    certbot \
    python3-certbot-nginx

# ===== فعال‌سازی Docker =====
systemctl enable docker
systemctl start docker

# ===== تنظیم Firewall =====
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo "✅ Firewall تنظیم شد"

# ===== Clone پروژه =====
if [ ! -d "/opt/azmoonyar" ]; then
    echo "📥 Clone پروژه..."
    git clone https://github.com/YOUR_USERNAME/azmoonyar.git /opt/azmoonyar
fi

cd /opt/azmoonyar

# ===== ساخت فایل .env =====
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo ""
    echo "⚠️  فایل .env ساخته شد."
    echo "لطفاً مقادیر را در /opt/azmoonyar/.env تنظیم کنید:"
    echo "  nano /opt/azmoonyar/.env"
    echo ""
    echo "بعد از تنظیم، دوباره اجرا کنید:"
    echo "  bash /opt/azmoonyar/scripts/deploy.sh"
fi

echo ""
echo "✅ راه‌اندازی اولیه کامل شد!"
echo ""
echo "مراحل بعدی:"
echo "1. nano /opt/azmoonyar/.env  (تنظیم متغیرها)"
echo "2. bash /opt/azmoonyar/scripts/ssl.sh  (دریافت SSL)"
echo "3. bash /opt/azmoonyar/scripts/deploy.sh  (deploy)"
