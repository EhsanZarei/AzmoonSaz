import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitService } from './rate-limit.service';
import { REDIS_CLIENT } from '../../redis/redis.module';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            get: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            ttl: jest.fn(),
            del: jest.fn(),
            zremrangebyscore: jest.fn(),
            zcard: jest.fn(),
            zrange: jest.fn(),
            zadd: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    redis = module.get(REDIS_CLIENT) as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkOtpRateLimit', () => {
    const phone = '09123456789';
    const limit = 5;
    const windowSeconds = 900; // 15 دقیقه

    it('should allow first request and set TTL', async () => {
      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(1);
      redis.ttl.mockResolvedValue(windowSeconds);

      const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(redis.incr).toHaveBeenCalledWith(`rate_limit:otp:${phone}`);
      expect(redis.expire).toHaveBeenCalledWith(`rate_limit:otp:${phone}`, windowSeconds);
    });

    it('should allow requests within limit', async () => {
      redis.get.mockResolvedValue('3'); // 3 درخواست قبلی
      redis.incr.mockResolvedValue(4);
      redis.ttl.mockResolvedValue(600); // 10 دقیقه باقیمانده

      const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // 5 - 4 = 1
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should deny requests when limit is reached', async () => {
      redis.get.mockResolvedValue('5'); // حد مجاز رسیده
      redis.ttl.mockResolvedValue(300); // 5 دقیقه باقیمانده

      const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(300);
      expect(redis.incr).not.toHaveBeenCalled(); // نباید افزایش پیدا کند
    });

    it('should calculate correct reset time', async () => {
      const ttl = 300; // 5 دقیقه
      redis.get.mockResolvedValue('2');
      redis.incr.mockResolvedValue(3);
      redis.ttl.mockResolvedValue(ttl);

      const beforeCall = Date.now();
      const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);
      const afterCall = Date.now();

      expect(result.resetTime.getTime()).toBeGreaterThanOrEqual(beforeCall + ttl * 1000);
      expect(result.resetTime.getTime()).toBeLessThanOrEqual(afterCall + ttl * 1000 + 100); // 100ms tolerance
    });

    it('should handle exactly at limit', async () => {
      redis.get.mockResolvedValue('4'); // یکی مانده به حد مجاز
      redis.incr.mockResolvedValue(5); // می‌شود 5
      redis.ttl.mockResolvedValue(500);

      const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // دیگر درخواستی باقی نمانده
    });

    it('should handle multiple phones independently', async () => {
      const phone1 = '09123456789';
      const phone2 = '09987654321';

      // تنظیم mock برای phone1
      redis.get.mockImplementation((key) => {
        if (key === `rate_limit:otp:${phone1}`) return Promise.resolve('4');
        if (key === `rate_limit:otp:${phone2}`) return Promise.resolve('1');
        return Promise.resolve(null);
      });

      redis.incr.mockImplementation((key) => {
        if (key === `rate_limit:otp:${phone1}`) return Promise.resolve(5);
        if (key === `rate_limit:otp:${phone2}`) return Promise.resolve(2);
        return Promise.resolve(1);
      });

      redis.ttl.mockResolvedValue(600);

      const result1 = await service.checkOtpRateLimit(phone1, limit, windowSeconds);
      const result2 = await service.checkOtpRateLimit(phone2, limit, windowSeconds);

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });
  });

  describe('checkOtpVerifyRateLimit', () => {
    it('should use correct limit for OTP verification (10 attempts)', async () => {
      const phone = '09123456789';

      redis.get.mockResolvedValue('8');
      redis.incr.mockResolvedValue(9);
      redis.ttl.mockResolvedValue(600);

      const result = await service.checkOtpVerifyRateLimit(phone);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // 10 - 9 = 1
    });

    it('should deny after 10 verification attempts', async () => {
      const phone = '09123456789';

      redis.get.mockResolvedValue('10');
      redis.ttl.mockResolvedValue(400);

      const result = await service.checkOtpVerifyRateLimit(phone);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(400);
    });
  });

  describe('getRateLimitErrorMessage', () => {
    it('should generate correct message for minutes only', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        retryAfter: 180, // 3 دقیقه
      };

      const message = service.getRateLimitErrorMessage(result);

      expect(message).toBe('تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 3 دقیقه دیگر تلاش کنید');
    });

    it('should generate correct message for minutes and seconds', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        retryAfter: 125, // 2 دقیقه و 5 ثانیه
      };

      const message = service.getRateLimitErrorMessage(result);

      expect(message).toBe('تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 2 دقیقه و 5 ثانیه دیگر تلاش کنید');
    });

    it('should generate correct message for seconds only', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        retryAfter: 45, // 45 ثانیه
      };

      const message = service.getRateLimitErrorMessage(result);

      expect(message).toBe('تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً 45 ثانیه دیگر تلاش کنید');
    });

    it('should handle no retryAfter', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
      };

      const message = service.getRateLimitErrorMessage(result);

      expect(message).toBe('تعداد درخواست‌های شما بیش از حد مجاز است');
    });
  });

  describe('clearOtpRateLimit', () => {
    it('should clear rate limit for a phone', async () => {
      const phone = '09123456789';

      redis.del.mockResolvedValue(1);

      await service.clearOtpRateLimit(phone);

      expect(redis.del).toHaveBeenCalledWith(`rate_limit:otp:${phone}`);
    });
  });

  describe('getOtpRateLimitStatus', () => {
    it('should return current status with remaining attempts', async () => {
      const phone = '09123456789';

      redis.get.mockResolvedValue('3');
      redis.ttl.mockResolvedValue(600);

      const status = await service.getOtpRateLimitStatus(phone);

      expect(status.count).toBe(3);
      expect(status.limit).toBe(5);
      expect(status.remaining).toBe(2);
      expect(status.resetTime).toBeInstanceOf(Date);
    });

    it('should return zero count for new phone', async () => {
      const phone = '09123456789';

      redis.get.mockResolvedValue(null);
      redis.ttl.mockResolvedValue(-2); // کلید وجود ندارد

      const status = await service.getOtpRateLimitStatus(phone);

      expect(status.count).toBe(0);
      expect(status.limit).toBe(5);
      expect(status.remaining).toBe(5);
      expect(status.resetTime).toBeNull();
    });

    it('should return null resetTime when TTL is expired', async () => {
      const phone = '09123456789';

      redis.get.mockResolvedValue('2');
      redis.ttl.mockResolvedValue(-1); // کلید بدون TTL (نباید اتفاق بیفتد)

      const status = await service.getOtpRateLimitStatus(phone);

      expect(status.resetTime).toBeNull();
    });
  });

  describe('checkSlidingWindowRateLimit', () => {
    const key = 'test-key';
    const limit = 5;
    const windowSeconds = 900;

    it('should allow first request in sliding window', async () => {
      redis.zremrangebyscore.mockResolvedValue(0);
      redis.zcard.mockResolvedValue(0);
      redis.zadd.mockResolvedValue('OK' as any);
      redis.expire.mockResolvedValue(1);
      redis.zrange.mockResolvedValue([]);

      const result = await service.checkSlidingWindowRateLimit(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(redis.zremrangebyscore).toHaveBeenCalled(); // حذف درخواست‌های قدیمی
      expect(redis.zadd).toHaveBeenCalled(); // افزودن درخواست جدید
    });

    it('should deny request when sliding window is full', async () => {
      const now = Date.now();
      const oldestTimestamp = now - 500000; // 500 ثانیه قبل

      redis.zremrangebyscore.mockResolvedValue(0);
      redis.zcard.mockResolvedValue(5); // حد مجاز رسیده
      redis.zrange.mockResolvedValue([
        `${oldestTimestamp}:123`,
        oldestTimestamp.toString(),
      ]);

      const result = await service.checkSlidingWindowRateLimit(key, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(redis.zadd).not.toHaveBeenCalled(); // نباید درخواست جدید اضافه شود
    });

    it('should remove old requests before checking', async () => {
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      redis.zremrangebyscore.mockResolvedValue(2); // 2 درخواست قدیمی حذف شد
      redis.zcard.mockResolvedValue(3);
      redis.zadd.mockResolvedValue('OK' as any);
      redis.expire.mockResolvedValue(1);
      redis.zrange.mockResolvedValue([`${now}:123`, now.toString()]);

      await service.checkSlidingWindowRateLimit(key, limit, windowSeconds);

      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        `rate_limit:sliding:${key}`,
        0,
        expect.any(Number)
      );
    });

    it('should set TTL for cleanup', async () => {
      redis.zremrangebyscore.mockResolvedValue(0);
      redis.zcard.mockResolvedValue(0);
      redis.zadd.mockResolvedValue('OK' as any);
      redis.expire.mockResolvedValue(1);
      redis.zrange.mockResolvedValue([]);

      await service.checkSlidingWindowRateLimit(key, limit, windowSeconds);

      // TTL باید window + 60 ثانیه باشد
      expect(redis.expire).toHaveBeenCalledWith(
        `rate_limit:sliding:${key}`,
        windowSeconds + 60
      );
    });

    it('should calculate correct retryAfter based on oldest request', async () => {
      const now = Date.now();
      const oldestTimestamp = now - 600000; // 10 دقیقه قبل
      const expectedRetryAfter = Math.ceil((oldestTimestamp + windowSeconds * 1000 - now) / 1000);

      redis.zremrangebyscore.mockResolvedValue(0);
      redis.zcard.mockResolvedValue(5);
      redis.zrange.mockResolvedValue([
        `${oldestTimestamp}:123`,
        oldestTimestamp.toString(),
      ]);

      const result = await service.checkSlidingWindowRateLimit(key, limit, windowSeconds);

      expect(result.retryAfter).toBeGreaterThanOrEqual(expectedRetryAfter - 1); // tolerance
      expect(result.retryAfter).toBeLessThanOrEqual(expectedRetryAfter + 1);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle burst of requests correctly', async () => {
      const phone = '09123456789';
      const limit = 5;
      const windowSeconds = 900;

      // شبیه‌سازی 7 درخواست سریع
      for (let i = 1; i <= 7; i++) {
        redis.get.mockResolvedValue((i - 1).toString());
        redis.incr.mockResolvedValue(i);
        redis.ttl.mockResolvedValue(windowSeconds);

        const result = await service.checkOtpRateLimit(phone, limit, windowSeconds);

        if (i <= 5) {
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(5 - i);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
        }
      }
    });

    it('should reset after window expires', async () => {
      const phone = '09123456789';
      const limit = 5;
      const windowSeconds = 900;

      // اولین درخواست - حد مجاز رسیده
      redis.get.mockResolvedValue('5');
      redis.ttl.mockResolvedValue(windowSeconds);

      const result1 = await service.checkOtpRateLimit(phone, limit, windowSeconds);
      expect(result1.allowed).toBe(false);

      // پاک کردن rate limit (شبیه‌سازی انقضا)
      redis.del.mockResolvedValue(1);
      await service.clearOtpRateLimit(phone);

      // درخواست جدید پس از انقضا
      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(1);
      redis.ttl.mockResolvedValue(windowSeconds);

      const result2 = await service.checkOtpRateLimit(phone, limit, windowSeconds);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(4);
    });
  });
});
