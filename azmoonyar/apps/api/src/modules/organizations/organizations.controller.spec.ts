import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from './invitations.service';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('OrganizationsController - RBAC Integration', () => {
  let controller: OrganizationsController;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockOrganizationsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMembers: jest.fn(),
    removeMember: jest.fn(),
  };

  const mockInvitationsService = {
    inviteMember: jest.fn(),
    acceptInvitation: jest.fn(),
    listPendingInvitations: jest.fn(),
    revokeInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
        RolesGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<OrganizationsController>(
      OrganizationsController,
    );
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(rolesGuard).toBeDefined();
  });

  describe('Role-based Access Control Tests', () => {
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

    describe('Create Organization Endpoint', () => {
      it('should allow SUPER_ADMIN to create organization', () => {
        const requiredRoles = Reflect.getMetadata(
          'roles',
          controller.create,
        );
        expect(requiredRoles).toContain(UserRole.SUPER_ADMIN);
        expect(requiredRoles).toContain(UserRole.ORG_ADMIN);

        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should allow ORG_ADMIN to create organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny TEACHER access to create organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.TEACHER };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });

      it('should deny STUDENT access to create organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.STUDENT };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('List Organizations Endpoint', () => {
      it('should allow any authenticated user to list organizations', () => {
        // No @Roles() decorator means all authenticated users can access
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        mockRequest.user = { id: '1', role: UserRole.STUDENT };
        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });
    });

    describe('Update Organization Endpoint', () => {
      it('should allow SUPER_ADMIN to update organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should allow ORG_ADMIN to update organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny TEACHER access to update organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.TEACHER };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Delete Organization Endpoint', () => {
      it('should allow SUPER_ADMIN to delete organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny STUDENT access to delete organization', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.STUDENT };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Get Members Endpoint', () => {
      it('should allow SUPER_ADMIN to view members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should allow ORG_ADMIN to view members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny TEACHER access to view members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.TEACHER };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Remove Member Endpoint', () => {
      it('should allow ORG_ADMIN to remove members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny STUDENT access to remove members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.STUDENT };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Invite Member Endpoint', () => {
      it('should allow SUPER_ADMIN to invite members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should allow ORG_ADMIN to invite members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny TEACHER access to invite members', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.TEACHER };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Accept Invitation Endpoint', () => {
      it('should allow any authenticated user to accept their own invitation', () => {
        // No @Roles() decorator means all authenticated users can access
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        mockRequest.user = { id: '1', role: UserRole.STUDENT };
        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });
    });

    describe('List Invitations Endpoint', () => {
      it('should allow ORG_ADMIN to list invitations', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.ORG_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny STUDENT access to list invitations', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.STUDENT };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Revoke Invitation Endpoint', () => {
      it('should allow SUPER_ADMIN to revoke invitations', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.SUPER_ADMIN };

        const result = rolesGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should deny GUEST access to revoke invitations', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]);
        mockRequest.user = { id: '1', role: UserRole.GUEST };

        expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(
          ForbiddenException,
        );
      });
    });
  });

  describe('Permission Matrix Validation', () => {
    it('should validate complete permission matrix', () => {
      const permissionMatrix = {
        create: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        update: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        delete: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        getMembers: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        removeMember: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        inviteMember: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        listInvitations: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
        revokeInvitation: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
      };

      // Verify each method has correct roles
      expect(Reflect.getMetadata('roles', controller.create)).toEqual(
        permissionMatrix.create,
      );
      expect(Reflect.getMetadata('roles', controller.update)).toEqual(
        permissionMatrix.update,
      );
      expect(Reflect.getMetadata('roles', controller.remove)).toEqual(
        permissionMatrix.delete,
      );
      expect(Reflect.getMetadata('roles', controller.getMembers)).toEqual(
        permissionMatrix.getMembers,
      );
      expect(Reflect.getMetadata('roles', controller.removeMember)).toEqual(
        permissionMatrix.removeMember,
      );
      expect(Reflect.getMetadata('roles', controller.inviteMember)).toEqual(
        permissionMatrix.inviteMember,
      );
      expect(
        Reflect.getMetadata('roles', controller.listInvitations),
      ).toEqual(permissionMatrix.listInvitations);
      expect(
        Reflect.getMetadata('roles', controller.revokeInvitation),
      ).toEqual(permissionMatrix.revokeInvitation);
    });
  });
});
