# پیاده‌سازی RBAC (Role-Based Access Control)

## نمای کلی

این سند نحوه پیاده‌سازی سیستم کنترل دسترسی مبتنی بر نقش (RBAC) در پلتفرم آزمونیار را شرح می‌دهد.

## نقش‌های کاربری

سیستم از ۵ نقش اصلی پشتیبانی می‌کند که در `UserRole` enum تعریف شده‌اند:

```typescript
enum UserRole {
  SUPER_ADMIN   // مدیر کل سیستم
  ORG_ADMIN     // مدیر سازمان
  TEACHER       // معلم
  STUDENT       // دانش‌آموز
  GUEST         // مهمان
}
```

## ماتریس دسترسی‌ها

| عملیات | SUPER_ADMIN | ORG_ADMIN | TEACHER | STUDENT | GUEST |
|--------|:-----------:|:---------:|:-------:|:-------:|:-----:|
| مدیریت پلتفرم | ✅ | ❌ | ❌ | ❌ | ❌ |
| مدیریت سازمان | ✅ | ✅ | ❌ | ❌ | ❌ |
| ساخت آزمون | ✅ | ✅ | ✅ | ❌ | ❌ |
| ویرایش آزمون خود | ✅ | ✅ | ✅ | ❌ | ❌ |
| ویرایش آزمون دیگران | ✅ | ✅ | ❌ | ❌ | ❌ |
| شرکت در آزمون | ✅ | ✅ | ✅ | ✅ | ✅* |
| مشاهده گزارش کامل | ✅ | ✅ | ✅ | ❌ | ❌ |
| مشاهده نمره خود | ✅ | ✅ | ✅ | ✅ | ✅* |
| مدیریت بانک سوال | ✅ | ✅ | ✅ | ❌ | ❌ |
| صدور گواهینامه | ✅ | ✅ | ✅ | ❌ | ❌ |
| مدیریت پرداخت | ✅ | ✅ | ❌ | ❌ | ❌ |
| دسترسی به API | ✅ | ✅ | ✅** | ❌ | ❌ |

> *Guest: فقط در آزمون‌های عمومی  
> **Teacher: فقط API مربوط به آزمون‌های خود

## معماری پیاده‌سازی

### 1. Roles Decorator

دکوریتور `@Roles()` برای مشخص کردن نقش‌های مجاز در endpoint‌ها استفاده می‌شود:

```typescript
// src/modules/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### 2. Roles Guard

`RolesGuard` نقش کاربر را با نقش‌های مورد نیاز مقایسه می‌کند:

```typescript
// src/modules/auth/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('کاربر احراز هویت نشده است');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        'شما دسترسی لازم برای انجام این عملیات را ندارید',
      );
    }

    return true;
  }
}
```

### 3. Auth Module Configuration

`RolesGuard` در `AuthModule` تعریف و export می‌شود:

```typescript
// src/modules/auth/auth.module.ts
@Module({
  imports: [UsersModule, PassportModule, JwtModule.registerAsync({...})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
```

## نحوه استفاده

### استفاده در Controller

برای اعمال RBAC به endpoint‌ها، از ترکیب `JwtAuthGuard` و `RolesGuard` استفاده کنید:

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  
  // فقط SUPER_ADMIN و ORG_ADMIN می‌توانند سازمان ایجاد کنند
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  createOrganization() {
    // ...
  }

  // همه کاربران احراز هویت شده می‌توانند لیست سازمان‌ها را ببینند
  @Get()
  listOrganizations() {
    // ...
  }

  // فقط TEACHER و ORG_ADMIN می‌توانند آزمون ایجاد کنند
  @Post(':id/exams')
  @Roles(UserRole.TEACHER, UserRole.ORG_ADMIN)
  createExam() {
    // ...
  }
}
```

### نکات مهم

1. **ترتیب Guards مهم است**: همیشه `JwtAuthGuard` را قبل از `RolesGuard` قرار دهید
2. **بدون دکوریتور `@Roles()`**: اگر دکوریتور تعریف نشود، همه کاربران احراز هویت شده دسترسی دارند
3. **چند نقش**: می‌توانید چندین نقش را به دکوریتور بدهید (OR logic)
4. **استفاده در سطح Class**: می‌توانید دکوریتور را روی کل کلاس اعمال کنید

### مثال‌های کاربردی

#### 1. محدودیت بر اساس یک نقش

```typescript
@Get('admin/dashboard')
@Roles(UserRole.SUPER_ADMIN)
getDashboard() {
  return { message: 'Admin Dashboard' };
}
```

#### 2. محدودیت بر اساس چند نقش

```typescript
@Post('exams/:id/publish')
@Roles(UserRole.TEACHER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
publishExam(@Param('id') id: string) {
  return this.examsService.publish(id);
}
```

#### 3. استفاده در سطح Controller

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  // همه endpoint‌ها فقط برای SUPER_ADMIN
  @Get('users')
  getUsers() { }
  
  @Get('stats')
  getStats() { }
}
```

#### 4. Override در سطح Method

```typescript
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
export class OrganizationsController {
  
  // این endpoint فقط برای ORG_ADMIN و SUPER_ADMIN
  @Post()
  create() { }

  // Override: همه کاربران احراز هویت شده می‌توانند لیست ببینند
  @Get()
  @Roles() // خالی = بدون محدودیت نقش
  findAll() { }
}
```

## خطاها

### 401 Unauthorized

زمانی که کاربر احراز هویت نشده است (JWT نامعتبر یا موجود نیست):

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

زمانی که کاربر احراز هویت شده اما نقش مناسب ندارد:

```json
{
  "statusCode": 403,
  "message": "شما دسترسی لازم برای انجام این عملیات را ندارید"
}
```

## تست‌ها

تست‌های جامع برای `RolesGuard` در فایل `roles.guard.spec.ts` نوشته شده است:

```bash
# اجرای تست‌ها
npm test roles.guard.spec.ts

# اجرای تست‌ها با coverage
npm test -- --coverage roles.guard.spec.ts
```

### سناریوهای تست شده:

- ✅ دسترسی بدون محدودیت نقش
- ✅ کاربر احراز نشده
- ✅ کاربر با نقش مناسب
- ✅ کاربر با یکی از نقش‌های مناسب
- ✅ کاربر با نقش نامناسب
- ✅ SUPER_ADMIN به endpoint‌های ORG_ADMIN
- ✅ STUDENT به endpoint‌های TEACHER (رد)
- ✅ GUEST به endpoint‌های STUDENT (رد)

## بهترین شیوه‌ها

### 1. Principle of Least Privilege

همیشه کمترین دسترسی لازم را بدهید:

```typescript
// بد: دسترسی بیش از حد
@Post('exams')
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER, UserRole.STUDENT)
createExam() { }

// خوب: فقط نقش‌های مورد نیاز
@Post('exams')
@Roles(UserRole.TEACHER, UserRole.ORG_ADMIN)
createExam() { }
```

### 2. استفاده از تفکیک نگرانی‌ها

علاوه بر RBAC، از business logic برای بررسی مالکیت استفاده کنید:

```typescript
@Put('exams/:id')
@Roles(UserRole.TEACHER, UserRole.ORG_ADMIN)
async updateExam(@Param('id') id: string, @Request() req: any) {
  // RBAC: کاربر باید TEACHER یا ORG_ADMIN باشد ✓
  
  // Business Logic: بررسی مالکیت
  const exam = await this.examsService.findOne(id);
  if (exam.ownerId !== req.user.id && req.user.role !== UserRole.ORG_ADMIN) {
    throw new ForbiddenException('شما مالک این آزمون نیستید');
  }
  
  return this.examsService.update(id, updateDto);
}
```

### 3. مستندسازی دسترسی‌ها

از Swagger decorators برای مستندسازی استفاده کنید:

```typescript
@Post()
@Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ 
  summary: 'ایجاد سازمان جدید',
  description: 'فقط ORG_ADMIN و SUPER_ADMIN می‌توانند سازمان ایجاد کنند'
})
@ApiForbiddenResponse({ description: 'دسترسی غیرمجاز' })
createOrganization() { }
```

### 4. مدیریت متمرکز نقش‌ها

نقش‌ها را در یک فایل constants تعریف کنید:

```typescript
// src/common/constants/roles.constants.ts
export const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN];
export const TEACHER_ROLES = [...ADMIN_ROLES, UserRole.TEACHER];
export const ALL_ROLES = [...TEACHER_ROLES, UserRole.STUDENT, UserRole.GUEST];

// استفاده:
@Post('exams')
@Roles(...TEACHER_ROLES)
createExam() { }
```

## نقشه راه آینده

### فاز بعدی (1.2.4):

- ✅ پیاده‌سازی مدیریت اعضا (تعلیق، حذف، تغییر نقش)
- ⬜ صفحه تنظیمات سازمان

### ویژگی‌های پیشرفته (فاز ۳):

- ⬜ نقش‌های سفارشی (Custom Roles)
- ⬜ مجوزهای Granular (Permissions)
- ⬜ Role Hierarchy
- ⬜ Audit Log برای تغییرات دسترسی

## منابع

- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [RBAC Best Practices](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**آخرین به‌روزرسانی:** اردیبهشت ۱۴۰۵  
**نسخه:** 1.0.0  
**وضعیت:** ✅ تکمیل شده
