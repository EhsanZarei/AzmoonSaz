# پیاده‌سازی سیستم دعوت اعضا از طریق ایمیل

## خلاصه
سیستم دعوت ایمیلی برای افزودن اعضا به سازمان‌ها پیاده‌سازی شده است. این سیستم به مدیران سازمان (ORG_ADMIN) اجازه می‌دهد کاربران جدید را از طریق ایمیل به سازمان خود دعوت کنند.

## ویژگی‌های پیاده‌سازی شده

### 1. مدل پایگاه داده (Invitation)
- ایجاد جدول `invitations` با فیلدهای زیر:
  - `id`: شناسه یکتا
  - `email`: ایمیل دعوت‌شده
  - `orgId`: شناسه سازمان
  - `invitedBy`: شناسه دعوت‌کننده
  - `role`: نقش پیش‌فرض (TEACHER یا STUDENT)
  - `token`: توکن یکتای دعوت‌نامه (UUID)
  - `status`: وضعیت (PENDING, ACCEPTED, EXPIRED, REVOKED)
  - `expiresAt`: تاریخ انقضا (7 روز)
  - `acceptedAt`: تاریخ پذیرش
  - `createdAt` و `updatedAt`

- ایندکس‌های بهینه برای جستجوی سریع
- روابط با جداول `organizations` و `users`

### 2. API Endpoints

#### POST /organizations/:id/invite
دعوت عضو جدید از طریق ایمیل

**دسترسی:** فقط ORG_ADMIN یا SUPER_ADMIN

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "STUDENT"  // optional, default: STUDENT
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "STUDENT",
  "status": "PENDING",
  "expiresAt": "2026-04-10T12:00:00Z",
  "createdAt": "2026-04-03T12:00:00Z"
}
```

**محدودیت‌ها:**
- فقط نقش‌های TEACHER و STUDENT مجاز هستند
- هر ایمیل فقط یک دعوت‌نامه معلق می‌تواند داشته باشد
- Rate limiting: حداکثر 10 دعوت در ساعت برای هر سازمان
- اعتبارسنجی فرمت ایمیل
- بررسی عضویت قبلی کاربر

#### POST /organizations/invitations/accept
پذیرش دعوت‌نامه

**دسترسی:** کاربر احراز هویت شده

**Request Body:**
```json
{
  "token": "uuid-token"
}
```

**Response:**
```json
{
  "message": "با موفقیت به سازمان پیوستید",
  "organization": {
    "id": "uuid",
    "name": "نام سازمان",
    "slug": "slug"
  },
  "role": "STUDENT"
}
```

**بررسی‌ها:**
- اعتبار توکن
- عدم انقضای دعوت‌نامه (7 روز)
- تطابق ایمیل کاربر با دعوت‌نامه
- عدم عضویت قبلی در سازمان دیگر

#### GET /organizations/:id/invitations
لیست دعوت‌نامه‌های معلق

**دسترسی:** فقط ORG_ADMIN یا SUPER_ADMIN

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "STUDENT",
    "status": "PENDING",
    "expiresAt": "2026-04-10T12:00:00Z",
    "createdAt": "2026-04-03T12:00:00Z",
    "inviter": {
      "id": "uuid",
      "name": "نام دعوت‌کننده",
      "email": "inviter@example.com"
    }
  }
]
```

#### DELETE /organizations/:id/invitations/:invitationId
لغو دعوت‌نامه

**دسترسی:** فقط ORG_ADMIN یا SUPER_ADMIN

**Response:**
```json
{
  "message": "دعوت‌نامه لغو شد"
}
```

### 3. ارسال ایمیل دعوت

قالب ایمیل فارسی با ویژگی‌های زیر:
- طراحی RTL و زیبا
- نمایش نام سازمان و دعوت‌کننده
- نمایش نقش کاربر
- لینک پذیرش دعوت
- هشدار تاریخ انقضا (7 روز)
- فرمت تاریخ شمسی

### 4. امنیت و اعتبارسنجی

#### محدودیت‌ها:
- **Rate Limiting:** حداکثر 10 دعوت در ساعت برای هر سازمان
- **انقضا:** دعوت‌نامه‌ها پس از 7 روز منقضی می‌شوند
- **توکن یکتا:** استفاده از UUID برای امنیت بالا
- **اعتبارسنجی نقش:** فقط TEACHER و STUDENT مجاز

#### بررسی‌های امنیتی:
- بررسی دسترسی مدیریتی برای ارسال دعوت
- نرمال‌سازی ایمیل (lowercase)
- جلوگیری از دعوت تکراری
- بررسی عضویت قبلی کاربر
- بررسی تطابق ایمیل در هنگام پذیرش

### 5. تست‌های واحد

19 تست شامل:

**تست‌های inviteMember:**
- ایجاد موفق دعوت‌نامه
- خطای ForbiddenException برای کاربر غیرمدیر
- خطای ConflictException برای عضو موجود
- خطای ConflictException برای دعوت معلق موجود
- خطای BadRequestException برای نقش نامعتبر
- خطای BadRequestException برای تجاوز از محدودیت
- نرمال‌سازی ایمیل

**تست‌های acceptInvitation:**
- پذیرش موفق دعوت‌نامه
- خطای NotFoundException برای توکن نامعتبر
- خطای BadRequestException برای دعوت پذیرفته شده
- خطای BadRequestException برای دعوت منقضی شده
- خطای ForbiddenException برای عدم تطابق ایمیل
- خطای ConflictException برای عضویت قبلی

**تست‌های listPendingInvitations:**
- لیست موفق دعوت‌نامه‌ها
- خطای ForbiddenException برای کاربر غیرمدیر

**تست‌های revokeInvitation:**
- لغو موفق دعوت‌نامه
- خطای NotFoundException برای دعوت‌نامه نامعتبر
- خطای BadRequestException برای دعوت غیرمعلق
- خطای ForbiddenException برای سازمان متفاوت

## فایل‌های ایجاد/تغییر شده

### فایل‌های جدید:
1. `invitations.service.ts` - سرویس دعوت‌نامه‌ها
2. `invitations.service.spec.ts` - تست‌های واحد
3. `dto/invite-member.dto.ts` - DTO دعوت عضو
4. `dto/accept-invitation.dto.ts` - DTO پذیرش دعوت

### فایل‌های تغییر یافته:
1. `prisma/schema.prisma` - افزودن مدل Invitation و روابط
2. `organizations.controller.ts` - افزودن endpoint‌های دعوت
3. `organizations.module.ts` - افزودن InvitationsService و NotificationsModule

### Migration:
- `20260603002517_add_invitations_model` - مایگریشن جدول دعوت‌نامه‌ها

## نحوه استفاده

### 1. دعوت عضو جدید:
```bash
curl -X POST http://localhost:3000/organizations/org-id/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "role": "STUDENT"}'
```

### 2. پذیرش دعوت:
```bash
curl -X POST http://localhost:3000/organizations/invitations/accept \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "invitation-token-uuid"}'
```

### 3. لیست دعوت‌نامه‌های معلق:
```bash
curl -X GET http://localhost:3000/organizations/org-id/invitations \
  -H "Authorization: Bearer <token>"
```

### 4. لغو دعوت‌نامه:
```bash
curl -X DELETE http://localhost:3000/organizations/org-id/invitations/invitation-id \
  -H "Authorization: Bearer <token>"
```

## یادداشت‌های پیاده‌سازی

### 1. چرا UUID برای توکن؟
- امنیت بالا (غیرقابل حدس زدن)
- یکتا بودن تضمین شده
- سازگار با استانداردها

### 2. چرا 7 روز انقضا؟
- زمان کافی برای بررسی ایمیل
- نه خیلی طولانی که امنیت را تهدید کند
- مطابق با design document

### 3. چرا محدودیت 10 دعوت در ساعت؟
- جلوگیری از سوءاستفاده و spam
- کاهش بار سرور ایمیل
- کافی برای استفاده عادی

### 4. یکپارچگی با NotificationsService:
- استفاده مجدد از سرویس موجود
- قالب ایمیل فارسی با طراحی زیبا
- مدیریت خطای ارسال ایمیل (لاگ می‌شود اما دعوت ایجاد می‌شود)

## وضعیت کار

✅ **تکمیل شده:**
- مدل پایگاه داده و migration
- سرویس دعوت‌نامه‌ها
- API endpoints
- ارسال ایمیل دعوت
- تست‌های واحد (19 تست، همه pass)
- اعتبارسنجی و امنیت
- Rate limiting
- مستندات

## تست‌ها

تمام 19 تست با موفقیت اجرا شد:
```
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Time:        24.52 s
```

## نکات برای توسعه آینده

1. **اضافه کردن نوتیفیکیشن در‌برنامه‌ای:** علاوه بر ایمیل، نوتیفیکیشن داخل سیستم
2. **پشتیبانی از دعوت دسته‌جمعی:** آپلود فایل Excel برای دعوت چندین کاربر
3. **دعوت با لینک عمومی:** لینک عمومی با تاریخ انقضا برای دعوت سریع
4. **گزارش آماری دعوت‌نامه‌ها:** تعداد دعوت ارسال شده، پذیرفته شده، منقضی شده
5. **ارسال یادآوری:** ارسال ایمیل یادآوری برای دعوت‌های نزدیک به انقضا

## مشکلات شناخته شده

هیچ مشکل شناخته شده‌ای وجود ندارد. همه تست‌ها با موفقیت اجرا می‌شوند.

---

**تاریخ تکمیل:** فروردین 1405  
**نسخه:** 1.0  
**توسعه‌دهنده:** Kiro AI Assistant
