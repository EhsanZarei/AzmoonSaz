# راهنمای نصب و راه‌اندازی Docker

## نصب Docker Desktop برای Windows

### مرحله ۱: دانلود Docker Desktop

1. به آدرس زیر بروید:
   ```
   https://www.docker.com/products/docker-desktop/
   ```

2. روی دکمه "Download for Windows" کلیک کنید

### مرحله ۲: نصب Docker Desktop

1. فایل دانلود شده (`Docker Desktop Installer.exe`) را اجرا کنید
2. در صفحه Configuration:
   - گزینه "Use WSL 2 instead of Hyper-V" را فعال کنید (توصیه می‌شود)
   - گزینه "Add shortcut to desktop" را فعال کنید
3. روی "Ok" کلیک کنید
4. منتظر بمانید تا نصب کامل شود
5. روی "Close and restart" کلیک کنید

### مرحله ۳: راه‌اندازی اولیه

1. پس از راه‌اندازی مجدد، Docker Desktop را باز کنید
2. شرایط و ضوابط را بپذیرید
3. منتظر بمانید تا Docker Engine راه‌اندازی شود (نشانگر سبز در پایین)

### مرحله ۴: تأیید نصب

PowerShell یا Command Prompt را باز کنید و دستور زیر را اجرا کنید:

```powershell
docker --version
docker-compose --version
```

اگر نسخه Docker نمایش داده شد، نصب موفقیت‌آمیز بوده است.

## راه‌اندازی پروژه آزمونیار

پس از نصب Docker، مراحل زیر را دنبال کنید:

### ۱. راه‌اندازی سرویس‌ها

در پوشه اصلی پروژه (`azmoonyar`):

```powershell
# راه‌اندازی تمام سرویس‌ها
docker-compose up -d

# مشاهده وضعیت سرویس‌ها
docker-compose ps

# مشاهده لاگ‌ها
docker-compose logs -f
```

### ۲. اجرای Migration دیتابیس

```powershell
cd apps/api
npm run db:migrate
```

### ۳. اجرای Seed (داده‌های اولیه)

```powershell
npm run db:seed
```

### ۴. تست اتصال به دیتابیس

```powershell
npm run db:test
```

## دستورات مفید Docker

```powershell
# توقف تمام سرویس‌ها
docker-compose down

# توقف و حذف volumes (داده‌ها)
docker-compose down -v

# راه‌اندازی مجدد یک سرویس خاص
docker-compose restart postgres

# مشاهده لاگ یک سرویس خاص
docker-compose logs -f postgres

# اجرای دستور در کانتینر
docker-compose exec postgres psql -U azmoonyar -d azmoonyar_dev
```

## رفع مشکلات رایج

### مشکل: Docker Engine راه‌اندازی نمی‌شود

**راه‌حل:**
1. WSL 2 را نصب کنید:
   ```powershell
   wsl --install
   ```
2. سیستم را راه‌اندازی مجدد کنید
3. Docker Desktop را دوباره باز کنید

### مشکل: پورت 5432 قبلاً استفاده می‌شود

**راه‌حل:**
1. PostgreSQL محلی را متوقف کنید:
   ```powershell
   Stop-Service postgresql-x64-*
   ```
2. یا پورت را در `docker-compose.yml` تغییر دهید

### مشکل: خطای "no space left on device"

**راه‌حل:**
1. Docker Desktop را باز کنید
2. Settings > Resources > Advanced
3. Disk image size را افزایش دهید

## منابع بیشتر

- [مستندات رسمی Docker](https://docs.docker.com/)
- [راهنمای Docker Compose](https://docs.docker.com/compose/)
- [WSL 2 Installation Guide](https://docs.microsoft.com/en-us/windows/wsl/install)

---

**نکته:** پس از نصب Docker و راه‌اندازی سرویس‌ها، می‌توانید به تنظیم Prisma بازگردید.
