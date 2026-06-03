# آزمونیار — پلتفرم آزمون‌ساز آنلاین فارسی

پلتفرم SaaS آزمون‌ساز آنلاین با هوش مصنوعی، گیمیفیکیشن و گواهینامه دیجیتال برای بازار ایران.

## ساختار پروژه

```
azmoonyar/
├── apps/
│   ├── web/          # Next.js 15 — رابط کاربری
│   ├── api/          # NestJS 10 — Backend API
│   └── ai-service/   # FastAPI (Python) — سرویس هوش مصنوعی
├── docker-compose.yml
└── turbo.json
```

## راه‌اندازی سریع

### پیش‌نیازها
- Node.js >= 20
- Docker & Docker Compose
- Python >= 3.11 (برای AI service)

### ۱. کلون و نصب

```bash
git clone <repo>
cd azmoonyar
cp .env.example .env
npm install
```

### ۲. راه‌اندازی زیرساخت

```bash
docker-compose up -d postgres redis minio elasticsearch mailhog
```

### ۳. Migration و Seed دیتابیس

```bash
npm run db:migrate
npm run db:seed
```

### ۴. اجرای سرویس‌ها

```bash
# همه سرویس‌ها با هم
npm run dev

# یا جداگانه:
cd apps/api && npm run dev        # http://localhost:4000
cd apps/web && npm run dev        # http://localhost:3000
cd apps/ai-service && uvicorn main:app --reload  # http://localhost:8000
```

## سرویس‌ها

| سرویس | آدرس | توضیح |
|-------|------|-------|
| Web | http://localhost:3000 | رابط کاربری Next.js |
| API | http://localhost:4000 | Backend NestJS |
| API Docs | http://localhost:4000/docs | Swagger UI |
| AI Service | http://localhost:8000 | FastAPI |
| MailHog | http://localhost:8025 | تست ایمیل |
| MinIO | http://localhost:9001 | مدیریت فایل |

## حساب‌های آزمایشی (بعد از seed)

| نقش | شماره موبایل |
|-----|-------------|
| Super Admin | 09000000000 |
| Teacher | 09111111111 |

> در محیط development، OTP در console چاپ می‌شود.

## Stack فناوری

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** NestJS 10, TypeScript, Prisma ORM
- **AI Service:** FastAPI, Python, OpenAI GPT-4o, Gemini
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Real-time:** Socket.io
- **Search:** Elasticsearch 8

## وضعیت توسعه

| فاز | وضعیت | توضیح |
|-----|--------|-------|
| فاز ۰ — زیرساخت | ✅ تکمیل | Docker, DB Schema, CI/CD |
| فاز ۱ — MVP | 🔄 در حال توسعه | Auth, Exams, Submissions |
| فاز ۲ — رشد | ⏳ برنامه‌ریزی شده | AI, Live Quiz, Certificates |
| فاز ۳ — بلوغ | ⏳ برنامه‌ریزی شده | White-label, API, Proctoring |
| فاز ۴ — توسعه | ⏳ برنامه‌ریزی شده | Mobile App, International |
