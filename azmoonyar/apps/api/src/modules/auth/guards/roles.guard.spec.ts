import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: null,
      };

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    });

    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN]);
      mockRequest.user = null;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'کاربر احراز هویت نشده است',
      );
    });

    it('should allow access when user has the required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN]);
      mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]);
      mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN]);
      mockRequest.user = { id: '1', role: UserRole.STUDENT };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'شما دسترسی لازم برای انجام این عملیات را ندارید',
      );
    });

    it('should allow SUPER_ADMIN to access ORG_ADMIN endpoints when both are listed', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]);
      mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny STUDENT access to TEACHER endpoints', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.TEACHER]);
      mockRequest.user = { id: '1', role: UserRole.STUDENT };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should deny GUEST access to STUDENT endpoints', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.STUDENT]);
      mockRequest.user = { id: '1', role: UserRole.GUEST };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should use getAllAndOverride to get metadata from both handler and class', () => {
      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ORG_ADMIN]);
      mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

      guard.canActivate(mockExecutionContext);

      expect(spy).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });
  });

  describe('Role Hierarchy Tests', () => {
    let mockExecutionContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: null,
      };

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    });

    it('should allow access for all role combinations when specified', () => {
      const roleTests = [
        {
          required: [
            UserRole.SUPER_ADMIN,
            UserRole.ORG_ADMIN,
            UserRole.TEACHER,
          ],
          userRole: UserRole.TEACHER,
          expected: true,
        },
        {
          required: [UserRole.TEACHER, UserRole.ORG_ADMIN],
          userRole: UserRole.ORG_ADMIN,
          expected: true,
        },
        {
          required: [UserRole.STUDENT, UserRole.TEACHER],
          userRole: UserRole.STUDENT,
          expected: true,
        },
      ];

      roleTests.forEach(({ required, userRole, expected }) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
        mockRequest.user = { id: '1', role: userRole };

        const result = guard.canActivate(mockExecutionContext);
        expect(result).toBe(expected);
      });
    });
  });
});
