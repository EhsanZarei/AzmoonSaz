# سند طراحی فنی — پلتفرم آزمون‌ساز آنلاین فارسی (آزمونیار)
## نسخه ۱.۰ — فروردین ۱۴۰۵ (آوریل ۲۰۲۶)

---

> این سند طراحی فنی کامل پلتفرم آزمونیار را بر اساس سند نیازمندی‌های نسخه ۲.۰ تشریح می‌کند.

---

## فهرست مطالب

1. [معماری کلان سیستم](#۱-معماری-کلان-سیستم)
2. [طراحی دیتابیس](#۲-طراحی-دیتابیس)
3. [طراحی API](#۳-طراحی-api)
4. [معماری AI Service](#۴-معماری-ai-service)
5. [طراحی Real-time](#۵-طراحی-real-time)
6. [معماری امنیت و Proctoring](#۶-معماری-امنیت-و-proctoring)
7. [زیرساخت و استقرار](#۷-زیرساخت-و-استقرار)
8. [طراحی Frontend](#۸-طراحی-frontend)
9. [طراحی Caching](#۹-طراحی-caching)
10. [طراحی Queue و Background Jobs](#۱۰-طراحی-queue-و-background-jobs)

---

## ۱. معماری کلان سیستم

### ۱.۱ رویکرد معماری

**Modular Monolith** در فاز اول، با قابلیت تبدیل به Microservices در فاز سوم.

دلایل انتخاب:
- تیم کوچک در مرحله اولیه
- سرعت توسعه بالاتر
- هزینه عملیاتی کمتر
- امکان جداسازی ماژول‌ها در آینده

### ۱.۲ دیاگرام کلی

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│                                                                  │
│   ┌──────────────────┐          ┌──────────────────────────┐    │
│   │  Web App (PWA)   │          │  Mobile App (React Native)│    │
│   │  Next.js 15      │          │  فاز ۴                   │    │
│   └────────┬─────────┘          └────────────┬─────────────┘    │
└────────────┼────────────────────────────────┼──────────────────┘
             │                                │
             ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ArvanCloud CDN                                 │
│              فایل‌های استاتیک · تصاویر · ویدیو                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Nginx)                          │
│         Rate Limiting · SSL Termination · Load Balancing          │
│         Auth Middleware · Request Logging · CORS                  │
└──────┬──────────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │  Auth  │ │  Quiz  │ │  Exam  │ │Report  │ │  AI    │
  │Service │ │Service │ │Service │ │Service │ │Service │
  │NestJS  │ │NestJS  │ │NestJS  │ │NestJS  │ │FastAPI │
  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
      │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │PostgreSQL│  │  Redis   │  │  MinIO   │
        │   DB     │  │  Cache   │  │  Files   │
        └──────────┘  └──────────┘  └──────────┘
```

### ۱.۳ Stack فناوری

| لایه | فناوری | نسخه | دلیل انتخاب |
|------|--------|------|------------|
| Frontend | Next.js + TypeScript | 15.x | SSR، SEO، App Router |
| UI | Shadcn/UI + Tailwind CSS | latest | RTL، سفارشی‌سازی آسان |
| Backend | NestJS (Node.js) | 10.x | TypeScript، ماژولار، DI |
| AI Service | FastAPI (Python) | 0.110 | LLM، async، سرعت |
| Database | PostgreSQL | 16 | ACID، JSONB، Full-text |
| Cache | Redis | 7.x | Session، Queue، Pub/Sub |
| Queue | BullMQ | 5.x | Job scheduling، retry |
| Real-time | Socket.io | 4.x | WebSocket، fallback |
| File Storage | MinIO | latest | S3-compatible، بومی |
| Search | Elasticsearch | 8.x | جستجوی فارسی |
| AI/LLM | OpenAI GPT-4o | latest | تولید سوال |
| Speech | Whisper API | latest | Speech-to-Text |
| CDN | ArvanCloud | — | سرعت در ایران |
| Container | Docker + K8s | latest | استقرار، مقیاس |
| Monitoring | Sentry + Grafana | latest | خطا، عملکرد |

### ۱.۴ اصول طراحی

- **API-First:** همه عملکردها از طریق REST API
- **Stateless Services:** سرورها بدون حالت
- **Event-Driven:** رویدادها از طریق BullMQ
- **Zero-Downtime Deployment:** Rolling Update در K8s
- **Multi-Tenant:** جداسازی داده سازمان‌ها با Row-Level Security
- **Offline-First:** ذخیره پاسخ در LocalStorage

---

## ۲. طراحی دیتابیس

### ۲.۱ جداول اصلی

#### جدول users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  role          VARCHAR(20) DEFAULT 'student',
  status        VARCHAR(20) DEFAULT 'active',
  org_id        UUID REFERENCES organizations(id),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_org_id ON users(org_id);
```

#### جدول organizations
```sql
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  logo_url    TEXT,
  domain      VARCHAR(255) UNIQUE,
  plan_id     UUID REFERENCES plans(id),
  settings    JSONB DEFAULT '{}',
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### جدول exams
```sql
CREATE TABLE exams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  owner_id     UUID REFERENCES users(id) NOT NULL,
  org_id       UUID REFERENCES organizations(id),
  status       VARCHAR(20) DEFAULT 'draft',
  settings     JSONB DEFAULT '{}',
  -- settings شامل: timer, access, scoring, display, feedback
  tags         TEXT[],
  category     VARCHAR(100),
  language     VARCHAR(10) DEFAULT 'fa',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ
);
CREATE INDEX idx_exams_owner ON exams(owner_id);
CREATE INDEX idx_exams_org ON exams(org_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_tags ON exams USING GIN(tags);
```

#### جدول questions
```sql
CREATE TABLE questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      UUID REFERENCES exams(id) ON DELETE CASCADE,
  bank_id      UUID REFERENCES question_banks(id),
  type         VARCHAR(50) NOT NULL,
  -- types: mcq_single, mcq_multiple, true_false, short_answer,
  --        essay, fill_blank, matching, ordering, drag_drop,
  --        hotspot, likert, star_rating, slider, image_choice,
  --        video, audio, file_upload, matrix, ranking, code,
  --        math_formula, mind_map
  content      JSONB NOT NULL,
  -- content: { text, media, options, correct_answer, explanation }
  score        DECIMAL(8,2) DEFAULT 1,
  negative_score DECIMAL(8,2) DEFAULT 0,
  difficulty   VARCHAR(20) DEFAULT 'medium',
  time_limit   INTEGER, -- ثانیه
  order_index  INTEGER,
  tags         TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_content ON questions USING GIN(content);
```

#### جدول submissions
```sql
CREATE TABLE submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      UUID REFERENCES exams(id) NOT NULL,
  user_id      UUID REFERENCES users(id),
  guest_token  VARCHAR(100), -- برای شرکت‌کنندگان بدون حساب
  status       VARCHAR(20) DEFAULT 'in_progress',
  -- statuses: in_progress, completed, abandoned, disqualified
  score        DECIMAL(8,2),
  max_score    DECIMAL(8,2),
  percentage   DECIMAL(5,2),
  passed       BOOLEAN,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent   INTEGER, -- ثانیه
  ip_address   INET,
  user_agent   TEXT,
  proctoring_data JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_exam ON submissions(exam_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
```

#### جدول answers
```sql
CREATE TABLE answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES questions(id),
  response        JSONB NOT NULL,
  -- response: { value, files, confidence_level }
  score           DECIMAL(8,2),
  is_correct      BOOLEAN,
  time_spent      INTEGER, -- ثانیه
  graded_by       UUID REFERENCES users(id), -- برای نمره‌دهی دستی
  graded_at       TIMESTAMPTZ,
  feedback        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_answers_submission ON answers(submission_id);
CREATE INDEX idx_answers_question ON answers(question_id);
```

#### جدول certificates
```sql
CREATE TABLE certificates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) UNIQUE,
  user_id       UUID REFERENCES users(id),
  exam_id       UUID REFERENCES exams(id),
  template_id   UUID REFERENCES certificate_templates(id),
  unique_code   VARCHAR(50) UNIQUE NOT NULL,
  blockchain_hash VARCHAR(255),
  vc_document   JSONB, -- W3C Verifiable Credential
  issued_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0
);
CREATE INDEX idx_certs_user ON certificates(user_id);
CREATE INDEX idx_certs_code ON certificates(unique_code);
```

#### جدول question_banks
```sql
CREATE TABLE question_banks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  owner_id    UUID REFERENCES users(id),
  org_id      UUID REFERENCES organizations(id),
  visibility  VARCHAR(20) DEFAULT 'private',
  -- private, org, public
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### جدول srs_cards (Spaced Repetition)
```sql
CREATE TABLE srs_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id),
  ease_factor   DECIMAL(4,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions   INTEGER DEFAULT 0,
  next_review   DATE DEFAULT CURRENT_DATE,
  last_review   DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_srs_user_review ON srs_cards(user_id, next_review);
```

#### جدول workflows
```sql
CREATE TABLE workflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  owner_id    UUID REFERENCES users(id),
  name        VARCHAR(200) NOT NULL,
  trigger     VARCHAR(50) NOT NULL,
  -- exam.completed, exam.passed, exam.failed, etc.
  conditions  JSONB DEFAULT '[]',
  actions     JSONB NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### ۲.۲ Row-Level Security (Multi-tenant)

```sql
-- فعال‌سازی RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- سیاست دسترسی
CREATE POLICY exam_org_isolation ON exams
  USING (org_id = current_setting('app.current_org_id')::UUID
         OR owner_id = current_setting('app.current_user_id')::UUID);
```

### ۲.۳ Full-text Search فارسی

```sql
-- نصب افزونه
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ایندکس جستجوی فارسی
CREATE INDEX idx_questions_fts ON questions
  USING GIN(to_tsvector('simple', content->>'text'));

-- جستجو
SELECT * FROM questions
WHERE to_tsvector('simple', content->>'text')
  @@ plainto_tsquery('simple', 'شیمی آلی');
```

---

## ۳. طراحی API

### ۳.۱ اصول کلی

- **Base URL:** `https://api.azmoonyar.ir/v1`
- **احراز هویت:** Bearer Token (JWT)
- **فرمت:** JSON
- **نسخه‌بندی:** URL-based (`/v1/`, `/v2/`)
- **مستندات:** OpenAPI 3.0 در `/docs`

### ۳.۲ احراز هویت

```
POST /auth/send-otp
Body: { "phone": "09123456789" }
Response: { "token": "temp_token", "expires_in": 120 }

POST /auth/verify-otp
Body: { "token": "temp_token", "otp": "123456" }
Response: {
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "name": "...", "role": "..." }
}

POST /auth/refresh
Body: { "refresh_token": "eyJ..." }
Response: { "access_token": "eyJ..." }

POST /auth/logout
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

### ۳.۳ Endpoints آزمون

```
# لیست آزمون‌ها
GET /exams
Query: ?page=1&limit=20&status=published&search=شیمی
Response: {
  "data": [{ "id", "title", "status", "created_at", ... }],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}

# ایجاد آزمون
POST /exams
Body: {
  "title": "آزمون فصل ۳ شیمی",
  "settings": {
    "timer": 1800,
    "shuffle_questions": true,
    "show_result": "immediately",
    "passing_score": 60
  }
}

# جزئیات آزمون
GET /exams/:id
Response: { "id", "title", "questions": [...], "settings": {...} }

# ویرایش آزمون
PUT /exams/:id
Body: { "title": "...", "settings": {...} }

# حذف آزمون
DELETE /exams/:id

# انتشار آزمون
POST /exams/:id/publish

# کپی آزمون
POST /exams/:id/duplicate
```

### ۳.۴ Endpoints سوالات

```
# افزودن سوال
POST /exams/:id/questions
Body: {
  "type": "mcq_single",
  "content": {
    "text": "کدام گزینه فرمول آب است؟",
    "options": [
      { "id": "a", "text": "CO₂" },
      { "id": "b", "text": "H₂O" },
      { "id": "c", "text": "NaCl" }
    ],
    "correct_answer": "b",
    "explanation": "آب از دو اتم هیدروژن و یک اتم اکسیژن تشکیل شده"
  },
  "score": 2,
  "difficulty": "easy"
}

# ویرایش سوال
PUT /questions/:id

# حذف سوال
DELETE /questions/:id

# مرتب‌سازی سوالات
PUT /exams/:id/questions/reorder
Body: { "order": ["uuid1", "uuid2", "uuid3"] }
```

### ۳.۵ Endpoints برگزاری آزمون

```
# شروع آزمون
POST /exams/:id/start
Body: { "guest_name": "علی" } // اختیاری
Response: {
  "submission_id": "uuid",
  "questions": [...], // رمزنگاری‌شده
  "timer": 1800,
  "started_at": "2026-04-01T10:00:00Z"
}

# ذخیره پاسخ
PUT /submissions/:id/answers/:question_id
Body: {
  "response": { "value": "b", "confidence_level": "high" },
  "time_spent": 45
}

# پایان آزمون
POST /submissions/:id/complete
Response: {
  "score": 85,
  "percentage": 85,
  "passed": true,
  "certificate_id": "uuid"
}

# نتیجه آزمون
GET /submissions/:id/result
```

### ۳.۶ Endpoints AI

```
# تولید سوال از متن
POST /ai/generate-questions
Body: {
  "source_type": "text",
  "content": "متن درسی...",
  "count": 10,
  "difficulty": "medium",
  "question_types": ["mcq_single", "true_false"],
  "language": "fa"
}
Response: {
  "questions": [...],
  "generation_id": "uuid",
  "tokens_used": 1500
}

# آپلود فایل برای AI
POST /ai/upload
Body: FormData { file: PDF/DOCX/PPTX }
Response: { "file_id": "uuid", "extracted_text": "..." }

# تولید سوال از فایل
POST /ai/generate-from-file
Body: { "file_id": "uuid", "count": 15, ... }

# تولید تصویر
POST /ai/generate-image
Body: { "prompt": "دیاگرام سلول گیاهی", "style": "scientific" }
Response: { "image_url": "...", "image_id": "uuid" }

# گفتگو با AI (Chat-to-Quiz)
POST /ai/chat
Body: {
  "message": "یه آزمون ۱۵ سوالی از فصل ۳ شیمی بساز",
  "session_id": "uuid",
  "context": { "exam_id": "uuid" }
}
Response: {
  "reply": "آزمون ساخته شد...",
  "action": "exam_created",
  "data": { "exam_id": "uuid" }
}
```

### ۳.۷ Error Handling

```json
// فرمت خطا
{
  "error": {
    "code": "EXAM_NOT_FOUND",
    "message": "آزمون مورد نظر یافت نشد",
    "details": {},
    "timestamp": "2026-04-01T10:00:00Z",
    "request_id": "uuid"
  }
}

// کدهای HTTP
200 OK           - موفق
201 Created      - ایجاد شد
400 Bad Request  - ورودی نامعتبر
401 Unauthorized - احراز هویت نشده
403 Forbidden    - دسترسی ندارد
404 Not Found    - یافت نشد
422 Unprocessable - خطای اعتبارسنجی
429 Too Many Requests - Rate limit
500 Server Error - خطای سرور
```

---

## ۴. معماری AI Service

### ۴.۱ دیاگرام AI Pipeline

```
ورودی کاربر (متن/PDF/تصویر/URL/صدا)
              │
              ▼
    ┌─────────────────┐
    │  Preprocessor   │
    │  - OCR (تصویر)  │
    │  - PDF Parser   │
    │  - STT (صدا)    │
    │  - Web Scraper  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Text Chunker   │
    │  - تقسیم متن    │
    │  - نرمال‌سازی   │
    │  - فارسی‌سازی   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐      ┌──────────────┐
    │   LLM Router    │─────▶│  OpenAI      │
    │  (انتخاب مدل)  │      │  GPT-4o      │
    └────────┬────────┘      └──────────────┘
             │               ┌──────────────┐
             │──────────────▶│  Gemini Pro  │
             │               └──────────────┘
             │               ┌──────────────┐
             └──────────────▶│  مدل بومی    │
                             │  (Fallback)  │
                             └──────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  Post-processor  │
                          │  - اعتبارسنجی   │
                          │  - Bias Check   │
                          │  - Quality Score│
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  سوالات نهایی   │
                          └─────────────────┘
```

### ۴.۲ Prompt Engineering فارسی

```python
# prompt اصلی تولید سوال
QUESTION_GENERATION_PROMPT = """
تو یک متخصص طراحی سوال آموزشی هستی.
بر اساس متن زیر، {count} سوال {type} با سطح دشواری {difficulty} بساز.

متن:
{content}

قوانین:
- سوالات باید کاملاً فارسی باشند
- گزینه‌ها باید واضح و بدون ابهام باشند
- پاسخ صحیح باید مشخص باشد
- توضیح کوتاهی برای پاسخ صحیح بنویس
- از تعصب جنسیتی، فرهنگی یا منطقه‌ای پرهیز کن

خروجی را به فرمت JSON زیر برگردان:
{json_schema}
"""

# JSON Schema خروجی
QUESTION_SCHEMA = {
  "questions": [
    {
      "type": "mcq_single",
      "text": "متن سوال",
      "options": [
        {"id": "a", "text": "گزینه الف"},
        {"id": "b", "text": "گزینه ب"},
        {"id": "c", "text": "گزینه ج"},
        {"id": "d", "text": "گزینه د"}
      ],
      "correct_answer": "b",
      "explanation": "توضیح پاسخ",
      "difficulty": "medium",
      "tags": ["موضوع۱", "موضوع۲"]
    }
  ]
}
```

### ۴.۳ Fallback Strategy

```python
class LLMRouter:
    providers = [
        {"name": "openai", "model": "gpt-4o", "priority": 1},
        {"name": "gemini", "model": "gemini-pro", "priority": 2},
        {"name": "local", "model": "llama-3-fa", "priority": 3},
    ]

    async def generate(self, prompt: str) -> str:
        for provider in self.providers:
            try:
                result = await self._call(provider, prompt)
                if result: return result
            except Exception as e:
                logger.warning(f"Provider {provider['name']} failed: {e}")
                continue
        raise AllProvidersFailedError()
```

### ۴.۴ AI Chat (Conversational Builder)

```python
# مدیریت session مکالمه
class ChatSession:
    def __init__(self, user_id: str, exam_id: str = None):
        self.user_id = user_id
        self.exam_id = exam_id
        self.history = []  # تاریخچه مکالمه
        self.context = {}  # وضعیت فعلی آزمون

    async def process_message(self, message: str) -> ChatResponse:
        # تشخیص intent
        intent = await self.detect_intent(message)

        # اجرای action
        if intent == "create_exam":
            return await self.handle_create_exam(message)
        elif intent == "edit_question":
            return await self.handle_edit_question(message)
        elif intent == "publish_exam":
            return await self.handle_publish(message)
        # ...

    async def detect_intent(self, message: str) -> str:
        # استفاده از LLM برای تشخیص intent
        prompt = f"intent detection prompt: {message}"
        return await llm.classify(prompt, INTENT_CLASSES)
```

### ۴.۵ Bias Detection

```python
BIAS_CHECKS = [
    {
        "type": "gender",
        "patterns": ["مهندس او", "پزشک او"],
        "message": "فرض جنسیت در سوال"
    },
    {
        "type": "cultural",
        "patterns": ["در کشور ما", "فرهنگ ما"],
        "message": "اشاره به فرهنگ خاص"
    },
    {
        "type": "economic",
        "patterns": ["ماشین شخصی", "خانه شخصی"],
        "message": "فرض وضعیت اقتصادی"
    }
]

async def check_bias(question: dict) -> BiasReport:
    issues = []
    text = question["content"]["text"]
    for check in BIAS_CHECKS:
        for pattern in check["patterns"]:
            if pattern in text:
                issues.append({
                    "type": check["type"],
                    "message": check["message"],
                    "suggestion": await llm.suggest_fix(text, check)
                })
    return BiasReport(issues=issues, score=100 - len(issues)*10)
```

---

## ۵. طراحی Real-time (آزمون زنده)

### ۵.۱ معماری Socket.io

```
مدرس (Host)                    سرور                    دانش‌آموزان
     │                           │                           │
     │── create_room ──────────▶ │                           │
     │◀─ room_created ────────── │                           │
     │   { code: "ABC123" }      │                           │
     │                           │ ◀── join_room ────────── │
     │                           │     { code: "ABC123" }    │
     │                           │ ─── participant_joined ─▶ │
     │◀─ participant_joined ──── │                           │
     │                           │                           │
     │── start_quiz ───────────▶ │                           │
     │                           │ ─── question_show ──────▶ │
     │◀─ question_show ───────── │   { question, timer }     │
     │                           │                           │
     │                           │ ◀── submit_answer ─────── │
     │                           │     { answer, confidence } │
     │◀─ answer_received ─────── │                           │
     │                           │                           │
     │── next_question ────────▶ │                           │
     │                           │ ─── leaderboard_update ─▶ │
     │◀─ leaderboard_update ──── │                           │
```

### ۵.۲ Events تعریف‌شده

```typescript
// Server → Client Events
interface ServerToClientEvents {
  'room:created': (data: { code: string; room_id: string }) => void;
  'room:participant_joined': (data: { user: User; count: number }) => void;
  'quiz:question_show': (data: { question: Question; timer: number; index: number }) => void;
  'quiz:answer_result': (data: { correct: boolean; score: number }) => void;
  'quiz:leaderboard': (data: { rankings: Ranking[] }) => void;
  'quiz:ended': (data: { final_scores: Score[] }) => void;
  'host:message': (data: { text: string }) => void;
  'timer:update': (data: { remaining: number }) => void;
}

// Client → Server Events
interface ClientToServerEvents {
  'room:create': (data: { exam_id: string }) => void;
  'room:join': (data: { code: string; name: string }) => void;
  'quiz:submit_answer': (data: {
    question_id: string;
    answer: any;
    confidence: 'high' | 'medium' | 'low';
    time_spent: number;
  }) => void;
  'host:next_question': () => void;
  'host:pause': () => void;
  'host:end_quiz': () => void;
  'host:send_message': (data: { text: string }) => void;
}
```

### ۵.۳ Room State Management

```typescript
interface RoomState {
  id: string;
  code: string;           // کد ۶ رقمی
  exam_id: string;
  host_id: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  current_question_index: number;
  participants: Map<string, Participant>;
  scores: Map<string, number>;
  started_at?: Date;
}

// ذخیره در Redis
const roomKey = `room:${roomId}`;
await redis.setex(roomKey, 3600, JSON.stringify(roomState));
```

### ۵.۴ Confidence Mode Scoring

```typescript
function calculateScore(
  isCorrect: boolean,
  confidence: 'high' | 'medium' | 'low',
  timeBonus: number
): number {
  const baseScores = {
    correct: { high: 2000, medium: 1500, low: 1000 },
    wrong:   { high: -1000, medium: -500, low: 0 }
  };

  const key = isCorrect ? 'correct' : 'wrong';
  return baseScores[key][confidence] + (isCorrect ? timeBonus : 0);
}
```

### ۵.۵ مقیاس‌پذیری Real-time

```
برای پشتیبانی از ۱۰,۰۰۰ کاربر همزمان:

Socket.io با Redis Adapter:
  - چند instance سرور
  - Redis Pub/Sub برای sync بین instance‌ها
  - Sticky Sessions در Load Balancer

┌──────────┐    ┌──────────┐    ┌──────────┐
│ Socket   │    │ Socket   │    │ Socket   │
│ Server 1 │    │ Server 2 │    │ Server 3 │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
              ┌──────▼──────┐
              │ Redis Pub/Sub│
              └─────────────┘
```

---

## ۶. معماری امنیت و Proctoring

### ۶.۱ JWT Authentication

```typescript
// ساختار Access Token
interface JWTPayload {
  sub: string;        // user_id
  org: string;        // org_id
  role: string;       // user role
  plan: string;       // subscription plan
  iat: number;        // issued at
  exp: number;        // expires (15 min)
}

// ساختار Refresh Token
interface RefreshTokenPayload {
  sub: string;
  jti: string;        // unique token id (برای revoke)
  exp: number;        // expires (30 days)
}

// Refresh Token Rotation
async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  await redis.del(`refresh:${payload.jti}`); // revoke old
  const newAccess = generateAccessToken(payload.sub);
  const newRefresh = generateRefreshToken(payload.sub);
  await redis.setex(`refresh:${newRefresh.jti}`, 2592000, '1');
  return { access: newAccess, refresh: newRefresh };
}
```

### ۶.۲ Browser Lockdown

```typescript
// کلاینت — جلوگیری از تقلب
class ExamSecurityManager {
  private violations = 0;
  private maxViolations: number;

  init(settings: SecuritySettings) {
    this.maxViolations = settings.max_violations || 3;

    // غیرفعال کردن کلیدهای میانبر
    document.addEventListener('keydown', (e) => {
      const blocked = ['F12','F5','Tab'];
      const blockedCtrl = ['c','v','a','s','p','u'];
      if (blocked.includes(e.key) ||
          (e.ctrlKey && blockedCtrl.includes(e.key))) {
        e.preventDefault();
        this.recordViolation('keyboard_shortcut');
      }
    });

    // تشخیص تغییر تب
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.recordViolation('tab_switch');
    });

    // جلوگیری از کلیک راست
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.recordViolation('right_click');
    });

    // تشخیص DevTools
    this.detectDevTools();
  }

  private async recordViolation(type: string) {
    this.violations++;
    await api.post('/proctoring/violation', { type, timestamp: Date.now() });
    if (this.violations >= this.maxViolations) {
      this.terminateExam('max_violations_reached');
    }
  }
}
```

### ۶.۳ AI Proctoring (دوربین)

```typescript
// سرویس تشخیص چهره
class FaceDetectionService {
  private model: FaceDetectionModel;

  async analyze(videoFrame: ImageData): Promise<ProctorEvent[]> {
    const events: ProctorEvent[] = [];
    const faces = await this.model.detect(videoFrame);

    // بدون چهره
    if (faces.length === 0) {
      events.push({ type: 'no_face', severity: 'warning' });
    }

    // چند چهره
    if (faces.length > 1) {
      events.push({ type: 'multiple_faces', severity: 'critical' });
    }

    // نگاه به کنار (Eye Tracking)
    if (faces.length === 1) {
      const gazeDirection = await this.analyzeGaze(faces[0]);
      if (gazeDirection !== 'center') {
        events.push({ type: 'gaze_away', severity: 'warning', data: gazeDirection });
      }
    }

    return events;
  }
}
```

### ۶.۴ رمزنگاری سوالات

```typescript
// رمزنگاری سوالات قبل از ارسال به کلاینت
async function encryptQuestions(
  questions: Question[],
  submissionId: string
): Promise<EncryptedQuestions> {
  const key = await generateSessionKey(submissionId);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    key,
    new TextEncoder().encode(JSON.stringify(questions))
  );
  return { data: encrypted, key_hint: submissionId };
}
```

### ۶.۵ Rate Limiting

```typescript
// تنظیمات Rate Limit
const rateLimits = {
  'POST /auth/send-otp':     { window: '15m', max: 5 },
  'POST /auth/verify-otp':   { window: '15m', max: 10 },
  'POST /ai/generate':       { window: '1h',  max: 50 },
  'GET /exams':              { window: '1m',  max: 100 },
  'PUT /submissions/*/answers': { window: '1s', max: 5 },
};

// پیاده‌سازی با Redis
async function checkRateLimit(key: string, config: RateLimitConfig) {
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, config.windowSeconds);
  if (current > config.max) throw new RateLimitError();
}
```

---

## ۷. زیرساخت و استقرار

### ۷.۱ Docker Compose (Development)

```yaml
version: '3.9'
services:
  app:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on: [api]

  api:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/azmoonyar
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on: [postgres, redis]

  ai-service:
    build: ./ai-service
    ports: ["8000:8000"]
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=azmoonyar
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    command: redis-server --appendonly yes

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]
    command: server /data --console-address ":9001"

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes: [es_data:/usr/share/elasticsearch/data]

volumes:
  postgres_data:
  redis_data:
  minio_data:
  es_data:
```

### ۷.۲ Kubernetes (Production)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azmoonyar-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: azmoonyar-api
  template:
    spec:
      containers:
      - name: api
        image: azmoonyar/api:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
---
# hpa.yaml — Auto Scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: azmoonyar-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: azmoonyar-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### ۷.۳ CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Tests
        run: |
          npm ci
          npm run test:ci
          npm run lint

  build:
    needs: test
    steps:
      - name: Build Docker Images
        run: |
          docker build -t azmoonyar/api:${{ github.sha }} ./backend
          docker build -t azmoonyar/app:${{ github.sha }} ./frontend

      - name: Security Scan
        run: docker run --rm aquasec/trivy image azmoonyar/api:${{ github.sha }}

      - name: Push to Registry
        run: docker push azmoonyar/api:${{ github.sha }}

  deploy-staging:
    needs: build
    steps:
      - name: Deploy to Staging
        run: kubectl set image deployment/api api=azmoonyar/api:${{ github.sha }}

  deploy-production:
    needs: deploy-staging
    environment: production  # نیاز به تأیید دستی
    steps:
      - name: Rolling Deploy
        run: |
          kubectl set image deployment/api api=azmoonyar/api:${{ github.sha }}
          kubectl rollout status deployment/api --timeout=5m
```

### ۷.۴ Monitoring Stack

```yaml
# Grafana + Prometheus + Loki
monitoring:
  metrics:
    - API response time (P50, P95, P99)
    - Error rate per endpoint
    - Active WebSocket connections
    - Queue depth (BullMQ)
    - AI generation time
    - Database query time

  alerts:
    - Error rate > 1% → Slack notification
    - API P95 > 500ms → PagerDuty
    - Queue depth > 1000 → Scale workers
    - Disk usage > 80% → Alert
    - Memory > 85% → Alert
```

---

## ۸. طراحی Frontend

### ۸.۱ ساختار پروژه Next.js

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # داشبورد
│   │   ├── exams/
│   │   │   ├── page.tsx    # لیست آزمون‌ها
│   │   │   ├── new/        # ساخت آزمون
│   │   │   └── [id]/       # ویرایش آزمون
│   │   ├── reports/
│   │   ├── certificates/
│   │   └── settings/
│   ├── exam/
│   │   └── [id]/           # صفحه شرکت در آزمون
│   └── live/
│       └── [code]/         # آزمون زنده
├── components/
│   ├── ui/                 # Shadcn components
│   ├── exam/               # کامپوننت‌های آزمون
│   ├── questions/          # انواع سوال
│   ├── ai/                 # AI Chat
│   └── charts/             # نمودارها
├── hooks/                  # Custom hooks
├── stores/                 # Zustand stores
├── lib/                    # Utilities
└── locales/                # ترجمه‌ها
    ├── fa.json
    └── en.json
```

### ۸.۲ State Management (Zustand)

```typescript
// store آزمون در حال برگزاری
interface ExamStore {
  submission_id: string | null;
  questions: Question[];
  answers: Record<string, Answer>;
  currentIndex: number;
  timeRemaining: number;
  status: 'idle' | 'active' | 'paused' | 'completed';

  // Actions
  startExam: (submissionId: string, questions: Question[]) => void;
  saveAnswer: (questionId: string, answer: Answer) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitExam: () => Promise<Result>;
}

// ذخیره در LocalStorage برای Offline
const useExamStore = create(
  persist(examStore, {
    name: 'exam-session',
    storage: createJSONStorage(() => localStorage),
  })
);
```

### ۸.۳ RTL و فارسی

```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};

// globals.css
:root { direction: rtl; }
html[lang="en"] { direction: ltr; }

// تقویم شمسی
import { format } from 'date-fns-jalali';
const persianDate = format(new Date(), 'yyyy/MM/dd');
```

### ۸.۴ کامپوننت سوال (نمونه)

```typescript
// components/questions/MCQSingle.tsx
interface MCQSingleProps {
  question: Question;
  answer?: string;
  confidence?: ConfidenceLevel;
  onAnswer: (value: string, confidence: ConfidenceLevel) => void;
  showResult?: boolean;
}

export function MCQSingle({ question, answer, onAnswer, showResult }: MCQSingleProps) {
  const [selected, setSelected] = useState(answer);
  const [confidence, setConfidence] = useState<ConfidenceLevel>();

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-lg font-medium">{question.content.text}</p>

      <div className="space-y-2">
        {question.content.options.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelected(option.id)}
            className={cn(
              "w-full text-right p-4 rounded-xl border-2 transition-all",
              selected === option.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
              showResult && option.id === question.content.correct_answer
                ? "border-green-500 bg-green-50"
                : "",
            )}
          >
            {option.text}
          </button>
        ))}
      </div>

      {/* Confidence Mode */}
      {selected && !showResult && (
        <ConfidenceSelector
          value={confidence}
          onChange={setConfidence}
          onConfirm={() => onAnswer(selected, confidence!)}
        />
      )}
    </div>
  );
}
```

---

## ۹. طراحی Caching

### ۹.۱ استراتژی Cache

```
لایه ۱ — Browser Cache:
  فایل‌های استاتیک: Cache-Control: max-age=31536000
  صفحات HTML: no-cache (SSR)

لایه ۲ — CDN (ArvanCloud):
  تصاویر و فایل‌ها: 30 روز
  API responses عمومی: 5 دقیقه

لایه ۳ — Redis:
  Session کاربر:        TTL 30 روز
  تنظیمات سازمان:       TTL 1 ساعت
  نتایج آزمون:          TTL 1 ساعت
  لیدربورد زنده:        TTL 30 ثانیه
  Rate limit counters:  TTL متغیر
```

### ۹.۲ Cache Keys

```typescript
const CacheKeys = {
  userSession: (userId: string) => `session:${userId}`,
  orgSettings: (orgId: string) => `org:${orgId}:settings`,
  examResult: (submissionId: string) => `result:${submissionId}`,
  leaderboard: (examId: string) => `lb:${examId}`,
  rateLimit: (ip: string, endpoint: string) => `rl:${ip}:${endpoint}`,
};
```

---

## ۱۰. طراحی Queue و Background Jobs

### ۱۰.۱ صف‌های BullMQ

```typescript
// تعریف صف‌ها
const queues = {
  aiGeneration: new Queue('ai-generation', { connection: redis }),
  emailSend:    new Queue('email-send',    { connection: redis }),
  smsSend:      new Queue('sms-send',      { connection: redis }),
  certificate:  new Queue('certificate',   { connection: redis }),
  report:       new Queue('report',        { connection: redis }),
  webhook:      new Queue('webhook',       { connection: redis }),
};

// Worker تولید سوال AI
const aiWorker = new Worker('ai-generation', async (job) => {
  const { source_type, content, settings } = job.data;
  const questions = await aiService.generate(content, settings);
  await db.questions.createMany({ data: questions });
  await notifyUser(job.data.user_id, 'questions_ready', questions.length);
}, {
  concurrency: 5,
  connection: redis,
});

// Retry با backoff نمایی
aiWorker.on('failed', async (job, err) => {
  if (job.attemptsMade < 3) {
    await job.retry();
  }
});
```

### ۱۰.۲ Scheduled Jobs

```typescript
// گزارش هفتگی
new CronJob('0 8 * * 1', async () => {
  const orgs = await db.organizations.findActive();
  for (const org of orgs) {
    await queues.report.add('weekly-report', { org_id: org.id });
  }
});

// پاکسازی session‌های منقضی
new CronJob('0 2 * * *', async () => {
  await db.submissions.deleteExpired();
  await redis.cleanExpiredKeys('session:*');
});

// یادآوری Spaced Repetition
new CronJob('0 9 * * *', async () => {
  const dueCards = await db.srs_cards.findDueToday();
  for (const card of dueCards) {
    await queues.smsSend.add('srs-reminder', {
      user_id: card.user_id,
      question_count: card.count,
    });
  }
});
```

---

*پایان سند طراحی فنی — نسخه ۱.۰*
*آخرین به‌روزرسانی: فروردین ۱۴۰۵ (آوریل ۲۰۲۶)*
