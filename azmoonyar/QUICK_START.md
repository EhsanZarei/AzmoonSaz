# راهنمای سریع راه‌اندازی پروژه آزمونیار

## مراحل راه‌اندازی (۵ دقیقه)

### ۱. نصب Docker Desktop

اگر Docker نصب نیست:
- [دانلود Docker Desktop](https://www.docker.com/products/docker-desktop/)
- راهنمای کامل: `DOCKER_SETUP_GUIDE.md`

### ۲. راه‌اندازی خودکار Prisma

```powershell
# اجرای اسکریپت راه‌اندازی
.\setup-prisma.ps1
```

این اسکریپت به صورت خودکار:
- ✓ Docker را بررسی می‌کند
- ✓ PostgreSQL را راه‌اندازی می‌کند
- ✓ Prisma Client را تولید می‌کند
- ✓ Migration را اجرا می‌کند
- ✓ اتصال را تست می‌کند

### ۳. راه‌اندازی دستی (اختیاری)

اگر ترجیح می‌دهید مراحل را دستی انجام دهید:

```powershell
# راه‌اندازی سرویس‌ها
docker-compose up -d

# تنظیم Prisma
cd apps\api
npm install
npm run db:generate
npm run db:migrate
npm run db:test
```

## دستورات مفید

```powershell
# مشاهده دیتابیس (رابط گرافیکی)
cd apps\api
npm run db:studio

# اجرای داده‌های اولیه
npm run db:seed

# مشاهده لاگ‌های PostgreSQL
docker-compose logs -f postgres

# توقف سرویس‌ها
docker-compose down

# راه‌اندازی مجدد
docker-compose restart postgres
```

## بررسی وضعیت

```powershell
# بررسی سرویس‌های در حال اجرا
docker-compose ps

# تست اتصال به دیتابیس
cd apps\api
npm run db:test
```

## مشکلات رایج

### Docker راه‌اندازی نمی‌شود
```powershell
# نصب WSL 2
wsl --install
# راه‌اندازی مجدد سیستم
```

### پورت 5432 اشغال است
```powershell
# توقف PostgreSQL محلی
Stop-Service postgresql-x64-*
```

### خطای اتصال به دیتابیس
```powershell
# راه‌اندازی مجدد PostgreSQL
docker-compose restart postgres
# انتظار ۱۰ ثانیه
Start-Sleep -Seconds 10
# تست مجدد
cd apps\api
npm run db:test
```

## مستندات کامل

- **راهنمای Docker**: `DOCKER_SETUP_GUIDE.md`
- **مستندات Prisma**: `apps/api/PRISMA_SETUP.md`
- **مستندات API**: `apps/api/README.md`

## پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های Docker را بررسی کنید: `docker-compose logs`
2. فایل `.env` را بررسی کنید
3. مستندات کامل را مطالعه کنید

---

**موفق باشید! 🚀**
