# راهنمای استقرار Staging در Liara VPS

این راهنما مراحل راه‌اندازی محیط Staging برای پلتفرم آزمونیار را در سرور Liara VPS شرح می‌دهد.

## پیش‌نیازها

### ۱. سرور Liara VPS
- پلن: Saturn (4GB RAM / 2 Core CPU)
- سیستم‌عامل: Ubuntu 22.04 LTS
- دسترسی SSH با کلید عمومی

### ۲. دامنه‌ها
- `staging.azmoonai.ir` → وب‌سایت Staging
- `staging-api.azmoonai.ir` → API Staging

### ۳. GitHub Secrets
در تنظیمات مخزن GitHub، Secrets زیر را اضافه کنید:

```
STAGING_SSH_KEY       # کلید خصوصی SSH برای اتصال به سرور
STAGING_HOST          # آدرس IP یا دامنه سرور
STAGING_USER          # نام کاربری SSH (معمولاً root یا ubuntu)
```

## راه‌اندازی اولیه سرور

### ۱. اتصال به سرور

```bash
ssh root@YOUR_SERVER_IP
```

### ۲. نصب Docker و Docker Compose

```bash
# به‌روزرسانی سیستم
apt update && apt upgrade -y

# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# نصب Docker Compose
apt install docker-compose-plugin -y

# فعال‌سازی Docker
systemctl enable docker
systemctl start docker

# تست نصب
docker --version
docker compose version
```

### ۳. نصب Git

```bash
apt install git -y
git --version
```

### ۴. ایجاد دایرکتوری پروژه

```bash
mkdir -p /var/www/azmoonyar-staging
cd /var/www/azmoonyar-staging
```

### ۵. Clone مخزن

```bash
# تنظیم SSH key برای GitHub (اگر مخزن private است)
ssh-keygen -t ed25519 -C "staging@azmoonai.ir"
cat ~/.ssh/id_ed25519.pub
# کلید عمومی را در GitHub Deploy Keys اضافه کنید

# Clone پروژه
git clone git@github.com:YOUR_USERNAME/azmoonyar.git .
```

### ۶. ایجاد فایل `.env`

```bash
cp .env.example .env.staging
nano .env.staging
```

محتوای نمونه `.env.staging`:

```env
# Database
DB_PASSWORD=your_secure_db_password_here

# Redis
REDIS_PASSWORD=your_secure_redis_password_here

# MinIO
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS (Kavenegar)
KAVENEGAR_API_KEY=your_kavenegar_api_key

# AI Services
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn

# Docker Registry
REGISTRY=ghcr.io
IMAGE_PREFIX=YOUR_GITHUB_USERNAME/azmoonyar
```

### ۷. تنظیم SSL با Certbot

```bash
# نصب Certbot
apt install certbot -y

# دریافت گواهی SSL برای دامنه‌های staging
certbot certonly --standalone -d staging.azmoonai.ir -d staging-api.azmoonai.ir

# کپی گواهی‌ها به دایرکتوری nginx
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/staging.azmoonai.ir/fullchain.pem nginx/ssl/staging-fullchain.pem
cp /etc/letsencrypt/live/staging.azmoonai.ir/privkey.pem nginx/ssl/staging-privkey.pem

# تنظیم تمدید خودکار
echo "0 0 * * 0 certbot renew --quiet && cp /etc/letsencrypt/live/staging.azmoonai.ir/*.pem /var/www/azmoonyar-staging/nginx/ssl/" | crontab -
```

### ۸. تنظیم DNS

در پنل مدیریت دامنه، رکوردهای زیر را اضافه کنید:

```
Type    Name            Value               TTL
A       staging         YOUR_SERVER_IP      3600
A       staging-api     YOUR_SERVER_IP      3600
```

### ۹. راه‌اندازی اولیه

```bash
# Login به GitHub Container Registry
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull تصاویر
docker compose -f docker-compose.staging.yml pull

# شروع سرویس‌ها
docker compose -f docker-compose.staging.yml up -d

# بررسی وضعیت
docker compose -f docker-compose.staging.yml ps

# مشاهده لاگ‌ها
docker compose -f docker-compose.staging.yml logs -f
```

### ۱۰. اجرای Migration دیتابیس

```bash
# صبر برای آماده شدن PostgreSQL
sleep 15

# اجرای migration
docker compose -f docker-compose.staging.yml exec api npx prisma migrate deploy

# اجرای seed (اختیاری)
docker compose -f docker-compose.staging.yml exec api npx prisma db seed
```

## استقرار خودکار با GitHub Actions

پس از راه‌اندازی اولیه، هر push به branch `main` به‌طور خودکار:

1. تصاویر Docker را build و push می‌کند (workflow: `docker-build.yml`)
2. تصاویر جدید را روی سرور staging pull می‌کند
3. سرویس‌ها را restart می‌کند
4. Migration دیتابیس را اجرا می‌کند
5. Health check انجام می‌دهد

### تست دستی Workflow

```bash
# از طریق GitHub UI
# Actions → Deploy to Staging → Run workflow
```

## مدیریت و نگهداری

### مشاهده لاگ‌ها

```bash
# همه سرویس‌ها
docker compose -f docker-compose.staging.yml logs -f

# یک سرویس خاص
docker compose -f docker-compose.staging.yml logs -f api

# ۱۰۰ خط آخر
docker compose -f docker-compose.staging.yml logs --tail=100
```

### Restart سرویس‌ها

```bash
# همه سرویس‌ها
docker compose -f docker-compose.staging.yml restart

# یک سرویس خاص
docker compose -f docker-compose.staging.yml restart api
```

### به‌روزرسانی دستی

```bash
cd /var/www/azmoonyar-staging

# Pull آخرین تغییرات
git pull origin main

# Pull تصاویر جدید
docker compose -f docker-compose.staging.yml pull

# Restart
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d

# Migration
docker compose -f docker-compose.staging.yml exec api npx prisma migrate deploy
```

### پاک‌سازی فضای دیسک

```bash
# حذف تصاویر استفاده نشده
docker image prune -a -f

# حذف volume های استفاده نشده
docker volume prune -f

# حذف network های استفاده نشده
docker network prune -f

# پاک‌سازی کامل (احتیاط!)
docker system prune -a --volumes -f
```

### Backup دیتابیس

```bash
# ایجاد backup
docker compose -f docker-compose.staging.yml exec postgres pg_dump -U azmoonyar azmoonyar_staging > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore از backup
cat backup_20240101_120000.sql | docker compose -f docker-compose.staging.yml exec -T postgres psql -U azmoonyar azmoonyar_staging
```

## عیب‌یابی

### سرویس‌ها start نمی‌شوند

```bash
# بررسی وضعیت
docker compose -f docker-compose.staging.yml ps

# بررسی لاگ‌ها
docker compose -f docker-compose.staging.yml logs

# بررسی منابع سیستم
free -h
df -h
docker stats
```

### خطای Connection Refused

```bash
# بررسی firewall
ufw status
ufw allow 80/tcp
ufw allow 443/tcp

# بررسی nginx
docker compose -f docker-compose.staging.yml logs nginx

# تست nginx config
docker compose -f docker-compose.staging.yml exec nginx nginx -t
```

### خطای Database Connection

```bash
# بررسی PostgreSQL
docker compose -f docker-compose.staging.yml logs postgres

# اتصال دستی به دیتابیس
docker compose -f docker-compose.staging.yml exec postgres psql -U azmoonyar azmoonyar_staging

# بررسی متغیرهای محیطی
docker compose -f docker-compose.staging.yml exec api env | grep DATABASE
```

### خطای Out of Memory

```bash
# بررسی مصرف حافظه
free -h
docker stats

# کاهش حافظه Redis
# در docker-compose.staging.yml: --maxmemory 256mb

# Restart سرویس‌ها
docker compose -f docker-compose.staging.yml restart
```

## امنیت

### تنظیمات Firewall

```bash
# فعال‌سازی UFW
ufw enable

# اجازه SSH
ufw allow 22/tcp

# اجازه HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# بررسی وضعیت
ufw status
```

### به‌روزرسانی‌های امنیتی

```bash
# به‌روزرسانی خودکار
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### محدود کردن دسترسی SSH

```bash
# ویرایش تنظیمات SSH
nano /etc/ssh/sshd_config

# تغییرات پیشنهادی:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

## نظارت

### Health Check Endpoints

- Web: `https://staging.azmoonai.ir`
- API Health: `https://staging-api.azmoonai.ir/health`
- API Docs: `https://staging-api.azmoonai.ir/api/docs`

### Monitoring با Docker Stats

```bash
# نمایش مصرف منابع real-time
docker stats

# نمایش یک‌بار
docker stats --no-stream
```

## لینک‌های مفید

- 🌐 Staging Web: https://staging.azmoonai.ir
- 🔌 Staging API: https://staging-api.azmoonai.ir
- 📊 API Health: https://staging-api.azmoonai.ir/health
- 📚 API Docs: https://staging-api.azmoonai.ir/api/docs

## پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های سرویس‌ها را بررسی کنید
2. وضعیت منابع سیستم را چک کنید
3. به مستندات اصلی پروژه مراجعه کنید
4. در GitHub Issues مشکل را گزارش دهید
