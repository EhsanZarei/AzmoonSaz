# نمونه استفاده از Rate Limiting

این فایل نحوه استفاده از سیستم Rate Limiting را در عمل نشان می‌دهد.

## سناریوی واقعی

فرض کنید کاربری با شماره `09123456789` می‌خواهد کد OTP دریافت کند.

### درخواست اول

```bash
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**پاسخ (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "remaining": 4,
  "resetTime": "2026-04-01T10:15:00.000Z"
}
```

✅ **توضیح**: درخواست موفق. کاربر هنوز ۴ درخواست دیگر در این ۱۵ دقیقه می‌تواند بدهد.

---

### درخواست دوم (بلافاصله)

```bash
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**پاسخ (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "remaining": 3,
  "resetTime": "2026-04-01T10:15:00.000Z"
}
```

✅ **توضیح**: درخواست موفق. هنوز ۳ درخواست باقی مانده.

---

### درخواست سوم تا پنجم

همینطور ادامه می‌دهیم و `remaining` کاهش می‌یابد:

- **سوم**: `remaining: 2`
- **چهارم**: `remaining: 1`
- **پنجم**: `remaining: 0`

---

### درخواست ششم (بعد از پنج درخواست)

```bash
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**پاسخ (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 14 دقیقه و 32 ثانیه دیگر تلاش کنید",
  "retryAfter": 872,
  "resetTime": "2026-04-01T10:15:00.000Z"
}
```

❌ **توضیح**: حد مجاز رسیده. کاربر باید ۱۴ دقیقه و ۳۲ ثانیه صبر کند.

---

## نحوه کار در Backend

### 1. بررسی Redis

هنگامی که درخواست اول می‌آید:

```redis
GET rate_limit:otp:09123456789
# نتیجه: null (کلید وجود ندارد)

INCR rate_limit:otp:09123456789
# نتیجه: 1

EXPIRE rate_limit:otp:09123456789 900
# تنظیم TTL به 900 ثانیه (15 دقیقه)
```

### 2. درخواست‌های بعدی

```redis
GET rate_limit:otp:09123456789
# نتیجه: "3" (سه درخواست قبلی)

# اگر count < 5:
INCR rate_limit:otp:09123456789
# نتیجه: 4

# اگر count >= 5:
# رد درخواست و محاسبه زمان باقیمانده
TTL rate_limit:otp:09123456789
# نتیجه: 872 (ثانیه باقیمانده)
```

### 3. پس از ۱۵ دقیقه

```redis
GET rate_limit:otp:09123456789
# نتیجه: null (Redis به صورت خودکار key را حذف کرده)
```

کاربر می‌تواند دوباره درخواست بدهد.

---

## جداسازی بین کاربران

دو کاربر مختلف rate limit مستقل دارند:

### کاربر اول: `09123456789`
```bash
# 5 درخواست موفق
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -d '{"phone": "09123456789"}'
# همه موفق

# درخواست ششم
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -d '{"phone": "09123456789"}'
# ❌ 400 Bad Request
```

### کاربر دوم: `09987654321`
```bash
# این کاربر هنوز می‌تواند درخواست بدهد
curl -X POST http://localhost:4000/api/v1/auth/send-otp \
  -d '{"phone": "09987654321"}'
# ✅ 200 OK
```

---

## پیام‌های مختلف خطا

### فقط دقیقه
```json
{
  "message": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 5 دقیقه دیگر تلاش کنید",
  "retryAfter": 300
}
```

### دقیقه و ثانیه
```json
{
  "message": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 3 دقیقه و 45 ثانیه دیگر تلاش کنید",
  "retryAfter": 225
}
```

### فقط ثانیه
```json
{
  "message": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 42 ثانیه دیگر تلاش کنید",
  "retryAfter": 42
}
```

---

## استفاده از Response در Frontend

### مدیریت `remaining`

```typescript
// Frontend: نمایش تعداد درخواست‌های باقیمانده
const response = await fetch('/auth/send-otp', {
  method: 'POST',
  body: JSON.stringify({ phone })
});

const data = await response.json();

if (response.ok) {
  console.log(`کد ارسال شد. ${data.remaining} درخواست دیگر باقی مانده.`);
  
  // نمایش هشدار اگر تعداد کم باشد
  if (data.remaining <= 1) {
    alert('شما فقط یک بار دیگر می‌توانید کد درخواست کنید!');
  }
}
```

### مدیریت خطای Rate Limit

```typescript
// Frontend: نمایش زمان باقیمانده به کاربر
if (response.status === 400) {
  const error = await response.json();
  
  if (error.retryAfter) {
    // تبدیل ثانیه به دقیقه و ثانیه
    const minutes = Math.floor(error.retryAfter / 60);
    const seconds = error.retryAfter % 60;
    
    // نمایش تایمر معکوس
    startCountdown(error.retryAfter);
    
    // یا فقط نمایش پیام
    alert(error.message);
  }
}
```

### Countdown Timer

```typescript
function startCountdown(seconds: number) {
  let remaining = seconds;
  
  const timer = setInterval(() => {
    remaining--;
    
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    
    updateUI(`${mins}:${secs.toString().padStart(2, '0')}`);
    
    if (remaining <= 0) {
      clearInterval(timer);
      enableRetryButton();
    }
  }, 1000);
}
```

---

## چک کردن وضعیت در Redis

برای debugging یا monitoring:

```bash
# اتصال به Redis
redis-cli

# چک کردن تعداد فعلی
GET rate_limit:otp:09123456789

# چک کردن زمان باقیمانده
TTL rate_limit:otp:09123456789

# پاک کردن rate limit (فقط برای تست)
DEL rate_limit:otp:09123456789

# لیست همه rate limit keys
KEYS rate_limit:otp:*
```

---

## Monitoring در Production

### آمار Rate Limit Hits

```typescript
// اضافه کردن counter برای monitoring
await redis.incr('metrics:rate_limit:otp:hits');
await redis.incr(`metrics:rate_limit:otp:hits:${date}`);

// دریافت آمار
const totalHits = await redis.get('metrics:rate_limit:otp:hits');
const todayHits = await redis.get(`metrics:rate_limit:otp:hits:${today}`);
```

### Alert برای حملات

```typescript
// اگر یک IP بیش از حد تلاش کند
const ipHits = await redis.incr(`rate_limit:ip:${ipAddress}`);

if (ipHits > 50) {
  // ارسال alert
  logger.warn(`Suspicious activity from IP: ${ipAddress}`);
  notifySecurityTeam(ipAddress);
}
```

---

## خلاصه

✅ کاربر می‌تواند **۵ بار** در **۱۵ دقیقه** کد OTP درخواست کند  
✅ پس از رسیدن به حد، پیام فارسی با زمان دقیق نمایش داده می‌شود  
✅ هر کاربر rate limit مستقل دارد  
✅ پس از ۱۵ دقیقه، محدودیت به صورت خودکار بازنشانی می‌شود  
✅ سیستم از حملات DDoS و Brute Force محافظت می‌کند  
