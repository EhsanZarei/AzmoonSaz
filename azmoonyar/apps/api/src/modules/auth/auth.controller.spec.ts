import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    getActiveSessions: jest.fn(),
    googleLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('باید با موفقیت OTP ارسال کند', async () => {
      const dto: SendOtpDto = { phone: '09123456789' };
      const result = { token: 'temp_token_123' };

      mockAuthService.sendOtp.mockResolvedValue(result);

      expect(await controller.sendOtp(dto)).toBe(result);
      expect(mockAuthService.sendOtp).toHaveBeenCalledWith(dto.phone);
    });
  });

  describe('verifyOtp', () => {
    it('باید با موفقیت OTP را تأیید کند و توکن‌ها را برگرداند', async () => {
      const dto: VerifyOtpDto = { token: 'temp_token', otp: '123456' };
      const result = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        user: { id: 'user123', role: 'STUDENT', orgId: null },
      };

      mockAuthService.verifyOtp.mockResolvedValue(result);

      expect(await controller.verifyOtp(dto)).toBe(result);
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(dto.token, dto.otp);
    });
  });

  describe('register', () => {
    it('باید با موفقیت کاربر جدید ثبت‌نام کند', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'علی احمدی',
      };
      const result = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        user: {
          id: 'user123',
          email: dto.email,
          name: dto.name,
          role: 'STUDENT',
          orgId: null,
        },
      };

      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(dto)).toBe(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto.email, dto.password, dto.name);
    });
  });

  describe('login', () => {
    it('باید با موفقیت کاربر را وارد سیستم کند', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const result = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        user: {
          id: 'user123',
          email: dto.email,
          name: 'علی احمدی',
          role: 'STUDENT',
          orgId: null,
        },
      };

      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto)).toBe(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto.email, dto.password);
    });
  });

  describe('refresh', () => {
    it('باید با موفقیت توکن‌ها را تجدید کند', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'old_refresh_token' };
      const result = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        user: { id: 'user123', role: 'STUDENT', orgId: null },
      };

      mockAuthService.refreshTokens.mockResolvedValue(result);

      expect(await controller.refresh(dto)).toBe(result);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('logout', () => {
    it('باید با موفقیت کاربر را از سیستم خارج کند', async () => {
      const req = { user: { id: 'user123' } };
      const dto: RefreshTokenDto = { refreshToken: 'refresh_token' };
      const result = { success: true };

      mockAuthService.logout.mockResolvedValue(result);

      expect(await controller.logout(req, dto)).toBe(result);
      expect(mockAuthService.logout).toHaveBeenCalledWith(req.user.id, dto.refreshToken);
    });
  });

  describe('logoutAll', () => {
    it('باید کاربر را از همه دستگاه‌ها خارج کند', async () => {
      const req = { user: { id: 'user123' } };
      const result = { success: true, revokedCount: 3 };

      mockAuthService.logoutAll.mockResolvedValue(result);

      expect(await controller.logoutAll(req)).toBe(result);
      expect(mockAuthService.logoutAll).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('getSessions', () => {
    it('باید لیست نشست‌های فعال را برگرداند', async () => {
      const req = { user: { id: 'user123' } };
      const result = [
        {
          jti: 'jti1',
          issuedAt: new Date('2024-01-01'),
          expiresAt: new Date('2024-02-01'),
        },
      ];

      mockAuthService.getActiveSessions.mockResolvedValue(result);

      expect(await controller.getSessions(req)).toBe(result);
      expect(mockAuthService.getActiveSessions).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('Google OAuth', () => {
    describe('googleAuth', () => {
      it('باید endpoint شروع OAuth وجود داشته باشد', async () => {
        // این endpoint فقط redirect به Google می‌کند
        // Guard خودش این کار را انجام می‌دهد
        expect(controller.googleAuth).toBeDefined();
      });
    });

    describe('googleAuthCallback', () => {
      it('باید callback گوگل را مدیریت کند و به frontend هدایت کند', async () => {
        const req = {
          user: {
            googleId: 'google123',
            email: 'user@gmail.com',
            firstName: 'علی',
            lastName: 'احمدی',
            picture: 'https://example.com/photo.jpg',
          },
        };
        const mockRes = {
          redirect: jest.fn(),
        } as unknown as Response;

        const authResult = {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          user: {
            id: 'user123',
            email: 'user@gmail.com',
            name: 'علی احمدی',
            role: 'STUDENT',
            orgId: null,
          },
        };

        mockAuthService.googleLogin.mockResolvedValue(authResult);

        await controller.googleAuthCallback(req, mockRes);

        expect(mockAuthService.googleLogin).toHaveBeenCalledWith(req.user);
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('access_token=access_token_123'),
        );
        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('refresh_token=refresh_token_123'),
        );
      });

      it('باید از FRONTEND_URL از متغیر محیطی استفاده کند', async () => {
        const originalFrontendUrl = process.env.FRONTEND_URL;
        process.env.FRONTEND_URL = 'https://app.example.com';

        const req = {
          user: {
            googleId: 'google123',
            email: 'user@gmail.com',
            firstName: 'علی',
            lastName: 'احمدی',
            picture: 'https://example.com/photo.jpg',
          },
        };
        const mockRes = {
          redirect: jest.fn(),
        } as unknown as Response;

        const authResult = {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          user: {
            id: 'user123',
            email: 'user@gmail.com',
            name: 'علی احمدی',
            role: 'STUDENT',
            orgId: null,
          },
        };

        mockAuthService.googleLogin.mockResolvedValue(authResult);

        await controller.googleAuthCallback(req, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledWith(
          expect.stringContaining('https://app.example.com/auth/callback'),
        );

        // بازگرداندن به حالت قبل
        process.env.FRONTEND_URL = originalFrontendUrl;
      });
    });
  });
});
