import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '../../redis/redis.decorator';
import Redis from 'ioredis';
import axios from 'axios';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_TTL = 120; // 2 دقیقه
  private readonly OTP_RATE_LIMIT = 5; // حداکثر 5 بار در 15 دقیقه

  constructor(
    private config: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  // تولید OTP تصادفی ۶ رقمی
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ذخیره OTP در Redis
  async saveOtp(phone: string, otp: string): Promise<void> {
    const key = `otp:${phone}`;
    await this.redis.setex(key, this.OTP_TTL, otp);
  }

  // بررسی Rate Limit
  async checkRateLimit(phone: string): Promise<boolean> {
    const key = `otp:rate:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 15 * 60); // 15 دقیقه
    }
    return count <= this.OTP_RATE_LIMIT;
  }

  // تأیید OTP
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const key = `otp:${phone}`;
    const stored = await this.redis.get(key);
    if (!stored || stored !== otp) return false;
    await this.redis.del(key); // حذف پس از استفاده
    return true;
  }

  // ارسال OTP از طریق کاوه‌نگار
  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // بررسی Rate Limit
    const allowed = await this.checkRateLimit(phone);
    if (!allowed) {
      return { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است' };
    }

    const otp = this.generateOtp();
    await this.saveOtp(phone, otp);

    // در محیط توسعه فقط لاگ می‌کنیم
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.debug(`OTP for ${phone}: ${otp}`);
      return { success: true, message: 'کد تأیید ارسال شد' };
    }

    // ارسال واقعی از طریق کاوه‌نگار
    try {
      await axios.post('https://api.kavenegar.com/v1/sms/send.json', {
        receptor: phone,
        message: `کد تأیید آزمونیار: ${otp}\nاین کد تا ۲ دقیقه معتبر است.`,
        sender: this.config.get('KAVENEGHAR_SENDER'),
      }, {
        headers: { apikey: this.config.get('KAVENEGHAR_API_KEY') },
      });
      return { success: true, message: 'کد تأیید ارسال شد' };
    } catch (error) {
      this.logger.error('SMS send failed', error);
      return { success: false, message: 'خطا در ارسال پیامک' };
    }
  }
}
