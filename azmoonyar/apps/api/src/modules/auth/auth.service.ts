import { Injectable, UnauthorizedException, BadRequestException, Inject, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private rateLimitService: RateLimitService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ارسال OTP
  async sendOtp(phone: string): Promise<{ token: string; remaining: number; resetTime: Date }> {
    // بررسی Rate Limit با سرویس جدید
    const rateLimitResult = await this.rateLimitService.checkOtpRateLimit(phone);
    
    if (!rateLimitResult.allowed) {
      const errorMessage = this.rateLimitService.getRateLimitErrorMessage(rateLimitResult);
      throw new BadRequestException({
        message: errorMessage,
        retryAfter: rateLimitResult.retryAfter,
        resetTime: rateLimitResult.resetTime,
      });
    }

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

    return { 
      token,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
    };
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

  // تولید توکن‌ها با Token Rotation
  async generateTokens(user: { id: string; role: string; orgId: string | null }) {
    const payload = { sub: user.id, role: user.role, org: user.orgId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    // تولید refresh token با jti یکتا
    const jti = crypto.randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }
    );

    // ذخیره refresh token metadata در Redis
    // استفاده از Hash برای ذخیره اطلاعات بیشتر
    await this.redis.hset(`refresh:${user.id}:${jti}`, {
      token: refreshToken,
      userId: user.id,
      jti,
      issuedAt: Date.now().toString(),
      expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
      isRevoked: 'false',
    });
    
    // تنظیم TTL برای refresh token (30 روز)
    await this.redis.expire(`refresh:${user.id}:${jti}`, 2592000);

    // ذخیره لیست تمام refresh token های فعال کاربر
    await this.redis.sadd(`user:${user.id}:refresh_tokens`, jti);
    await this.redis.expire(`user:${user.id}:refresh_tokens`, 2592000);

    return { accessToken, refreshToken, user: { id: user.id, role: user.role, orgId: user.orgId } };
  }

  // تجدید توکن با Token Rotation
  async refreshTokens(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('توکن نامعتبر است');
    }

    // بررسی وجود refresh token در Redis
    const tokenData = await this.redis.hgetall(`refresh:${payload.sub}:${payload.jti}`);
    
    if (!tokenData || Object.keys(tokenData).length === 0) {
      // اگر توکن یافت نشد، ممکن است سرقت شده باشد
      // تمام refresh token های کاربر را باطل می‌کنیم
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('توکن نامعتبر است. به دلیل احتمال سرقت، تمام نشست‌های شما باطل شد.');
    }

    // بررسی اینکه توکن باطل نشده باشد
    if (tokenData.isRevoked === 'true') {
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('تشخیص استفاده مجدد از توکن. تمام نشست‌های شما باطل شد.');
    }

    // بررسی صحت توکن
    if (tokenData.token !== refreshToken) {
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('توکن نامعتبر است');
    }

    // پیدا کردن کاربر
    const user = await this.prisma.user.findUnique({ 
      where: { id: payload.sub },
      select: { id: true, role: true, orgId: true, status: true }
    });
    
    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد');
    }

    // بررسی وضعیت کاربر
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری غیرفعال است');
    }

    // باطل کردن refresh token قدیمی (Token Rotation)
    await this.revokeRefreshToken(payload.sub, payload.jti);

    // به‌روزرسانی زمان آخرین ورود
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // تولید توکن‌های جدید
    return this.generateTokens(user);
  }

  // باطل کردن یک refresh token خاص
  private async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    const key = `refresh:${userId}:${jti}`;
    
    // علامت‌گذاری به عنوان باطل شده
    await this.redis.hset(key, 'isRevoked', 'true');
    
    // حذف از لیست توکن‌های فعال
    await this.redis.srem(`user:${userId}:refresh_tokens`, jti);
    
    // تنظیم TTL کوتاه‌تر برای پاکسازی (1 ساعت)
    await this.redis.expire(key, 3600);
  }

  // باطل کردن تمام refresh token های یک کاربر
  private async revokeAllUserTokens(userId: string): Promise<void> {
    // دریافت لیست تمام jti های فعال
    const jtis = await this.redis.smembers(`user:${userId}:refresh_tokens`);
    
    // باطل کردن همه
    for (const jti of jtis) {
      await this.revokeRefreshToken(userId, jti);
    }
    
    // پاک کردن لیست
    await this.redis.del(`user:${userId}:refresh_tokens`);
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    // TODO: یکپارچگی با کاوه‌نگار
    console.log(`SMS to ${phone}: ${message}`);
  }

  // خروج از حساب و باطل کردن refresh token
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        });
        
        if (payload.sub === userId) {
          // باطل کردن فقط این refresh token
          await this.revokeRefreshToken(userId, payload.jti);
        }
      } catch {
        // اگر توکن نامعتبر است، بی‌خیال
      }
    }
    
    return { success: true };
  }

  // ثبت‌نام با ایمیل و رمز عبور
  async register(email: string, password: string, name: string) {
    // بررسی وجود کاربر با این ایمیل
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('کاربری با این ایمیل قبلاً ثبت‌نام کرده است');
    }

    // بررسی Rate Limit برای ثبت‌نام
    const attempts = await this.redis.incr(`register:attempts:${email}`);
    if (attempts === 1) await this.redis.expire(`register:attempts:${email}`, 3600);
    if (attempts > 10) {
      throw new BadRequestException('تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است. لطفاً بعداً تلاش کنید');
    }

    // هش کردن رمز عبور
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ایجاد کاربر جدید
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        status: true,
        createdAt: true,
      },
    });

    // TODO: ارسال ایمیل تأیید (اختیاری)
    // await this.sendVerificationEmail(user.email);

    // تولید توکن‌ها
    const tokens = await this.generateTokens({
      id: user.id,
      role: user.role,
      orgId: user.orgId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  // ورود با ایمیل و رمز عبور
  async login(email: string, password: string) {
    // پیدا کردن کاربر
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        orgId: true,
        status: true,
        lastLoginAt: true,
      },
    });

    if (!user || !user.password) {
      // برای امنیت، پیام یکسان برای هر دو حالت
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    }

    // بررسی وضعیت کاربر
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری غیرفعال است');
    }

    // بررسی Account Lockout
    await this.checkAccountLockout(user.id, email);

    // بررسی رمز عبور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // ثبت تلاش ناموفق و بررسی قفل حساب
      await this.handleFailedLoginAttempt(user.id, email);
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    }

    // پاکسازی تلاش‌های ناموفق در صورت ورود موفق
    await this.clearFailedLoginAttempts(user.id, email);

    // به‌روزرسانی زمان آخرین ورود
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // تولید توکن‌ها
    const tokens = await this.generateTokens({
      id: user.id,
      role: user.role,
      orgId: user.orgId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  // بررسی وضعیت قفل حساب
  private async checkAccountLockout(userId: string, email: string): Promise<void> {
    const lockoutKey = `account:lockout:${userId}`;
    const lockoutData = await this.redis.get(lockoutKey);

    if (lockoutData) {
      const { lockedUntil } = JSON.parse(lockoutData);
      const now = Date.now();
      const remainingTime = lockedUntil - now;

      if (remainingTime > 0) {
        const remainingMinutes = Math.ceil(remainingTime / 60000);
        throw new UnauthorizedException(
          `حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد قفل شده است. لطفاً ${remainingMinutes} دقیقه دیگر تلاش کنید.`
        );
      } else {
        // زمان قفل گذشته، پاکسازی
        await this.redis.del(lockoutKey);
        await this.redis.del(`login:failed:${userId}`);
      }
    }
  }

  // مدیریت تلاش ناموفق و قفل حساب
  private async handleFailedLoginAttempt(userId: string, email: string): Promise<void> {
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 دقیقه

    const failedKey = `login:failed:${userId}`;
    const attempts = await this.redis.incr(failedKey);

    if (attempts === 1) {
      // تنظیم انقضا برای شمارنده (30 دقیقه)
      await this.redis.expire(failedKey, 1800);
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      // قفل کردن حساب
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      const lockoutKey = `account:lockout:${userId}`;

      await this.redis.setex(
        lockoutKey,
        1800, // 30 دقیقه
        JSON.stringify({
          userId,
          email,
          lockedAt: Date.now(),
          lockedUntil,
          attempts,
        })
      );

      // ثبت لاگ امنیتی
      console.warn(`[SECURITY] Account locked: userId=${userId}, email=${email}, attempts=${attempts}`);
    }
  }

  // پاکسازی تلاش‌های ناموفق پس از ورود موفق
  private async clearFailedLoginAttempts(userId: string, email: string): Promise<void> {
    await this.redis.del(`login:failed:${userId}`);
    await this.redis.del(`account:lockout:${userId}`);
  }

  // خروج از همه دستگاه‌ها
  async logoutAll(userId: string): Promise<{ success: boolean; revokedCount: number }> {
    const jtis = await this.redis.smembers(`user:${userId}:refresh_tokens`);
    const count = jtis.length;
    
    await this.revokeAllUserTokens(userId);
    
    return { success: true, revokedCount: count };
  }

  // دریافت لیست نشست‌های فعال کاربر
  async getActiveSessions(userId: string): Promise<any[]> {
    const jtis = await this.redis.smembers(`user:${userId}:refresh_tokens`);
    const sessions = [];
    
    for (const jti of jtis) {
      const tokenData = await this.redis.hgetall(`refresh:${userId}:${jti}`);
      if (tokenData && tokenData.isRevoked === 'false') {
        sessions.push({
          jti,
          issuedAt: new Date(parseInt(tokenData.issuedAt)),
          expiresAt: new Date(parseInt(tokenData.expiresAt)),
        });
      }
    }
    
    return sessions;
  }

  // ورود/ثبت‌نام با Google OAuth
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }) {
    // جستجو بر اساس ایمیل گوگل
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        status: true,
        googleId: true,
      },
    });

    if (user) {
      // کاربر موجود است
      // بررسی وضعیت
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('حساب کاربری غیرفعال است');
      }

      // اگر googleId ثبت نشده، آن را اضافه کنیم
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            orgId: true,
            status: true,
            googleId: true,
          },
        });
      }

      // به‌روزرسانی زمان آخرین ورود
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else {
      // کاربر جدید - ثبت‌نام خودکار
      const fullName = `${googleUser.firstName} ${googleUser.lastName}`.trim();
      
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          googleId: googleUser.googleId,
          name: fullName || 'کاربر گوگل',
          avatarUrl: googleUser.picture,
          status: 'ACTIVE',
          // password null می‌ماند چون از Google استفاده می‌کند
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          orgId: true,
          status: true,
          googleId: true,
        },
      });
    }

    // تولید توکن‌ها
    const tokens = await this.generateTokens({
      id: user.id,
      role: user.role,
      orgId: user.orgId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }
}
