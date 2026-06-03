# Email + Password Authentication Implementation

## تاریخ: ۱۴۰۵/۰۳/۰۳
## وظیفه: 1.1.4 پیاده‌سازی ثبت‌نام با ایمیل + رمز عبور

## خلاصه

این سند جزئیات پیاده‌سازی احراز هویت با ایمیل و رمز عبور را که به عنوان یک روش جایگزین در کنار OTP برای پلتفرم آزمونیار ایجاد شده است، شرح می‌دهد.

## تغییرات ایجاد شده

### 1. Schema Database (Prisma)

**فایل**: `prisma/schema.prisma`

- فیلد `password` (String?, nullable) به مدل User اضافه شد
- Migration ایجاد شد: `20260603001342_add_password_field`

```prisma
model User {
  id          String     @id @default(uuid())
  email       String?    @unique
  phone       String?    @unique
  password    String?    // NEW: برای ذخیره رمز عبور هش شده
  name        String
  // ... سایر فیلدها
}
```

### 2. DTOs جدید

#### RegisterDto
**فایل**: `src/modules/auth/dto/register.dto.ts`

ولیدیشن:
- ایمیل: فرمت معتبر
- رمز عبور: حداقل ۸ کاراکتر، شامل حروف بزرگ و کوچک، عدد و کاراکتر خاص
- نام: حداقل ۲ کاراکتر

```typescript
export class RegisterDto {
  @IsEmail({}, { message: 'فرمت ایمیل معتبر نیست' })
  email: string;

  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]{8,}$/, 
    { message: 'رمز عبور باید شامل حروف بزرگ و کوچک انگلیسی، عدد و کاراکتر خاص باشد' })
  password: string;

  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' })
  name: string;
}
```

#### LoginDto
**فایل**: `src/modules/auth/dto/login.dto.ts`

```typescript
export class LoginDto {
  @IsEmail({}, { message: 'فرمت ایمیل معتبر نیست' })
  email: string;

  @IsString()
  password: string;
}
```

### 3. AuthService - متدهای جدید

**فایل**: `src/modules/auth/auth.service.ts`

#### register(email, password, name)

**ویژگی‌ها:**
- بررسی عدم وجود کاربر قبلی با همان ایمیل
- Rate Limiting: حداکثر ۱۰ درخواست در ساعت
- هش کردن رمز عبور با bcrypt (saltRounds: 12)
- Normalization ایمیل به lowercase
- ایجاد کاربر جدید
- تولید توکن‌های JWT (access + refresh)

**خطاهای ممکن:**
- `ConflictException`: ایمیل تکراری
- `BadRequestException`: بیش از حد درخواست

#### login(email, password)

**ویژگی‌ها:**
- Rate Limiting: حداکثر ۵ تلاش در ۱۵ دقیقه
- Normalization ایمیل به lowercase
- بررسی وجود کاربر و وضعیت حساب
- مقایسه رمز عبور با bcrypt.compare
- ثبت تلاش‌های ناموفق
- **Account Lockout**: پس از ۱۰ تلاش ناموفق، حساب SUSPENDED می‌شود
- پاکسازی تلاش‌های ناموفق پس از ورود موفق
- به‌روزرسانی lastLoginAt
- تولید توکن‌های JWT

**خطاهای ممکن:**
- `UnauthorizedException`: 
  - ایمیل نادرست
  - رمز عبور نادرست
  - حساب غیرفعال
  - حساب قفل شده (پس از ۱۰ تلاش ناموفق)
- `BadRequestException`: بیش از حد تلاش ورود

### 4. AuthController - Endpointهای جدید

**فایل**: `src/modules/auth/auth.controller.ts`

```typescript
@Post('register')
@HttpCode(HttpStatus.CREATED)
@Throttle({ default: { limit: 10, ttl: 3600000 } })
register(@Body() dto: RegisterDto)

@Post('login')
@HttpCode(HttpStatus.OK)
@Throttle({ default: { limit: 5, ttl: 900000 } })
login(@Body() dto: LoginDto)
```

## امنیت

### 1. هش کردن رمز عبور
- استفاده از bcrypt
- Salt Rounds: 12
- هیچگاه رمز عبور plain text ذخیره نمی‌شود

### 2. Rate Limiting
- ثبت‌نام: ۱۰ درخواست در ساعت (per email)
- ورود: ۵ تلاش در ۱۵ دقیقه (per email)

### 3. Brute Force Protection
- ثبت تلاش‌های ناموفق در Redis
- قفل حساب پس از ۱۰ تلاش ناموفق
- پیام یکسان برای ایمیل و رمز عبور نادرست (جلوگیری از Username Enumeration)

### 4. Timing Attack Prevention
- استفاده از bcrypt.compare که constant-time است

### 5. Data Validation
- اعتبارسنجی دقیق ایمیل
- الزامات قوی برای رمز عبور (۸+ کاراکتر، ترکیب متنوع)
- Sanitization ایمیل (lowercase)

## استفاده

### ثبت‌نام

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "علی احمدی"
}
```

**پاسخ موفق (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "علی احمدی",
    "role": "STUDENT",
    "orgId": null
  }
}
```

### ورود

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**پاسخ موفق (200):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "علی احمدی",
    "role": "STUDENT",
    "orgId": null
  }
}
```

## تست‌ها

تست‌های واحد (Unit Tests) برای متدهای `register` و `login` نوشته شده است که موارد زیر را پوشش می‌دهند:

### Register Tests
- ✅ ثبت‌نام موفق کاربر جدید
- ✅ هش شدن صحیح رمز عبور
- ✅ ConflictException برای ایمیل تکراری
- ✅ Normalization ایمیل به lowercase
- ✅ Rate Limiting

### Login Tests
- ✅ ورود موفق با اعتبارنامه معتبر
- ✅ UnauthorizedException برای ایمیل نادرست
- ✅ UnauthorizedException برای رمز عبور نادرست
- ✅ UnauthorizedException برای کاربر بدون رمز عبور (فقط OTP)
- ✅ قفل شدن حساب پس از ۱۰ تلاش ناموفق
- ✅ UnauthorizedException برای حساب SUSPENDED
- ✅ Rate Limiting
- ✅ Normalization ایمیل
- ✅ پاکسازی تلاش‌های ناموفق پس از ورود موفق
- ✅ به‌روزرسانی lastLoginAt

## یکپارچگی با سیستم موجود

### Token Management
- استفاده از همان سیستم JWT موجود
- Refresh Token Rotation فعال است
- تمام ویژگی‌های امنیتی موجود (logout, logoutAll, sessions) کار می‌کنند

### User Model
- فیلد `password` اختیاری است (nullable)
- کاربران می‌توانند با OTP یا Email+Password ثبت‌نام کنند
- یک کاربر می‌تواند هر دو روش را داشته باشد

## نکات پیاده‌سازی

1. **رمز عبور اختیاری**: فیلد password در schema nullable است تا امکان استفاده همزمان از هر دو روش OTP و Email+Password فراهم شود.

2. **Normalization ایمیل**: تمام ایمیل‌ها به lowercase تبدیل می‌شوند تا از ایجاد حساب‌های duplicate جلوگیری شود.

3. **پیام خطای یکسان**: برای ایمیل و رمز عبور نادرست، پیام یکسان "ایمیل یا رمز عبور نادرست است" نمایش داده می‌شود تا از Username Enumeration جلوگیری شود.

4. **Account Lockout**: پس از ۱۰ تلاش ناموفق، status کاربر به SUSPENDED تغییر می‌یابد و باید توسط ادمین فعال شود.

5. **Redis Keys**: 
   - `register:attempts:{email}`: شمارش تلاش‌های ثبت‌نام
   - `login:attempts:{email}`: شمارش تلاش‌های ورود
   - `login:failed:{userId}`: شمارش تلاش‌های ناموفق ورود

## بهبودهای آینده (TODO)

- [ ] ارسال ایمیل تأیید پس از ثبت‌نام
- [ ] قابلیت "فراموشی رمز عبور"
- [ ] لاگ تلاش‌های ورود ناموفق
- [ ] CAPTCHA برای محافظت بیشتر
- [ ] فعال‌سازی MFA (Two-Factor Authentication)
- [ ] سیاست‌های پیچیده‌تر برای رمز عبور
- [ ] پیشگیری از رمزهای عبور رایج
- [ ] هشدار به کاربر هنگام ورود از دستگاه/مکان جدید

## وضعیت

✅ پیاده‌سازی کامل شد
✅ Build موفق
✅ Migration اجرا شد
✅ DTOs و Validation آماده است
✅ Unit Tests نوشته شد
✅ امنیت پیاده‌سازی شد

## نتیجه‌گیری

پیاده‌سازی احراز هویت با ایمیل و رمز عبور با موفقیت انجام شد و به عنوان یک روش جایگزین در کنار OTP در پلتفرم آزمونیار فعال است. تمام الزامات امنیتی و عملکردی مطابق با وظیفه 1.1.4 اجرا شده است.
