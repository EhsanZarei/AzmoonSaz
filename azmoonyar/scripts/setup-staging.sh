#!/bin/bash
# ===== اسکریپت راه‌اندازی اولیه Staging =====
# اجرا روی سرور Liara VPS: bash setup-staging.sh

set -e

echo "🚀 شروع راه‌اندازی محیط Staging آزمون‌یار..."
echo ""

# ===== رنگ‌ها برای خروجی =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== بررسی root access =====
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ لطفاً این اسکریپت را با دسترسی root اجرا کنید${NC}"
    echo "   sudo bash setup-staging.sh"
    exit 1
fi

echo -e "${GREEN}✅ دسترسی root تأیید شد${NC}"

# ===== بررسی و نصب Docker =====
echo ""
echo "📦 بررسی Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker نصب نیست. در حال نصب...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker نصب شد${NC}"
else
    echo -e "${GREEN}✅ Docker نصب است ($(docker --version))${NC}"
fi

# ===== بررسی و نصب Docker Compose =====
echo ""
echo "📦 بررسی Docker Compose..."
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose نصب نیست. در حال نصب...${NC}"
    apt update -y
    apt install docker-compose-plugin -y
    echo -e "${GREEN}✅ Docker Compose نصب شد${NC}"
else
    echo -e "${GREEN}✅ Docker Compose نصب است ($(docker compose version))${NC}"
fi

# ===== بررسی و نصب Git =====
echo ""
echo "📦 بررسی Git..."
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git نصب نیست. در حال نصب...${NC}"
    apt install git -y
    echo -e "${GREEN}✅ Git نصب شد${NC}"
else
    echo -e "${GREEN}✅ Git نصب است ($(git --version))${NC}"
fi

# ===== بررسی و نصب Certbot =====
echo ""
echo "📦 بررسی Certbot..."
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}⚠️  Certbot نصب نیست. در حال نصب...${NC}"
    apt install certbot -y
    echo -e "${GREEN}✅ Certbot نصب شد${NC}"
else
    echo -e "${GREEN}✅ Certbot نصب است ($(certbot --version))${NC}"
fi

# ===== ایجاد دایرکتوری پروژه =====
echo ""
echo "📁 ایجاد دایرکتوری پروژه..."
PROJECT_DIR="/var/www/azmoonyar-staging"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$PROJECT_DIR"
    echo -e "${GREEN}✅ دایرکتوری ایجاد شد: $PROJECT_DIR${NC}"
else
    echo -e "${GREEN}✅ دایرکتوری موجود است: $PROJECT_DIR${NC}"
fi

cd "$PROJECT_DIR"

# ===== بررسی فایل .env =====
echo ""
echo "🔐 بررسی فایل .env.staging..."
if [ ! -f ".env.staging" ]; then
    echo -e "${YELLOW}⚠️  فایل .env.staging وجود ندارد${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.staging
        echo -e "${GREEN}✅ فایل .env.staging از .env.example کپی شد${NC}"
        echo -e "${YELLOW}⚠️  لطفاً فایل .env.staging را ویرایش کنید:${NC}"
        echo "   nano .env.staging"
    else
        echo -e "${RED}❌ فایل .env.example نیز وجود ندارد!${NC}"
        echo "   لطفاً ابتدا پروژه را clone کنید"
        exit 1
    fi
else
    echo -e "${GREEN}✅ فایل .env.staging موجود است${NC}"
fi

# ===== تنظیم SSL =====
echo ""
echo "🔒 راه‌اندازی SSL..."
read -p "آیا می‌خواهید گواهی SSL دریافت کنید؟ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "دامنه staging را وارد کنید (مثال: staging.azmoonai.ir): " STAGING_DOMAIN
    read -p "دامنه API staging را وارد کنید (مثال: staging-api.azmoonai.ir): " STAGING_API_DOMAIN
    
    echo -e "${YELLOW}⚠️  در حال دریافت گواهی SSL...${NC}"
    certbot certonly --standalone -d "$STAGING_DOMAIN" -d "$STAGING_API_DOMAIN" --non-interactive --agree-tos --email admin@azmoonai.ir
    
    # کپی گواهی‌ها
    mkdir -p nginx/ssl
    cp "/etc/letsencrypt/live/$STAGING_DOMAIN/fullchain.pem" nginx/ssl/staging-fullchain.pem
    cp "/etc/letsencrypt/live/$STAGING_DOMAIN/privkey.pem" nginx/ssl/staging-privkey.pem
    
    echo -e "${GREEN}✅ گواهی SSL دریافت و کپی شد${NC}"
    
    # تنظیم تمدید خودکار
    CRON_CMD="0 0 * * 0 certbot renew --quiet && cp /etc/letsencrypt/live/$STAGING_DOMAIN/*.pem $PROJECT_DIR/nginx/ssl/"
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo -e "${GREEN}✅ تمدید خودکار SSL تنظیم شد${NC}"
else
    echo -e "${YELLOW}⚠️  SSL تنظیم نشد. برای استفاده در production حتماً SSL را فعال کنید${NC}"
fi

# ===== تنظیم Firewall =====
echo ""
echo "🔥 تنظیم Firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✅ Firewall تنظیم شد${NC}"
else
    echo -e "${YELLOW}⚠️  UFW نصب نیست. نصب می‌شود...${NC}"
    apt install ufw -y
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✅ UFW نصب و تنظیم شد${NC}"
fi

# ===== راه‌اندازی GitHub Container Registry =====
echo ""
echo "🐙 راه‌اندازی GitHub Container Registry..."
read -p "نام کاربری GitHub را وارد کنید: " GITHUB_USERNAME
read -sp "GitHub Personal Access Token را وارد کنید: " GITHUB_TOKEN
echo

echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ورود به GitHub Container Registry موفق بود${NC}"
else
    echo -e "${RED}❌ ورود به GitHub Container Registry ناموفق بود${NC}"
    exit 1
fi

# ===== Pull تصاویر Docker =====
echo ""
echo "🐳 دریافت تصاویر Docker..."
export REGISTRY="ghcr.io"
export IMAGE_PREFIX="$GITHUB_USERNAME/azmoonyar"

docker compose -f docker-compose.staging.yml pull

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ تصاویر Docker دریافت شدند${NC}"
else
    echo -e "${RED}❌ دریافت تصاویر Docker ناموفق بود${NC}"
    exit 1
fi

# ===== راه‌اندازی سرویس‌ها =====
echo ""
echo "🚀 راه‌اندازی سرویس‌ها..."
docker compose -f docker-compose.staging.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ سرویس‌ها راه‌اندازی شدند${NC}"
else
    echo -e "${RED}❌ راه‌اندازی سرویس‌ها ناموفق بود${NC}"
    exit 1
fi

# ===== صبر برای آماده شدن سرویس‌ها =====
echo ""
echo "⏳ صبر برای آماده شدن سرویس‌ها..."
sleep 20

# ===== اجرای Migration =====
echo ""
echo "🗄️  اجرای Migration دیتابیس..."
docker compose -f docker-compose.staging.yml exec -T api npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration با موفقیت اجرا شد${NC}"
else
    echo -e "${YELLOW}⚠️  Migration ناموفق بود یا قبلاً اجرا شده است${NC}"
fi

# ===== بررسی وضعیت سرویس‌ها =====
echo ""
echo "📊 وضعیت سرویس‌ها:"
docker compose -f docker-compose.staging.yml ps

# ===== خلاصه =====
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ راه‌اندازی محیط Staging با موفقیت انجام شد!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 لینک‌های دسترسی:"
echo "   - Web: https://staging.azmoonai.ir"
echo "   - API: https://staging-api.azmoonai.ir"
echo "   - Health: https://staging-api.azmoonai.ir/health"
echo ""
echo "📋 دستورات مفید:"
echo "   - مشاهده لاگ‌ها:"
echo "     docker compose -f docker-compose.staging.yml logs -f"
echo ""
echo "   - Restart سرویس‌ها:"
echo "     docker compose -f docker-compose.staging.yml restart"
echo ""
echo "   - توقف سرویس‌ها:"
echo "     docker compose -f docker-compose.staging.yml down"
echo ""
echo "   - به‌روزرسانی:"
echo "     git pull && docker compose -f docker-compose.staging.yml pull && docker compose -f docker-compose.staging.yml up -d"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
