# پیاده‌سازی ورود با گوگل (Google OAuth 2.0)

## خلاصه

این سند پیاده‌سازی کامل ورود و ثبت‌نام با Google OAuth 2.0 را در پلتفرم آزمونیار توضیح می‌دهد.

## وضعیت پیاده‌سازی

✅ **تکمیل شده**

### کارهای انجام شده

1. ✅ Google OAuth Strategy با `passport-google-oauth20`
2. ✅ GoogleAuthGuard برای محافظت از endpoints
3. ✅ Endpoints: `/auth/google` و `/auth/google/callback`
4. ✅ متد `googleLogin` در AuthService با قابلیت:
   - ورود کاربران موجود
   - ثبت‌نام خودکار کاربران جدید
   - افزودن `googleId` به کاربران موجود
   - ذخیره آواتار کاربر
   - تولید JWT tokens
5. ✅ فیلد `googleId` در Prisma schema
6. ✅ تست‌های Unit کامل برای Controller
7. ✅ مستندسازی

## معماری

### 1. Schema Database

```prisma
model User {
  id          String     @id @default(uuid())
  email       String?    @unique
  phone       String?    @unique
  password    String?
  googleId    String?    @unique  // ← فیلد OAuth
  name        String
  avatarUrl   String?
  role        UserRole   @default(STUDENT)
  status      UserStatus @default(ACTIVE)
  // ... سایر فیلدها
  
  @@index([googleId])
}
```

### 2. Google Strategy

```typescript
// src/modules/auth/strategies/google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken, refreshToken, profile, done): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    done(null, user);
  }
}
```

### 3. API Endpoints

#### ۳.۱ شروع فرآیند OAuth

```http
GET /api/v1/auth/google
```

- هدایت به صفحه ورود گوگل
- درخواست مجوز email و profile

#### ۳.۲ Callback URL

```http
GET /api/v1/auth/google/callback
```

**Response:**
- Redirect به Frontend با query parameters:
  - `access_token`: JWT access token
  - `refresh_token`: JWT refresh token

مثال:
```
http://localhost:3000/auth/callback?access_token=eyJ...&refresh_token=eyJ...
```

### 4. جریان کاری (Flow)

```
┌─────────┐                 ┌──────────┐                ┌────────┐
│ کاربر   │                 │  Backend │                │ Google │
└────┬────┘                 └────┬─────┘                └───┬────┘
     │                           │                          │
     │  کلیک "ورود با گوگل"      │                          │
     ├──────────────────────────▶│                          │
     │                           │                          │
     │                           │  درخواست احراز هویت       │
     │                           ├─────────────────────────▶│
     │                           │                          │
     │                      ◀────┤  صفحه ورود گوگل          │
     │◀──────────────────────────┤                          │
     │                           │                          │
     │  وارد کردن اطلاعات         │                          │
     ├──────────────────────────────────────────────────────▶│
     │                           │                          │
     │                           │  ◀───── Auth Code ───────┤
     │                           ◀──────────────────────────┤
     │                           │                          │
     │                           │  Exchange Code for Token │
     │                           ├─────────────────────────▶│
     │                           │  ◀───── User Info ───────┤
     │                           │                          │
     │                           │  googleLogin()           │
     │                           │  - Check existing user   │
     │                           │  - Create or update user │
     │                           │  - Generate JWT tokens   │
     │                           │                          │
     │  Redirect + Tokens        │                          │
     │◀──────────────────────────┤                          │
     │                           │                          │
```

### 5. منطق ثبت‌نام/ورود

```typescript
async googleLogin(googleUser) {
  // ۱. جستجوی کاربر بر اساس ایمیل
  let user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (user) {
    // ۲.الف کاربر موجود است
    
    // بررسی وضعیت
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری غیرفعال است');
    }

    // افزودن googleId اگر وجود ندارد
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }

    // به‌روزرسانی lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  } else {
    // ۲.ب کاربر جدید - ثبت‌نام خودکار
    const fullName = `${googleUser.firstName} ${googleUser.lastName}`.trim();
    
    user = await prisma.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.googleId,
        name: fullName || 'کاربر گوگل',
        avatarUrl: googleUser.picture,
        status: 'ACTIVE',
        // password = null چون از Google استفاده می‌کند
      },
    });
  }

  // ۳. تولید JWT tokens
  return this.generateTokens(user);
}
```

### 6. امنیت

#### ۶.۱ بررسی‌های امنیتی

- ✅ بررسی وضعیت کاربر (ACTIVE/SUSPENDED)
- ✅ Normalization ایمیل به lowercase
- ✅ Token Rotation برای refresh tokens
- ✅ TTL مناسب برای tokens
- ✅ ذخیره metadata در Redis

#### ۶.۲ سناریوهای امنیتی

**سناریو ۱: حساب تعلیق‌شده**
```typescript
if (user.status !== 'ACTIVE') {
  throw new UnauthorizedException('حساب کاربری غیرفعال است');
}
```

**سناریو ۲: ایمیل تکراری**
- اگر کاربری با ایمیل وجود داشته باشد، ورود انجام می‌شود
- اگر کاربر قبلاً با ایمیل/موبایل ثبت‌نام کرده، `googleId` اضافه می‌شود

## تنظیمات

### 1. متغیرهای محیطی (.env)

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# Frontend URL برای redirect پس از OAuth
FRONTEND_URL=http://localhost:3000
```

### 2. دریافت Google OAuth Credentials

#### ۲.۱ ایجاد پروژه در Google Cloud Console

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. یک پروژه جدید بسازید یا پروژه موجود را انتخاب کنید
3. به **APIs & Services** > **Credentials** بروید
4. روی **Create Credentials** کلیک کنید و **OAuth client ID** را انتخاب کنید

#### ۲.۲ تنظیم OAuth consent screen

1. **User Type**: External (یا Internal برای G Suite)
2. **App name**: آزمونیار
3. **User support email**: your-email@example.com
4. **Developer contact information**: your-email@example.com
5. **Scopes**: `email` و `profile`
6. ذخیره کنید

#### ۲.۳ ایجاد OAuth 2.0 Client ID

1. **Application type**: Web application
2. **Name**: Azmoonyar Web App
3. **Authorized JavaScript origins**:
   - `http://localhost:4000`
   - `http://localhost:3000`
   - `https://yourdomain.com` (production)
4. **Authorized redirect URIs**:
   - `http://localhost:4000/api/v1/auth/google/callback`
   - `https://yourdomain.com/api/v1/auth/google/callback` (production)
5. ذخیره کنید

#### ۲.۴ کپی Credentials

- **Client ID**: کپی کنید و در `.env` به عنوان `GOOGLE_CLIENT_ID` قرار دهید
- **Client Secret**: کپی کنید و در `.env` به عنوان `GOOGLE_CLIENT_SECRET` قرار دهید

### 3. تنظیم Production

```env
# Production
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_CALLBACK_URL=https://api.azmoonyar.ir/api/v1/auth/google/callback
FRONTEND_URL=https://azmoonyar.ir
```

## نحوه استفاده

### 1. در Frontend (React/Next.js)

```typescript
// صفحه ورود
export function LoginPage() {
  const handleGoogleLogin = () => {
    // هدایت به endpoint شروع OAuth
    window.location.href = 'http://localhost:4000/api/v1/auth/google';
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>
        <GoogleIcon />
        ورود با گوگل
      </button>
    </div>
  );
}

// صفحه callback
export function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      // ذخیره tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // هدایت به داشبورد
      router.push('/dashboard');
    }
  }, []);

  return <div>در حال ورود...</div>;
}
```

### 2. استفاده از Tokens

```typescript
// درخواست به API با Access Token
const response = await fetch('http://localhost:4000/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

## تست

### 1. اجرای تست‌های Unit

```bash
cd d:\Projects\azmoonsaz_kiro\azmoonyar\apps\api
npm test -- auth.controller.spec.ts
```

### 2. تست دستی

#### ۲.۱ تست با مرورگر

1. مطمئن شوید backend در حال اجرا است:
```bash
npm run dev
```

2. در مرورگر به آدرس زیر بروید:
```
http://localhost:4000/api/v1/auth/google
```

3. وارد حساب گوگل خود شوید

4. پس از تأیید، به frontend redirect می‌شوید با tokens

#### ۲.۲ تست با cURL (برای دریافت user info)

```bash
# دریافت اطلاعات کاربر با access token
curl -X GET http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. سناریوهای تست

✅ **سناریو ۱**: کاربر جدید با گوگل
- نتیجه: ثبت‌نام خودکار + تولید tokens

✅ **سناریو ۲**: کاربر موجود (با ایمیل) ورود با گوگل
- نتیجه: افزودن `googleId` + ورود + تولید tokens

✅ **سناریو ۳**: کاربر موجود با `googleId` ورود می‌کند
- نتیجه: ورود مستقیم + تولید tokens

✅ **سناریو ۴**: کاربر تعلیق‌شده ورود با گوگل
- نتیجه: خطا `401 Unauthorized`

✅ **سناریو ۵**: نام خالی از گوگل
- نتیجه: نام پیش‌فرض "کاربر گوگل"

## خطایابی (Troubleshooting)

### مشکل ۱: خطای "redirect_uri_mismatch"

**علت**: URL callback در Google Console با URL واقعی مطابقت ندارد

**راه‌حل**:
1. به Google Cloud Console بروید
2. Credentials > OAuth 2.0 Client IDs را بررسی کنید
3. مطمئن شوید این URL دقیقاً اضافه شده:
   ```
   http://localhost:4000/api/v1/auth/google/callback
   ```

### مشکل ۲: خطای "invalid_client"

**علت**: Client ID یا Client Secret نادرست است

**راه‌حل**:
1. از Google Console دوباره credentials را کپی کنید
2. در فایل `.env` بازبینی کنید
3. سرور را restart کنید

### مشکل ۳: کاربر به frontend redirect نمی‌شود

**علت**: `FRONTEND_URL` در `.env` تنظیم نشده

**راه‌حل**:
```env
FRONTEND_URL=http://localhost:3000
```

### مشکل ۴: خطای Prisma "googleId does not exist"

**علت**: Prisma Client به‌روز نیست

**راه‌حل**:
```bash
npx prisma generate
```

## بهبودهای آینده

### فاز بعدی (اختیاری)

- [ ] پشتیبانی از GitHub OAuth
- [ ] پشتیبانی از Apple Sign In
- [ ] پشتیبانی از Microsoft OAuth
- [ ] اتصال چند حساب OAuth به یک کاربر
- [ ] نمایش لیست حساب‌های متصل در پروفایل
- [ ] قطع ارتباط با حساب OAuth

## مستندات مرجع

- [Passport Google OAuth20](https://www.passportjs.org/packages/passport-google-oauth20/)
- [Google Identity Platform](https://developers.google.com/identity)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)

## ملاحظات امنیتی

⚠️ **نکات مهم**:

1. **هرگز** `GOOGLE_CLIENT_SECRET` را commit نکنید
2. در production حتماً HTTPS استفاده کنید
3. `FRONTEND_URL` را validate کنید تا از Open Redirect جلوگیری شود
4. Rate limiting برای OAuth endpoints تنظیم کنید
5. Refresh tokens را به‌طور دوره‌ای rotate کنید
6. Session management را پیاده‌سازی کنید

## پایان

پیاده‌سازی Google OAuth با موفقیت تکمیل شد! ✅

برای سوالات یا مشکلات، به مستندات یا تیم توسعه مراجعه کنید.
