# پیاده‌سازی مدیریت اعضای سازمان

## خلاصه

این مستند پیاده‌سازی کامل تسک **1.2.4 - مدیریت اعضا (تعلیق، حذف، تغییر نقش)** را شرح می‌دهد.

## تاریخ پیاده‌سازی
**تاریخ تکمیل**: 3 ژانویه 2025

## ویژگی‌های پیاده‌سازی شده

### 1. تعلیق حساب کاربری (Suspend)
- **Endpoint**: `PATCH /organizations/:id/members/:memberId/suspend`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: تعلیق حساب کاربری یک عضو از سازمان
- **اعتبارسنجی**:
  - ادمین نمی‌تواند خودش را تعلیق کند
  - عضو باید متعلق به همان سازمان باشد
  - عضو نباید قبلاً تعلیق شده باشد

### 2. فعال‌سازی مجدد حساب (Activate)
- **Endpoint**: `PATCH /organizations/:id/members/:memberId/activate`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: فعال‌سازی مجدد حساب کاربری یک عضو تعلیق‌شده
- **اعتبارسنجی**:
  - عضو باید متعلق به همان سازمان باشد
  - عضو نباید قبلاً فعال باشد

### 3. حذف عضو از سازمان (Remove)
- **Endpoint**: `DELETE /organizations/:id/members/:memberId`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: حذف عضو از سازمان (orgId → null، role → STUDENT)
- **اعتبارسنجی**:
  - ادمین نمی‌تواند خودش را حذف کند
  - عضو باید متعلق به همان سازمان باشد

### 4. تغییر نقش کاربر (Change Role)
- **Endpoint**: `PATCH /organizations/:id/members/:memberId/role`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: تغییر نقش یک عضو در سازمان
- **نقش‌های قابل تخصیص**:
  - `STUDENT`
  - `TEACHER`
  - `ORG_ADMIN`
  - `SUPER_ADMIN` (فقط توسط SUPER_ADMIN)
- **اعتبارسنجی**:
  - ادمین نمی‌تواند نقش خودش را تغییر دهد
  - فقط `SUPER_ADMIN` می‌تواند کسی را به `SUPER_ADMIN` تبدیل کند
  - عضو باید متعلق به همان سازمان باشد

### 5. تغییر وضعیت عضو (Change Status)
- **Endpoint**: `PATCH /organizations/:id/members/:memberId/status`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: تغییر وضعیت عضو (ACTIVE/SUSPENDED)
- **اعتبارسنجی**:
  - ادمین نمی‌تواند وضعیت خودش را تغییر دهد
  - عضو باید متعلق به همان سازمان باشد

### 6. مشاهده لیست اعضا
- **Endpoint**: `GET /organizations/:id/members`
- **دسترسی**: `SUPER_ADMIN`, `ORG_ADMIN`
- **عملکرد**: دریافت لیست کامل اعضای سازمان
- **فیلدهای بازگشتی**: id, name, email, phone, role, createdAt

## ساختار کد

### فایل‌های اصلی

```
apps/api/src/modules/organizations/
├── organizations.controller.ts      # کنترلر API
├── organizations.service.ts         # لایه سرویس با Business Logic
├── organizations.service.spec.ts    # تست‌های Unit (28 تست)
└── dto/
    ├── update-member-role.dto.ts    # DTO تغییر نقش
    └── update-member-status.dto.ts  # DTO تغییر وضعیت
```

### فایل‌های تست

```
apps/api/test/
└── organizations-member-management.e2e-spec.ts  # تست‌های E2E
```

## DTOها (Data Transfer Objects)

### UpdateMemberRoleDto
```typescript
{
  role: UserRole;  // STUDENT | TEACHER | ORG_ADMIN | SUPER_ADMIN
}
```

### UpdateMemberStatusDto
```typescript
{
  status: UserStatus;  // ACTIVE | SUSPENDED
}
```

## نمونه‌های استفاده

### 1. تعلیق عضو
```bash
curl -X PATCH \
  http://localhost:4000/api/v1/organizations/org-123/members/user-456/suspend \
  -H 'Authorization: Bearer <token>'
```

### 2. فعال‌سازی عضو
```bash
curl -X PATCH \
  http://localhost:4000/api/v1/organizations/org-123/members/user-456/activate \
  -H 'Authorization: Bearer <token>'
```

### 3. تغییر نقش
```bash
curl -X PATCH \
  http://localhost:4000/api/v1/organizations/org-123/members/user-456/role \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"role": "TEACHER"}'
```

### 4. حذف عضو
```bash
curl -X DELETE \
  http://localhost:4000/api/v1/organizations/org-123/members/user-456 \
  -H 'Authorization: Bearer <token>'
```

### 5. مشاهده لیست اعضا
```bash
curl -X GET \
  http://localhost:4000/api/v1/organizations/org-123/members \
  -H 'Authorization: Bearer <token>'
```

## تست‌ها

### تست‌های Unit
- **فایل**: `organizations.service.spec.ts`
- **تعداد**: 28 تست
- **وضعیت**: ✅ همه تست‌ها پاس شدند

**دسته‌بندی تست‌ها**:
- `create`: 3 تست
- `findAll`: 3 تست
- `findOne`: 2 تست
- `findBySlug`: 1 تست
- `update`: 2 تست
- `remove`: 1 تست
- `getMembers`: 1 تست
- `removeMember`: 4 تست
- `suspendMember`: 3 تست
- `activateMember`: 2 تست
- `updateMemberRole`: 4 تست
- `updateMemberStatus`: 2 تست

### تست‌های E2E
- **فایل**: `organizations-member-management.e2e-spec.ts`
- **شامل**:
  - تست لیست اعضا
  - تست تعلیق عضو
  - تست فعال‌سازی عضو
  - تست تغییر نقش
  - تست تغییر وضعیت
  - تست حذف عضو
  - تست اعتبارسنجی‌ها

### اجرای تست‌ها

```bash
# اجرای تست‌های Unit
npm test -- organizations.service.spec.ts

# اجرای تست‌های E2E
npm run test:e2e -- organizations-member-management.e2e-spec.ts
```

## امنیت و دسترسی‌ها

### RBAC (Role-Based Access Control)
- همه endpointها محافظت شده با `JwtAuthGuard` و `RolesGuard`
- فقط `SUPER_ADMIN` و `ORG_ADMIN` دسترسی دارند
- `SUPER_ADMIN` دسترسی کامل به همه سازمان‌ها دارد
- `ORG_ADMIN` فقط به سازمان خودش دسترسی دارد

### محدودیت‌ها
1. ادمین نمی‌تواند خودش را حذف/تعلیق/تغییر دهد
2. عضو باید متعلق به همان سازمان باشد
3. فقط `SUPER_ADMIN` می‌تواند نقش `SUPER_ADMIN` را تخصیص دهد

## بهبودهای آینده (اختیاری)

- [ ] افزودن Audit Log برای تمام عملیات مدیریت اعضا
- [ ] اعلان ایمیل/پیامک به عضو پس از تعلیق/فعال‌سازی
- [ ] امکان bulk operations (تعلیق/حذف چندین عضو همزمان)
- [ ] تاریخچه تغییرات نقش و وضعیت اعضا
- [ ] محدودیت تعداد ادمین‌های سازمان

## مشکلات شناخته شده
هیچ مشکل شناخته شده‌ای وجود ندارد.

## نتیجه‌گیری
تسک **1.2.4** با موفقیت پیاده‌سازی و تست شده است. تمام ویژگی‌های درخواستی شامل تعلیق، حذف، تغییر نقش و بررسی دسترسی‌های مدیریتی به صورت کامل پیاده‌سازی شده و با 28 تست Unit کاورد شده‌اند.
