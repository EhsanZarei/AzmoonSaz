# مستندات تنظیم Prisma ORM با PostgreSQL

## نمای کلی

این مستند شامل تمام اطلاعات لازم برای تنظیم، استفاده و مدیریت Prisma ORM در پروژه آزمونیار است.

## فهرست مطالب

1. [پیش‌نیازها](#پیش‌نیازها)
2. [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
3. [ساختار Schema](#ساختار-schema)
4. [دستورات Prisma](#دستورات-prisma)
5. [استفاده از Prisma Client](#استفاده-از-prisma-client)
6. [Migration](#migration)
7. [Seeding](#seeding)
8. [بهترین شیوه‌ها](#بهترین-شیوه‌ها)
9. [رفع مشکلات](#رفع-مشکلات)

---

## پیش‌نیازها

- Node.js 18+ و npm
- PostgreSQL 16 (از طریق Docker یا نصب مستقیم)
- Docker و Docker Compose (توصیه می‌شود)

## نصب و راه‌اندازی

### مرحله ۱: نصب وابستگی‌ها

```bash
cd apps/api
npm install
```

این دستور تمام وابستگی‌ها از جمله `@prisma/client` و `prisma` را نصب می‌کند.

### مرحله ۲: راه‌اندازی PostgreSQL

#### با Docker (توصیه می‌شود):

```bash
# از پوشه اصلی پروژه
docker-compose up -d postgres
```

#### بدون Docker:

اطمینان حاصل کنید که PostgreSQL در حال اجرا است و DATABASE_URL در `.env` صحیح است:

```env
DATABASE_URL=postgresql://azmoonyar:secret@localhost:5432/azmoonyar_dev
```

### مرحله ۳: تولید Prisma Client

```bash
npm run db:generate
```

این دستور Prisma Client را از `schema.prisma` تولید می‌کند.

### مرحله ۴: اجرای Migration

```bash
npm run db:migrate
```

این دستور جداول دیتابیس را بر اساس schema ایجاد می‌کند.

### مرحله ۵: تست اتصال

```bash
npm run db:test
```

این دستور اتصال به دیتابیس را تست می‌کند و اطلاعات جداول را نمایش می‌دهد.

### مرحله ۶ (اختیاری): اجرای Seed

```bash
npm run db:seed
```

این دستور داده‌های اولیه را در دیتابیس وارد می‌کند.

---

## ساختار Schema

فایل `prisma/schema.prisma` شامل تعریف تمام مدل‌های دیتابیس است:

### مدل‌های اصلی:

- **User**: کاربران سیستم
- **Organization**: سازمان‌ها
- **Exam**: آزمون‌ها
- **Question**: سوالات
- **Submission**: شرکت در آزمون
- **Answer**: پاسخ‌های داده شده
- **Certificate**: گواهینامه‌ها
- **QuestionBank**: بانک سوالات
- **SrsCard**: کارت‌های تکرار فاصله‌دار
- **Workflow**: گردش کارهای خودکار
- **ChatSession**: جلسات چت با AI

### روابط:

```
User ──┬─> Exam (ownedExams)
       ├─> Submission
       ├─> Certificate
       ├─> QuestionBank
       └─> SrsCard

Organization ──┬─> User (members)
               ├─> Exam
               └─> QuestionBank

Exam ──┬─> Question
       ├─> Submission
       └─> Certificate

Submission ──┬─> Answer
             └─> Certificate
```

---

## دستورات Prisma

### دستورات اصلی:

```bash
# تولید Prisma Client
npm run db:generate

# اجرای migration در حالت development
npm run db:migrate

# ریست کامل دیتابیس (حذف داده‌ها + migration مجدد)
npm run db:reset

# باز کردن Prisma Studio (رابط گرافیکی)
npm run db:studio

# اجرای seed
npm run db:seed

# تست اتصال
npm run db:test
```

### دستورات پیشرفته:

```bash
# ایجاد migration جدید
npx prisma migrate dev --name migration_name

# اعمال migration در production
npx prisma migrate deploy

# بررسی وضعیت migration
npx prisma migrate status

# فرمت کردن schema
npx prisma format

# اعتبارسنجی schema
npx prisma validate
```

---

## استفاده از Prisma Client

### راه‌اندازی در NestJS:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### استفاده در Service:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ایجاد کاربر
  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: 'STUDENT',
      },
    });
  }

  // یافتن کاربر با ایمیل
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        org: true,
        ownedExams: true,
      },
    });
  }

  // لیست کاربران با صفحه‌بندی
  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // به‌روزرسانی کاربر
  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // حذف کاربر
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

### Query های پیشرفته:

```typescript
// جستجو با فیلتر
const exams = await prisma.exam.findMany({
  where: {
    status: 'PUBLISHED',
    title: {
      contains: 'شیمی',
      mode: 'insensitive',
    },
    createdAt: {
      gte: new Date('2024-01-01'),
    },
  },
  include: {
    owner: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        questions: true,
        submissions: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10,
});

// Transaction
const result = await prisma.$transaction(async (tx) => {
  const submission = await tx.submission.create({
    data: {
      examId: examId,
      userId: userId,
      status: 'IN_PROGRESS',
    },
  });

  await tx.answer.createMany({
    data: answers.map(answer => ({
      submissionId: submission.id,
      questionId: answer.questionId,
      response: answer.response,
    })),
  });

  return submission;
});

// Aggregation
const stats = await prisma.submission.aggregate({
  where: {
    examId: examId,
    status: 'COMPLETED',
  },
  _avg: {
    score: true,
    timeSpent: true,
  },
  _max: {
    score: true,
  },
  _min: {
    score: true,
  },
  _count: true,
});

// Raw Query (برای query های پیچیده)
const result = await prisma.$queryRaw`
  SELECT 
    e.id,
    e.title,
    COUNT(DISTINCT s.id) as submission_count,
    AVG(s.score) as avg_score
  FROM exams e
  LEFT JOIN submissions s ON e.id = s.exam_id
  WHERE e.status = 'PUBLISHED'
  GROUP BY e.id, e.title
  ORDER BY submission_count DESC
  LIMIT 10
`;
```

---

## Migration

### ایجاد Migration جدید:

```bash
# پس از تغییر schema.prisma
npx prisma migrate dev --name add_new_field
```

### اعمال Migration در Production:

```bash
npx prisma migrate deploy
```

### بازگشت به Migration قبلی:

```bash
# حذف آخرین migration (فقط در development)
npx prisma migrate reset
```

### نکات مهم:

1. **همیشه قبل از تغییر schema، backup بگیرید**
2. **Migration ها را در git commit کنید**
3. **در production از `migrate deploy` استفاده کنید، نه `migrate dev`**
4. **قبل از اعمال migration در production، در staging تست کنید**

---

## Seeding

فایل `prisma/seed.ts` برای وارد کردن داده‌های اولیه استفاده می‌شود:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ایجاد کاربر ادمین
  const admin = await prisma.user.upsert({
    where: { email: 'admin@azmoonyar.ir' },
    update: {},
    create: {
      email: 'admin@azmoonyar.ir',
      name: 'مدیر سیستم',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✓ کاربر ادمین ایجاد شد:', admin.email);

  // ایجاد پلن‌های اشتراک
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { type: 'FREE' },
      update: {},
      create: {
        name: 'رایگان',
        type: 'FREE',
        priceMonthly: 0,
        priceYearly: 0,
        features: {
          maxExams: 5,
          maxQuestions: 50,
          maxSubmissions: 100,
        },
        limits: {
          aiGenerations: 50,
          storage: 100, // MB
        },
      },
    }),
    // ... سایر پلن‌ها
  ]);

  console.log(`✓ ${plans.length} پلن ایجاد شد`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

اجرا:

```bash
npm run db:seed
```

---

## بهترین شیوه‌ها

### 1. استفاده از Transaction برای عملیات چندگانه

```typescript
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.organization.update({ where: { id }, data: orgData }),
]);
```

### 2. استفاده از Select برای بهینه‌سازی

```typescript
// بد - تمام فیلدها را برمی‌گرداند
const user = await prisma.user.findUnique({ where: { id } });

// خوب - فقط فیلدهای مورد نیاز
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

### 3. استفاده از Index برای فیلدهای پرجستجو

```prisma
model User {
  email String @unique
  phone String @unique
  
  @@index([email])
  @@index([phone])
}
```

### 4. استفاده از Soft Delete

```typescript
// به جای حذف واقعی
await prisma.user.update({
  where: { id },
  data: { status: 'DELETED' },
});

// فیلتر کردن موارد حذف شده
const users = await prisma.user.findMany({
  where: { status: { not: 'DELETED' } },
});
```

### 5. مدیریت خطا

```typescript
try {
  await prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new ConflictException('ایمیل قبلاً ثبت شده است');
  }
  throw error;
}
```

---

## رفع مشکلات

### مشکل: "Can't reach database server"

**علت:** PostgreSQL در حال اجرا نیست

**راه‌حل:**
```bash
docker-compose up -d postgres
# یا
docker-compose restart postgres
```

### مشکل: "Prisma Client is not generated"

**علت:** Prisma Client تولید نشده است

**راه‌حل:**
```bash
npm run db:generate
```

### مشکل: "Migration is out of sync"

**علت:** schema با migration ها همخوانی ندارد

**راه‌حل:**
```bash
# در development
npm run db:reset

# در production
npx prisma migrate deploy
```

### مشکل: "Connection pool timeout"

**علت:** تعداد اتصالات زیاد به دیتابیس

**راه‌حل:**
```typescript
// در PrismaService
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // تنظیم connection pool
  log: ['query', 'error', 'warn'],
});
```

یا استفاده از PgBouncer برای connection pooling.

### مشکل: "Slow queries"

**راه‌حل:**

1. اضافه کردن Index:
```prisma
@@index([fieldName])
```

2. استفاده از `select` به جای `include`
3. بررسی query ها با:
```typescript
const prisma = new PrismaClient({
  log: ['query'],
});
```

---

## منابع بیشتر

- [مستندات رسمی Prisma](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**نکته:** این مستند به صورت مداوم به‌روزرسانی می‌شود. برای آخرین تغییرات، به repository مراجعه کنید.
