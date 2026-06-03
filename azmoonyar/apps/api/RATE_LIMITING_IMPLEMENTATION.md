# پیاده‌سازی Rate Limiting برای OTP

## خلاصه

این سند جزئیات پیاده‌سازی Rate Limiting برای درخواست‌های OTP را شرح می‌دهد که طبق تسک **1.1.6** از برنامه MVP انجام شده است.

## الزامات

- **محدودیت**: حداکثر ۵ درخواست OTP در هر ۱۵ دقیقه برای هر شماره موبایل
- **ذخیره‌سازی**: استفاده از Redis برای ذخیره تعداد تلاش‌ها
- **پیام خطا**: نمایش پیام فارسی با زمان باقیمانده تا بازنشانی
- **جداسازی**: هر شماره موبایل rate limit مستقل دارد

## معماری

### 1. RateLimitService

سرویس اصلی که منطق rate limiting را مدیریت می‌کند:

```typescript
// مسیر: src/modules/auth/rate-limit.service.ts

@Injectable()
export class RateLimitService {
  async checkOtpRateLimit(
    phone: string,
    limit: number = 5,
    windowSeconds: number = 900
  ): Promise<RateLimitResult>
}
```

#### ویژگی‌های کلیدی:

- **Fixed Window Algorithm**: استفاده از الگوریتم پنجره ثابت برای سادگی و کارایی
- **Redis Keys**: کلیدها با فرمت `rate_limit:otp:{phone}` ذخیره می‌شوند
- **TTL خودکار**: اولین درخواست TTL را روی ۹۰۰ ثانیه (۱۵ دقیقه) تنظیم می‌کند
- **Thread-safe**: استفاده از `INCR` atomic operation در Redis

### 2. یکپارچگی با AuthService

```typescript
// مسیر: src/modules/auth/auth.service.ts

async sendOtp(phone: string) {
  // بررسی Rate Limit
  const rateLimitResult = await this.rateLimitService.checkOtpRateLimit(phone);
  
  if (!rateLimitResult.allowed) {
    const errorMessage = this.rateLimitService.getRateLimitErrorMessage(rateLimitResult);
    throw new BadRequestException({
      message: errorMessage,
      retryAfter: rateLimitResult.retryAfter,
      resetTime: rateLimitResult.resetTime,
    });
  }

  // ادامه ارسال OTP...
}
```

### 3. Response Format

#### موفق (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "remaining": 3,
  "resetTime": "2026-04-01T10:15:00.000Z"
}
```

#### خطای Rate Limit (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 14 دقیقه و 23 ثانیه دیگر تلاش کنید",
  "retryAfter": 863,
  "resetTime": "2026-04-01T10:15:00.000Z"
}
```

## جزئیات فنی

### الگوریتم Fixed Window

1. **اولین درخواست**:
   - `INCR rate_limit:otp:{phone}` → نتیجه: 1
   - `EXPIRE rate_limit:otp:{phone} 900` → تنظیم TTL

2. **درخواست‌های بعدی**:
   - `GET rate_limit:otp:{phone}` → دریافت تعداد فعلی
   - اگر `count >= limit`: رد درخواست با زمان باقیمانده
   - اگر `count < limit`: `INCR` و ادامه

3. **پس از ۱۵ دقیقه**:
   - Redis به صورت خودکار key را حذف می‌کند
   - درخواست بعدی مثل درخواست اول عمل می‌کند

### پیام‌های خطای فارسی

سرویس به صورت هوشمند پیام‌های فارسی تولید می‌کند:

```typescript
getRateLimitErrorMessage(result: RateLimitResult): string {
  const minutes = Math.floor(result.retryAfter / 60);
  const seconds = result.retryAfter % 60;

  if (minutes > 0 && seconds > 0) {
    return `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${minutes} دقیقه و ${seconds} ثانیه دیگر تلاش کنید`;
  } else if (minutes > 0) {
    return `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${minutes} دقیقه دیگر تلاش کنید`;
  } else {
    return `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${seconds} ثانیه دیگر تلاش کنید`;
  }
}
```

### Rate Limit برای تأیید OTP

علاوه بر ارسال OTP، محدودیت جداگانه‌ای برای تأیید OTP نیز پیاده‌سازی شده:

```typescript
async checkOtpVerifyRateLimit(phone: string): Promise<RateLimitResult> {
  return this.checkOtpRateLimit(phone, 10, 900); // 10 تلاش در 15 دقیقه
}
```

این از حملات Brute Force روی کد OTP جلوگیری می‌کند.

## تست‌ها

### Unit Tests
- ✅ ۲۳ تست در `rate-limit.service.spec.ts`
- پوشش کامل تمام سناریوها
- Mock کردن Redis برای سرعت بالا

### Integration Tests
- ✅ تست‌های end-to-end در `rate-limit.integration.spec.ts`
- تست با Redis واقعی
- بررسی concurrent requests
- تست edge cases

### نمونه اجرای تست:

```bash
# Unit Tests
npm test -- rate-limit.service.spec.ts

# Integration Tests
npm test -- rate-limit.integration.spec.ts
```

## الگوریتم Sliding Window (پیشرفته)

سرویس همچنین پیاده‌سازی Sliding Window را نیز ارائه می‌دهد که دقیق‌تر است:

```typescript
async checkSlidingWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult>
```

### مزایا:
- دقت بالاتر در محدودسازی
- جلوگیری از burst attacks در مرز پنجره‌ها
- استفاده از Redis Sorted Sets

### نحوه کار:
1. حذف درخواست‌های قدیمی‌تر از window با `ZREMRANGEBYSCORE`
2. شمارش درخواست‌های فعلی با `ZCARD`
3. اگر کمتر از حد: افزودن درخواست جدید با `ZADD`
4. محاسبه زمان بازنشانی بر اساس قدیمی‌ترین درخواست

## استفاده در Production

### متغیرهای محیطی

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Rate Limiting (optional - defaults shown)
OTP_RATE_LIMIT=5
OTP_RATE_WINDOW=900
```

### Monitoring

برای نظارت بر rate limiting:

```typescript
// دریافت وضعیت فعلی
const status = await rateLimitService.getOtpRateLimitStatus(phone);
console.log(`Count: ${status.count}/${status.limit}, Remaining: ${status.remaining}`);
```

### پاکسازی دستی (فقط برای تست یا support)

```typescript
// پاک کردن rate limit برای یک کاربر
await rateLimitService.clearOtpRateLimit(phone);
```

## امنیت

### محافظت در برابر حملات

1. **DDoS Protection**: Rate limiting از حملات DDoS روی endpoint جلوگیری می‌کند
2. **Brute Force**: محدودیت تعداد تلاش‌ها از brute force جلوگیری می‌کند
3. **Resource Exhaustion**: جلوگیری از مصرف بیش از حد منابع SMS gateway

### Best Practices

- ✅ استفاده از Redis برای سرعت بالا
- ✅ TTL خودکار برای پاکسازی داده‌های قدیمی
- ✅ جداسازی rate limit بین کاربران مختلف
- ✅ پیام‌های خطای واضح و کاربرپسند
- ✅ اطلاع‌رسانی زمان بازنشانی به کاربر

## مقایسه با استانداردها

### OWASP Recommendations
- ✅ Rate limiting روی authentication endpoints
- ✅ پیام‌های خطای عمومی (بدون افشای اطلاعات)
- ✅ لاگ کردن تلاش‌های مشکوک

### RFC 6585 (HTTP Status Code 429)
- ⚠️ استفاده از 400 به جای 429 (برای سازگاری با کد موجود)
- ✅ ارائه `Retry-After` در response

## آینده و بهبودهای ممکن

### فاز بعدی:
1. **Distributed Rate Limiting**: برای چند instance در production
2. **Dynamic Rate Limits**: بر اساس رفتار کاربر
3. **IP-based Rate Limiting**: محدودیت اضافی بر اساس IP
4. **Redis Cluster**: برای مقیاس‌پذیری بیشتر

### Monitoring و Alerting:
1. افزودن metrics برای تعداد rate limit hits
2. Alert برای تلاش‌های بیش از حد از یک IP
3. Dashboard برای نمایش آمار real-time

## مستندات مرتبط

- [Design Document](./design.md) - بخش ۶.۲ امنیت احراز هویت
- [Requirements](./requirements.md) - بخش ۵.۲ امنیت احراز هویت
- [Tasks](./tasks.md) - تسک 1.1.6

## نتیجه‌گیری

پیاده‌سازی rate limiting برای OTP با موفقیت تکمیل شده و شامل:

- ✅ محدودیت ۵ درخواست در ۱۵ دقیقه
- ✅ استفاده از Redis برای ذخیره‌سازی
- ✅ پیام‌های خطای فارسی با زمان باقیمانده
- ✅ تست‌های کامل unit و integration
- ✅ مستندات جامع

سیستم آماده استفاده در production است.
