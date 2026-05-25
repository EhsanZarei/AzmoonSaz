import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  // ارسال OTP
  async sendOtp(phone: string): Promise<{ token: string }> {
    // بررسی Rate Limit
    const attempts = await this.redis.incr(`otp:attempts:${phone}`);
    if (attempts === 1) await this.redis.expire(`otp:attempts:${phone}`, 900);
    if (attempts > 5) throw new BadRequestException('تعداد درخواست‌ها بیش از حد مجاز است');

    // تولید OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = this.jwtService.sign({ phone }, { expiresIn: '2m' });

    // ذخیره OTP در Redis
    await this.redis.setex(`otp:${phone}`, 120, otp);

    // ارسال پیامک (در production)
    if (this.config.get('NODE_ENV') === 'production') {
      await this.sendSms(phone, `کد تأیید آزمونیار: ${otp}`);
    } else {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    return { token };
  }

  // تأیید OTP
  async verifyOtp(token: string, otp: string) {
    let payload: { phone: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('توکن منقضی شده است');
    }

    const storedOtp = await this.redis.get(`otp:${payload.phone}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('کد تأیید نادرست است');
    }

    await this.redis.del(`otp:${payload.phone}`);

    // پیدا کردن یا ایجاد کاربر
    let user = await this.prisma.user.findUnique({ where: { phone: payload.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: payload.phone, name: 'کاربر جدید' },
      });
    }

    return this.generateTokens(user);
  }

  // تولید توکن‌ها
  async generateTokens(user: { id: string; role: string; orgId: string | null }) {
    const payload = { sub: user.id, role: user.role, org: user.orgId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: crypto.randomUUID() },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }
    );

    // ذخیره refresh token در Redis
    await this.redis.setex(`refresh:${user.id}`, 2592000, refreshToken);

    return { accessToken, refreshToken };
  }

  // تجدید توکن
  async refreshTokens(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('توکن نامعتبر است');
    }

    const stored = await this.redis.get(`refresh:${payload.sub}`);
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('توکن منقضی شده است');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('کاربر یافت نشد');

    return this.generateTokens(user);
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    // TODO: یکپارچگی با کاوه‌نگار
    console.log(`SMS to ${phone}: ${message}`);
  }
}
