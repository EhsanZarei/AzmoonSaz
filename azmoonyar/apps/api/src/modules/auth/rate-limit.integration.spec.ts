import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

describe('Rate Limiting Integration Tests', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    redis = moduleFixture.get<Redis>(REDIS_CLIENT);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // پاکسازی rate limit keys بعد از هر تست
    const keys = await redis.keys('rate_limit:otp:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('POST /auth/send-otp - Rate Limiting', () => {
    const testPhone = '+989123456789';

    it('should allow first 5 requests within 15 minutes', async () => {
      for (let i = 1; i <= 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('remaining');
        expect(response.body.remaining).toBe(5 - i);
      }
    });

    it('should deny 6th request with proper error message', async () => {
      // ارسال 5 درخواست اول
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);
      }

      // درخواست ششم باید رد شود
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(400);

      expect(response.body.message).toContain('تعداد درخواست‌های شما بیش از حد مجاز است');
      expect(response.body).toHaveProperty('retryAfter');
      expect(response.body).toHaveProperty('resetTime');
      expect(response.body.retryAfter).toBeGreaterThan(0);
    });

    it('should show correct remaining count', async () => {
      // درخواست اول
      let response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);
      expect(response.body.remaining).toBe(4);

      // درخواست دوم
      response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);
      expect(response.body.remaining).toBe(3);

      // درخواست سوم
      response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);
      expect(response.body.remaining).toBe(2);
    });

    it('should handle multiple different phones independently', async () => {
      const phone1 = '+989123456789';
      const phone2 = '+989987654321';

      // 5 درخواست برای phone1
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: phone1 })
          .expect(200);
      }

      // phone1 باید بلاک شود
      await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: phone1 })
        .expect(400);

      // اما phone2 باید بتواند درخواست بدهد
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: phone2 })
        .expect(200);

      expect(response.body.remaining).toBe(4);
    });

    it('should show accurate retryAfter time', async () => {
      // پر کردن سهمیه
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);
      }

      // درخواست اضافی
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(400);

      // retryAfter باید نزدیک به 900 ثانیه (15 دقیقه) باشد
      expect(response.body.retryAfter).toBeGreaterThan(890);
      expect(response.body.retryAfter).toBeLessThanOrEqual(900);

      // resetTime باید یک تاریخ معتبر در آینده باشد
      const resetTime = new Date(response.body.resetTime);
      expect(resetTime.getTime()).toBeGreaterThan(Date.now());
    });

    it('should allow requests after manual rate limit clear', async () => {
      // پر کردن سهمیه
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);
      }

      // باید بلاک شود
      await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(400);

      // پاک کردن دستی rate limit
      await redis.del(`rate_limit:otp:${testPhone}`);

      // حالا باید بتواند دوباره درخواست بدهد
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);

      expect(response.body.remaining).toBe(4);
    });

    it('should return proper Persian error message', async () => {
      // پر کردن سهمیه
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);
      }

      // بررسی پیام فارسی
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(400);

      // پیام باید شامل متن فارسی و زمان باشد
      expect(response.body.message).toMatch(/تعداد درخواست.*بیش از حد مجاز/);
      expect(response.body.message).toMatch(/دقیقه|ثانیه/);
    });
  });

  describe('Rate Limit Window Expiration', () => {
    const testPhone = '+989123456789';

    it('should reset rate limit after window expires (simulation)', async () => {
      // ارسال یک درخواست
      await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);

      // بررسی وجود key در Redis
      const exists = await redis.exists(`rate_limit:otp:${testPhone}`);
      expect(exists).toBe(1);

      // بررسی TTL
      const ttl = await redis.ttl(`rate_limit:otp:${testPhone}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(900); // حداکثر 15 دقیقه

      // شبیه‌سازی انقضا با حذف دستی
      await redis.del(`rate_limit:otp:${testPhone}`);

      // باید بتواند دوباره 5 درخواست بدهد
      for (let i = 1; i <= 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);
        expect(response.body.remaining).toBe(5 - i);
      }
    });
  });

  describe('Concurrent Requests', () => {
    const testPhone = '+989123456789';

    it('should handle concurrent requests correctly', async () => {
      // ارسال 10 درخواست همزمان
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/auth/send-otp')
            .send({ phone: testPhone })
        );

      const responses = await Promise.all(promises);

      // فقط 5 تا باید موفق شوند
      const successCount = responses.filter((r) => r.status === 200).length;
      const failCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(5);
      expect(failCount).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: '' })
        .expect(400);

      // باید خطای validation برگرداند، نه rate limit
      expect(response.body.message).not.toContain('بیش از حد مجاز');
    });

    it('should handle invalid phone format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: 'invalid-phone' })
        .expect(400);

      // باید خطای validation برگرداند
      expect(response.body.message).not.toContain('بیش از حد مجاز');
    });

    it('should handle very long phone numbers', async () => {
      const longPhone = '0'.repeat(50);
      
      // اولین درخواست
      await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: longPhone });

      // rate limit باید برای این شماره هم کار کند
      const key = await redis.exists(`rate_limit:otp:${longPhone}`);
      expect(key).toBe(1);
    });
  });

  describe('Rate Limit Information', () => {
    const testPhone = '+989123456789';

    it('should provide accurate remaining count throughout', async () => {
      const remainingCounts: number[] = [];

      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/send-otp')
          .send({ phone: testPhone })
          .expect(200);

        remainingCounts.push(response.body.remaining);
      }

      // باید به ترتیب کاهش پیدا کند: [4, 3, 2, 1, 0]
      expect(remainingCounts).toEqual([4, 3, 2, 1, 0]);
    });

    it('should provide consistent resetTime', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ phone: testPhone })
        .expect(200);

      // زمان reset باید تقریباً یکسان باشد (با tolerance 2 ثانیه)
      const reset1 = new Date(response1.body.resetTime).getTime();
      const reset2 = new Date(response2.body.resetTime).getTime();

      expect(Math.abs(reset1 - reset2)).toBeLessThan(2000); // 2 ثانیه
    });
  });
});
