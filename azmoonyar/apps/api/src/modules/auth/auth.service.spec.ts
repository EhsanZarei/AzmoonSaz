import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RateLimitService } from './rate-limit.service';
import { REDIS_CLIENT } from '../../redis/redis.module';

jest.mock('bcrypt');

describe('AuthService - Refresh Token Rotation', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<Redis>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let rateLimitService: jest.Mocked<RateLimitService>;

  const mockUser = {
    id: 'user-123',
    role: 'STUDENT',
    orgId: 'org-456',
    status: 'ACTIVE',
    phone: '09123456789',
    name: 'تست کاربر',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkOtpRateLimit: jest.fn(),
            getRateLimitErrorMessage: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            incr: jest.fn(),
            expire: jest.fn(),
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            hset: jest.fn(),
            hgetall: jest.fn(),
            sadd: jest.fn(),
            srem: jest.fn(),
            smembers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redis = module.get(REDIS_CLIENT) as jest.Mocked<Redis>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    rateLimitService = module.get(RateLimitService) as jest.Mocked<RateLimitService>;
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens with metadata', async () => {
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      jwtService.sign
        .mockReturnValueOnce(accessToken) // access token
        .mockReturnValueOnce(refreshToken); // refresh token

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.generateTokens(mockUser);

      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.user).toEqual({
        id: mockUser.id,
        role: mockUser.role,
        orgId: mockUser.orgId,
      });

      // بررسی ذخیره metadata در Redis
      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:user-123:/),
        expect.objectContaining({
          token: refreshToken,
          userId: mockUser.id,
          isRevoked: 'false',
        })
      );

      // بررسی افزودن به لیست توکن‌های فعال
      expect(redis.sadd).toHaveBeenCalledWith(
        'user:user-123:refresh_tokens',
        expect.any(String)
      );
    });

    it('should set correct TTL for refresh tokens', async () => {
      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      await service.generateTokens(mockUser);

      // TTL باید 30 روز (2592000 ثانیه) باشد
      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:user-123:/),
        2592000
      );
      expect(redis.expire).toHaveBeenCalledWith(
        'user:user-123:refresh_tokens',
        2592000
      );
    });
  });

  describe('refreshTokens - Token Rotation', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockJti = 'jti-123';
    const mockPayload = { sub: mockUser.id, jti: mockJti };

    it('should successfully rotate refresh token', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({
        token: mockRefreshToken,
        userId: mockUser.id,
        jti: mockJti,
        issuedAt: Date.now().toString(),
        expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        isRevoked: 'false',
      });

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.user.update.mockResolvedValue(mockUser as any);

      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.srem.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');

      // بررسی باطل شدن توکن قدیمی
      expect(redis.hset).toHaveBeenCalledWith(
        `refresh:${mockUser.id}:${mockJti}`,
        'isRevoked',
        'true'
      );

      // بررسی حذف از لیست توکن‌های فعال
      expect(redis.srem).toHaveBeenCalledWith(
        `user:${mockUser.id}:refresh_tokens`,
        mockJti
      );

      // بررسی به‌روزرسانی lastLoginAt
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw error for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should detect token reuse and revoke all user tokens', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({
        token: mockRefreshToken,
        userId: mockUser.id,
        jti: mockJti,
        issuedAt: Date.now().toString(),
        expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        isRevoked: 'true', // توکن قبلاً باطل شده
      });

      redis.smembers.mockResolvedValue(['jti-1', 'jti-2', 'jti-3']);
      redis.srem.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.del.mockResolvedValue(1);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'تشخیص استفاده مجدد از توکن'
      );

      // بررسی باطل شدن تمام توکن‌ها
      expect(redis.smembers).toHaveBeenCalledWith(
        `user:${mockUser.id}:refresh_tokens`
      );
      expect(redis.del).toHaveBeenCalledWith(
        `user:${mockUser.id}:refresh_tokens`
      );
    });

    it('should detect missing token and revoke all user tokens', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({}); // توکن یافت نشد

      redis.smembers.mockResolvedValue(['jti-1']);
      redis.srem.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.del.mockResolvedValue(1);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'توکن نامعتبر است'
      );
    });

    it('should throw error if token mismatch detected', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({
        token: 'different-token', // توکن مطابقت ندارد
        userId: mockUser.id,
        jti: mockJti,
        issuedAt: Date.now().toString(),
        expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        isRevoked: 'false',
      });

      redis.smembers.mockResolvedValue([mockJti]);
      redis.srem.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.del.mockResolvedValue(1);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for inactive user', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({
        token: mockRefreshToken,
        userId: mockUser.id,
        jti: mockJti,
        issuedAt: Date.now().toString(),
        expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        isRevoked: 'false',
      });

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      } as any);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'حساب کاربری غیرفعال است'
      );
    });

    it('should throw error if user not found', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redis.hgetall.mockResolvedValue({
        token: mockRefreshToken,
        userId: mockUser.id,
        jti: mockJti,
        issuedAt: Date.now().toString(),
        expiresAt: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        isRevoked: 'false',
      });

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'کاربر یافت نشد'
      );
    });
  });

  describe('logout', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockJti = 'jti-123';

    it('should successfully logout and revoke refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id, jti: mockJti });
      redis.hset.mockResolvedValue(0);
      redis.srem.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);

      const result = await service.logout(mockUser.id, mockRefreshToken);

      expect(result.success).toBe(true);
      expect(redis.hset).toHaveBeenCalledWith(
        `refresh:${mockUser.id}:${mockJti}`,
        'isRevoked',
        'true'
      );
    });

    it('should handle logout without refresh token', async () => {
      const result = await service.logout(mockUser.id);

      expect(result.success).toBe(true);
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token gracefully', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.logout(mockUser.id, 'invalid-token');

      expect(result.success).toBe(true);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all user refresh tokens', async () => {
      const jtis = ['jti-1', 'jti-2', 'jti-3'];
      redis.smembers.mockResolvedValue(jtis);
      redis.hset.mockResolvedValue(0);
      redis.srem.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.del.mockResolvedValue(1);

      const result = await service.logoutAll(mockUser.id);

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(3);
      expect(redis.del).toHaveBeenCalledWith(
        `user:${mockUser.id}:refresh_tokens`
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return list of active sessions', async () => {
      const jtis = ['jti-1', 'jti-2'];
      const now = Date.now();

      redis.smembers.mockResolvedValue(jtis);
      redis.hgetall
        .mockResolvedValueOnce({
          token: 'token-1',
          userId: mockUser.id,
          jti: 'jti-1',
          issuedAt: now.toString(),
          expiresAt: (now + 1000000).toString(),
          isRevoked: 'false',
        })
        .mockResolvedValueOnce({
          token: 'token-2',
          userId: mockUser.id,
          jti: 'jti-2',
          issuedAt: now.toString(),
          expiresAt: (now + 1000000).toString(),
          isRevoked: 'false',
        });

      const sessions = await service.getActiveSessions(mockUser.id);

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('jti', 'jti-1');
      expect(sessions[0]).toHaveProperty('issuedAt');
      expect(sessions[0]).toHaveProperty('expiresAt');
    });

    it('should filter out revoked sessions', async () => {
      const jtis = ['jti-1', 'jti-2'];
      const now = Date.now();

      redis.smembers.mockResolvedValue(jtis);
      redis.hgetall
        .mockResolvedValueOnce({
          token: 'token-1',
          userId: mockUser.id,
          jti: 'jti-1',
          issuedAt: now.toString(),
          expiresAt: (now + 1000000).toString(),
          isRevoked: 'true', // باطل شده
        })
        .mockResolvedValueOnce({
          token: 'token-2',
          userId: mockUser.id,
          jti: 'jti-2',
          issuedAt: now.toString(),
          expiresAt: (now + 1000000).toString(),
          isRevoked: 'false',
        });

      const sessions = await service.getActiveSessions(mockUser.id);

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toHaveProperty('jti', 'jti-2');
    });
  });

  describe('verifyOtp', () => {
    it('should generate tokens after successful OTP verification', async () => {
      const phone = '09123456789';
      const otp = '123456';
      const token = 'temp-token';

      jwtService.verify.mockReturnValue({ phone });
      redis.get.mockResolvedValue(otp);
      redis.del.mockResolvedValue(1);
      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.verifyOtp(token, otp);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(redis.del).toHaveBeenCalledWith(`otp:${phone}`);
    });

    it('should create new user if not exists', async () => {
      const phone = '09123456789';
      const otp = '123456';
      const token = 'temp-token';

      jwtService.verify.mockReturnValue({ phone });
      redis.get.mockResolvedValue(otp);
      redis.del.mockResolvedValue(1);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser as any);

      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      await service.verifyOtp(token, otp);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { phone, name: 'کاربر جدید' },
      });
    });
  });

  describe('sendOtp', () => {
    it('should enforce rate limiting', async () => {
      const phone = '09123456789';

      redis.incr.mockResolvedValue(6); // بیشتر از حد مجاز

      await expect(service.sendOtp(phone)).rejects.toThrow(BadRequestException);
    });

    it('should send OTP successfully', async () => {
      const phone = '09123456789';

      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      redis.setex.mockResolvedValue('OK');
      jwtService.sign.mockReturnValue('temp-token');

      const result = await service.sendOtp(phone);

      expect(result.token).toBe('temp-token');
      expect(redis.setex).toHaveBeenCalledWith(
        `otp:${phone}`,
        120,
        expect.any(String)
      );
    });
  });
  describe('register', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'SecurePass123!';
    const mockName = 'علی احمدی';
    const mockHashedPassword = '$2b$12$hashedpassword';

    it('should successfully register a new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // کاربر وجود ندارد
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: mockEmail.toLowerCase(),
        password: mockHashedPassword,
        name: mockName,
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
      } as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);

      const result = await service.register(mockEmail, mockPassword, mockName);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockEmail.toLowerCase());
      expect(result.user.name).toBe(mockName);

      // بررسی هش شدن رمز عبور
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 12);

      // بررسی ایجاد کاربر با رمز عبور هش شده
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockEmail.toLowerCase(),
          password: mockHashedPassword,
          name: mockName,
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(
        service.register(mockEmail, mockPassword, mockName)
      ).rejects.toThrow(ConflictException);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      prisma.user.findUnique.mockResolvedValue(null);
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: upperCaseEmail.toLowerCase(),
        password: mockHashedPassword,
        name: mockName,
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
      } as any);

      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);

      await service.register(upperCaseEmail, mockPassword, mockName);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: upperCaseEmail.toLowerCase(),
          password: mockHashedPassword,
          name: mockName,
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
    });

    it('should enforce rate limiting for registration', async () => {
      redis.incr.mockResolvedValue(11); // بیشتر از حد مجاز

      await expect(
        service.register(mockEmail, mockPassword, mockName)
      ).rejects.toThrow('تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است');
    });
  });

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'SecurePass123!';
    const mockHashedPassword = '$2b$12$hashedpassword';
    const mockUserWithPassword = {
      ...mockUser,
      email: mockEmail,
      password: mockHashedPassword,
      lastLoginAt: new Date(),
    };

    beforeEach(() => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
    });

    it('should successfully login with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      redis.del.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUserWithPassword as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);

      const result = await service.login(mockEmail, mockPassword);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockEmail);

      // بررسی پاکسازی تلاش‌های ناموفق
      expect(redis.del).toHaveBeenCalledWith(`login:attempts:${mockEmail}`);
      expect(redis.del).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);

      // بررسی به‌روزرسانی lastLoginAt
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'ایمیل یا رمز عبور نادرست است'
      );
    });

    it('should throw UnauthorizedException for user without password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        email: mockEmail,
        password: null, // کاربر بدون رمز عبور
      } as any);

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'ایمیل یا رمز عبور نادرست است'
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.incr.mockResolvedValue(1);
      redis.get.mockResolvedValue('1');

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'ایمیل یا رمز عبور نادرست است'
      );

      // بررسی ثبت تلاش ناموفق
      expect(redis.incr).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);
    });

    it('should suspend account after 10 failed login attempts', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.incr.mockResolvedValue(10);
      redis.get.mockResolvedValue('10'); // 10 تلاش ناموفق

      prisma.user.update.mockResolvedValue({
        ...mockUserWithPassword,
        status: 'SUSPENDED',
      } as any);

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'حساب کاربری به دلیل تلاش‌های ناموفق متعدد قفل شده است'
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { status: 'SUSPENDED' },
      });
    });

    it('should throw UnauthorizedException for suspended account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUserWithPassword,
        status: 'SUSPENDED',
      } as any);

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'حساب کاربری غیرفعال است'
      );
    });

    it('should enforce rate limiting for login attempts', async () => {
      redis.incr.mockResolvedValue(6); // بیشتر از حد مجاز

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'تعداد تلاش‌های ورود بیش از حد مجاز است'
      );
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      prisma.user.findUnique.mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      redis.del.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUserWithPassword as any);
      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);

      await service.login(upperCaseEmail, mockPassword);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: upperCaseEmail.toLowerCase() },
        select: expect.any(Object),
      });
    });
  });
});

describe('AuthService - Google OAuth', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<Redis>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    role: 'STUDENT',
    orgId: null,
    status: 'ACTIVE',
  };

  const mockGoogleUser = {
    googleId: 'google-id-123',
    email: 'user@gmail.com',
    firstName: 'علی',
    lastName: 'احمدی',
    picture: 'https://lh3.googleusercontent.com/photo.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            hset: jest.fn(),
            expire: jest.fn(),
            sadd: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redis = module.get(REDIS_CLIENT) as jest.Mocked<Redis>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  describe('googleLogin', () => {
    it('should login existing user with Google', async () => {
      const existingUser = {
        ...mockUser,
        email: mockGoogleUser.email,
        googleId: mockGoogleUser.googleId,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser as any);
      prisma.user.update.mockResolvedValue(existingUser as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.googleLogin(mockGoogleUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockGoogleUser.email);

      // بررسی به‌روزرسانی lastLoginAt
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should add googleId to existing user without googleId', async () => {
      const existingUser = {
        ...mockUser,
        email: mockGoogleUser.email,
        googleId: null, // کاربر موجود بدون googleId
      };

      const updatedUser = {
        ...existingUser,
        googleId: mockGoogleUser.googleId,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser as any);
      prisma.user.update
        .mockResolvedValueOnce(updatedUser as any) // برای افزودن googleId
        .mockResolvedValueOnce(updatedUser as any); // برای به‌روزرسانی lastLoginAt

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.googleLogin(mockGoogleUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(mockGoogleUser.email);

      // بررسی افزودن googleId
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: { googleId: mockGoogleUser.googleId },
        select: expect.any(Object),
      });
    });

    it('should register new user with Google', async () => {
      const newUser = {
        id: 'new-user-id',
        email: mockGoogleUser.email,
        googleId: mockGoogleUser.googleId,
        name: `${mockGoogleUser.firstName} ${mockGoogleUser.lastName}`,
        avatarUrl: mockGoogleUser.picture,
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(null); // کاربر وجود ندارد
      prisma.user.create.mockResolvedValue(newUser as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.googleLogin(mockGoogleUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockGoogleUser.email);

      // بررسی ایجاد کاربر جدید
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockGoogleUser.email.toLowerCase(),
          googleId: mockGoogleUser.googleId,
          name: `${mockGoogleUser.firstName} ${mockGoogleUser.lastName}`,
          avatarUrl: mockGoogleUser.picture,
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
    });

    it('should handle empty names from Google', async () => {
      const googleUserWithoutName = {
        ...mockGoogleUser,
        firstName: '',
        lastName: '',
      };

      const newUser = {
        id: 'new-user-id',
        email: googleUserWithoutName.email,
        googleId: googleUserWithoutName.googleId,
        name: 'کاربر گوگل',
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser as any);

      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      await service.googleLogin(googleUserWithoutName);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: googleUserWithoutName.email.toLowerCase(),
          googleId: googleUserWithoutName.googleId,
          name: 'کاربر گوگل',
          avatarUrl: googleUserWithoutName.picture,
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      const suspendedUser = {
        ...mockUser,
        email: mockGoogleUser.email,
        googleId: mockGoogleUser.googleId,
        status: 'SUSPENDED',
      };

      prisma.user.findUnique.mockResolvedValue(suspendedUser as any);

      await expect(service.googleLogin(mockGoogleUser)).rejects.toThrow(
        'حساب کاربری غیرفعال است'
      );
    });

    it('should normalize email to lowercase', async () => {
      const googleUserUpperCase = {
        ...mockGoogleUser,
        email: 'USER@GMAIL.COM',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: googleUserUpperCase.email.toLowerCase(),
        googleId: googleUserUpperCase.googleId,
        name: 'علی احمدی',
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
      } as any);

      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      await service.googleLogin(googleUserUpperCase);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: googleUserUpperCase.email.toLowerCase() },
        select: expect.any(Object),
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: googleUserUpperCase.email.toLowerCase(),
        }),
        select: expect.any(Object),
      });
    });

    it('should generate valid tokens after Google login', async () => {
      const existingUser = {
        ...mockUser,
        email: mockGoogleUser.email,
        googleId: mockGoogleUser.googleId,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser as any);
      prisma.user.update.mockResolvedValue(existingUser as any);

      const mockAccessToken = 'google-access-token';
      const mockRefreshToken = 'google-refresh-token';

      jwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      const result = await service.googleLogin(mockGoogleUser);

      // بررسی تولید توکن‌ها با اطلاعات صحیح
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: existingUser.id,
          role: existingUser.role,
          org: existingUser.orgId,
        }),
        expect.any(Object)
      );

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    it('should save avatarUrl when creating new user', async () => {
      const newUser = {
        id: 'new-user-id',
        email: mockGoogleUser.email,
        googleId: mockGoogleUser.googleId,
        name: 'علی احمدی',
        avatarUrl: mockGoogleUser.picture,
        role: 'STUDENT',
        orgId: null,
        status: 'ACTIVE',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser as any);

      jwtService.sign.mockReturnValue('mock-token');
      redis.hset.mockResolvedValue(0);
      redis.expire.mockResolvedValue(1);
      redis.sadd.mockResolvedValue(1);

      await service.googleLogin(mockGoogleUser);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          avatarUrl: mockGoogleUser.picture,
        }),
        select: expect.any(Object),
      });
    });
  });
});


describe('AuthService - Account Lockout', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<Redis>;
  let jwtService: jest.Mocked<JwtService>;
  let rateLimitService: jest.Mocked<RateLimitService>;

  const mockEmail = 'test@example.com';
  const mockPassword = 'SecurePass123!';
  const mockHashedPassword = '$2b$12$hashedpassword';
  const mockUser = {
    id: 'user-123',
    email: mockEmail,
    password: mockHashedPassword,
    name: 'تست کاربر',
    role: 'STUDENT',
    orgId: null,
    status: 'ACTIVE',
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkOtpRateLimit: jest.fn(),
            getRateLimitErrorMessage: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            incr: jest.fn(),
            expire: jest.fn(),
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            hset: jest.fn(),
            hgetall: jest.fn(),
            sadd: jest.fn(),
            srem: jest.fn(),
            smembers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redis = module.get(REDIS_CLIENT) as jest.Mocked<Redis>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    rateLimitService = module.get(RateLimitService) as jest.Mocked<RateLimitService>;
  });

  describe('checkAccountLockout', () => {
    it('should allow login when account is not locked', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      redis.get.mockResolvedValue(null); // حساب قفل نیست

      redis.del.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(mockEmail, mockPassword);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error when account is locked', async () => {
      const lockedUntil = Date.now() + 1800000; // 30 دقیقه آینده
      const lockoutData = {
        userId: mockUser.id,
        email: mockEmail,
        lockedAt: Date.now() - 60000,
        lockedUntil,
        attempts: 5,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      redis.get.mockResolvedValue(JSON.stringify(lockoutData));

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        /حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد قفل شده است/
      );
    });

    it('should unlock account automatically after lockout period', async () => {
      const lockedUntil = Date.now() - 1000; // گذشته
      const lockoutData = {
        userId: mockUser.id,
        email: mockEmail,
        lockedAt: Date.now() - 1800000,
        lockedUntil,
        attempts: 5,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      redis.get.mockResolvedValue(JSON.stringify(lockoutData));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      redis.del.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(mockEmail, mockPassword);

      expect(result.accessToken).toBeDefined();
      // بررسی پاکسازی lockout و failed attempts
      expect(redis.del).toHaveBeenCalledWith(`account:lockout:${mockUser.id}`);
      expect(redis.del).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);
    });

    it('should show remaining time in error message', async () => {
      const remainingMs = 900000; // 15 دقیقه
      const lockedUntil = Date.now() + remainingMs;
      const lockoutData = {
        userId: mockUser.id,
        email: mockEmail,
        lockedAt: Date.now(),
        lockedUntil,
        attempts: 5,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      redis.get.mockResolvedValue(JSON.stringify(lockoutData));

      try {
        await service.login(mockEmail, mockPassword);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toContain('دقیقه');
        expect(error.message).toMatch(/\d+/); // باید عدد داشته باشد
      }
    });
  });

  describe('handleFailedLoginAttempt', () => {
    it('should increment failed attempts counter', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.get.mockResolvedValue(null); // حساب قفل نیست
      redis.incr.mockResolvedValue(1); // اولین تلاش ناموفق
      redis.expire.mockResolvedValue(1);

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        'ایمیل یا رمز عبور نادرست است'
      );

      expect(redis.incr).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);
      expect(redis.expire).toHaveBeenCalledWith(`login:failed:${mockUser.id}`, 1800);
    });

    it('should lock account after 5 failed attempts', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5); // پنجمین تلاش ناموفق
      redis.expire.mockResolvedValue(1);
      redis.setex.mockResolvedValue('OK');

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow();

      // بررسی ثبت lockout در Redis
      expect(redis.setex).toHaveBeenCalledWith(
        `account:lockout:${mockUser.id}`,
        1800, // 30 دقیقه
        expect.stringContaining(mockUser.id)
      );

      const lockoutData = JSON.parse(
        (redis.setex as jest.Mock).mock.calls[0][2]
      );
      expect(lockoutData.userId).toBe(mockUser.id);
      expect(lockoutData.email).toBe(mockEmail);
      expect(lockoutData.attempts).toBe(5);
    });

    it('should not lock account before 5 attempts', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.get.mockResolvedValue(null);
      
      // تلاش‌های 1 تا 4
      for (let i = 1; i <= 4; i++) {
        redis.incr.mockResolvedValueOnce(i);
        redis.expire.mockResolvedValue(1);

        await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
          'ایمیل یا رمز عبور نادرست است'
        );

        // نباید lockout ایجاد شود
        expect(redis.setex).not.toHaveBeenCalledWith(
          `account:lockout:${mockUser.id}`,
          expect.any(Number),
          expect.any(String)
        );
      }
    });

    it('should set 30-minute lockout duration', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5);
      redis.expire.mockResolvedValue(1);
      redis.setex.mockResolvedValue('OK');

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow();

      expect(redis.setex).toHaveBeenCalledWith(
        `account:lockout:${mockUser.id}`,
        1800, // 30 دقیقه = 1800 ثانیه
        expect.any(String)
      );

      const lockoutData = JSON.parse(
        (redis.setex as jest.Mock).mock.calls[0][2]
      );
      
      // lockedUntil باید 30 دقیقه در آینده باشد
      const expectedLockDuration = 30 * 60 * 1000; // 30 دقیقه به میلی‌ثانیه
      const now = Date.now();
      const timeDiff = lockoutData.lockedUntil - lockoutData.lockedAt;
      
      expect(timeDiff).toBeGreaterThanOrEqual(expectedLockDuration - 1000);
      expect(timeDiff).toBeLessThanOrEqual(expectedLockDuration + 1000);
    });
  });

  describe('clearFailedLoginAttempts', () => {
    it('should clear failed attempts after successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      redis.get.mockResolvedValue(null);
      redis.del.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');

      await service.login(mockEmail, mockPassword);

      expect(redis.del).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);
      expect(redis.del).toHaveBeenCalledWith(`account:lockout:${mockUser.id}`);
    });

    it('should not fail if no failed attempts exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      redis.get.mockResolvedValue(null);
      redis.del.mockResolvedValue(0); // کلیدی وجود ندارد
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(mockEmail, mockPassword);

      expect(result.accessToken).toBeDefined();
    });
  });

  describe('Account Lockout Integration', () => {
    it('should complete full lockout flow: failed attempts -> lock -> unlock', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // مرحله 1: 5 تلاش ناموفق
      for (let i = 1; i <= 5; i++) {
        redis.get.mockResolvedValue(null);
        redis.incr.mockResolvedValue(i);
        redis.expire.mockResolvedValue(1);
        
        if (i === 5) {
          redis.setex.mockResolvedValue('OK');
        }

        await expect(service.login(mockEmail, mockPassword)).rejects.toThrow();
      }

      // مرحله 2: تلاش ورود در حین قفل
      const lockedUntil = Date.now() + 1800000;
      const lockoutData = {
        userId: mockUser.id,
        email: mockEmail,
        lockedAt: Date.now(),
        lockedUntil,
        attempts: 5,
      };
      redis.get.mockResolvedValue(JSON.stringify(lockoutData));

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow(
        /حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد قفل شده است/
      );

      // مرحله 3: بعد از گذشت زمان قفل، ورود موفق
      const expiredLockoutData = {
        ...lockoutData,
        lockedUntil: Date.now() - 1000, // گذشته
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(expiredLockoutData));
      redis.get.mockResolvedValue(null); // برای بررسی‌های بعدی

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      redis.del.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(mockEmail, mockPassword);

      expect(result.accessToken).toBeDefined();
      expect(redis.del).toHaveBeenCalledWith(`account:lockout:${mockUser.id}`);
      expect(redis.del).toHaveBeenCalledWith(`login:failed:${mockUser.id}`);
    });

    it('should handle concurrent failed login attempts correctly', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // شبیه‌سازی 5 تلاش همزمان
      const attempts = [1, 2, 3, 4, 5];
      redis.get.mockResolvedValue(null);

      for (const attempt of attempts) {
        redis.incr.mockResolvedValueOnce(attempt);
        redis.expire.mockResolvedValue(1);
        if (attempt === 5) {
          redis.setex.mockResolvedValue('OK');
        }
      }

      await Promise.all(
        attempts.map(() => 
          expect(service.login(mockEmail, mockPassword)).rejects.toThrow()
        )
      );

      // حتماً باید lockout ثبت شده باشد
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should maintain separate lockout counters for different users', async () => {
      const user1 = { ...mockUser, id: 'user-1', email: 'user1@test.com' };
      const user2 = { ...mockUser, id: 'user-2', email: 'user2@test.com' };

      // کاربر 1: 5 تلاش ناموفق
      prisma.user.findUnique.mockResolvedValue(user1 as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5);
      redis.expire.mockResolvedValue(1);
      redis.setex.mockResolvedValue('OK');

      await expect(service.login(user1.email, mockPassword)).rejects.toThrow();

      expect(redis.setex).toHaveBeenCalledWith(
        `account:lockout:${user1.id}`,
        expect.any(Number),
        expect.any(String)
      );

      // کاربر 2: ورود موفق (نباید تحت تأثیر lockout کاربر 1 باشد)
      prisma.user.findUnique.mockResolvedValue(user2 as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      redis.get.mockResolvedValue(null); // کاربر 2 قفل نیست
      redis.del.mockResolvedValue(1);
      redis.hset.mockResolvedValue(0);
      redis.sadd.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(user2 as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(user2.email, mockPassword);

      expect(result.accessToken).toBeDefined();
    });
  });

  describe('Security Logging', () => {
    it('should log security event when account is locked', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5);
      redis.expire.mockResolvedValue(1);
      redis.setex.mockResolvedValue('OK');

      await expect(service.login(mockEmail, mockPassword)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] Account locked')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`userId=${mockUser.id}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`email=${mockEmail}`)
      );

      consoleSpy.mockRestore();
    });
  });
});
