import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // ثانیه تا بازنشانی
}

@Injectable()
export class RateLimitService {
  constructor(
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * بررسی و اعمال Rate Limiting برای OTP
   * @param phone شماره موبایل
   * @param limit حداکثر تعداد درخواست (پیش‌فرض: ۵)
   * @param windowSeconds بازه زمانی به ثانیه (پیش‌فرض: ۹۰۰ = ۱۵ دقیقه)
   * @returns نتیجه Rate Limit
   */
  async checkOtpRateLimit(
    phone: string,
    limit: number = 5,
    windowSeconds: number = 900, // 15 دقیقه
  ): Promise<RateLimitResult> {
    const key = `rate_limit:otp:${phone}`;
    
    // دریافت تعداد فعلی درخواست‌ها
    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      // بررسی زمان باقیمانده تا بازنشانی
      const ttl = await this.redis.ttl(key);
      const resetTime = new Date(Date.now() + ttl * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: ttl,
      };
    }

    // افزایش شمارنده
    const newCount = await this.redis.incr(key);
    
    // اگر اولین درخواست است، تنظیم TTL
    if (newCount === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    // محاسبه زمان بازنشانی
    const ttl = await this.redis.ttl(key);
    const resetTime = new Date(Date.now() + ttl * 1000);

    return {
      allowed: true,
      remaining: Math.max(0, limit - newCount),
      resetTime,
    };
  }

  /**
   * بررسی Rate Limit برای تأیید OTP
   * محدودیت: ۱۰ تلاش در ۱۵ دقیقه
   */
  async checkOtpVerifyRateLimit(phone: string): Promise<RateLimitResult> {
    return this.checkOtpRateLimit(phone, 10, 900);
  }

  /**
   * ساخت پیام خطای فارسی با زمان باقیمانده
   */
  getRateLimitErrorMessage(result: RateLimitResult): string {
    if (!result.retryAfter) {
      return 'تعداد درخواست‌های شما بیش از حد مجاز است';
    }

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

  /**
   * پاک کردن Rate Limit برای یک شماره (برای استفاده در تست‌ها)
   */
  async clearOtpRateLimit(phone: string): Promise<void> {
    await this.redis.del(`rate_limit:otp:${phone}`);
  }

  /**
   * دریافت وضعیت فعلی Rate Limit
   */
  async getOtpRateLimitStatus(phone: string): Promise<{
    count: number;
    limit: number;
    remaining: number;
    resetTime: Date | null;
  }> {
    const key = `rate_limit:otp:${phone}`;
    const limit = 5;
    
    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    const ttl = await this.redis.ttl(key);
    
    return {
      count,
      limit,
      remaining: Math.max(0, limit - count),
      resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
    };
  }

  /**
   * Rate Limiting با الگوریتم Sliding Window
   * دقیق‌تر از Fixed Window ساده
   */
  async checkSlidingWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // استفاده از Sorted Set در Redis
    const sortedSetKey = `rate_limit:sliding:${key}`;

    // حذف درخواست‌های قدیمی
    await this.redis.zremrangebyscore(sortedSetKey, 0, windowStart);

    // شمارش درخواست‌های فعلی
    const count = await this.redis.zcard(sortedSetKey);

    if (count >= limit) {
      // دریافت زمان قدیمی‌ترین درخواست
      const oldest = await this.redis.zrange(sortedSetKey, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1], 10) : now;
      const retryAfter = Math.ceil((oldestTimestamp + windowSeconds * 1000 - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(oldestTimestamp + windowSeconds * 1000),
        retryAfter: Math.max(0, retryAfter),
      };
    }

    // افزودن درخواست جدید
    const requestId = `${now}:${Math.random()}`;
    await this.redis.zadd(sortedSetKey, now, requestId);
    
    // تنظیم TTL برای پاکسازی خودکار
    await this.redis.expire(sortedSetKey, windowSeconds + 60);

    // محاسبه زمان بازنشانی (قدیمی‌ترین + window)
    const oldest = await this.redis.zrange(sortedSetKey, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1], 10) : now;
    const resetTime = new Date(oldestTimestamp + windowSeconds * 1000);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetTime,
    };
  }
}
