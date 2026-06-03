import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { 
  ConflictException, 
  BadRequestException, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { UserRole, InvitationStatus } from '@prisma/client';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockInviterId = 'inviter-123';
  const mockEmail = 'test@example.com';

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    sendEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteMember', () => {
    const mockAdminUser = {
      id: mockInviterId,
      role: UserRole.ORG_ADMIN,
      orgId: mockOrgId,
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser as any);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.invitation.findFirst.mockResolvedValue(null);
      mockPrismaService.invitation.count.mockResolvedValue(0);
      mockNotificationsService.sendEmail.mockResolvedValue(undefined);
    });

    it('should create invitation successfully', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: mockEmail,
        orgId: mockOrgId,
        invitedBy: mockInviterId,
        role: UserRole.STUDENT,
        token: 'token-123',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(),
        createdAt: new Date(),
        organization: { name: 'Test Org' },
        inviter: { name: 'Inviter' },
      };

      mockPrismaService.invitation.create.mockResolvedValue(mockInvitation as any);

      const result = await service.inviteMember(
        mockOrgId,
        mockInviterId,
        mockEmail,
        UserRole.STUDENT,
      );

      expect(result.email).toBe(mockEmail);
      expect(result.role).toBe(UserRole.STUDENT);
      expect(result.status).toBe(InvitationStatus.PENDING);
      expect(mockPrismaService.invitation.create).toHaveBeenCalled();
      expect(mockNotificationsService.sendEmail).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockInviterId,
        role: UserRole.STUDENT,
        orgId: mockOrgId,
      } as any);

      await expect(
        service.inviteMember(mockOrgId, mockInviterId, mockEmail),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user already member', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' } as any);

      await expect(
        service.inviteMember(mockOrgId, mockInviterId, mockEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      mockPrismaService.invitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
      } as any);

      await expect(
        service.inviteMember(mockOrgId, mockInviterId, mockEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if role is not allowed', async () => {
      await expect(
        service.inviteMember(mockOrgId, mockInviterId, mockEmail, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rate limit exceeded', async () => {
      mockPrismaService.invitation.count.mockResolvedValue(11); // > 10

      await expect(
        service.inviteMember(mockOrgId, mockInviterId, mockEmail),
      ).rejects.toThrow(BadRequestException);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      const mockInvitation = {
        id: 'inv-123',
        email: upperCaseEmail.toLowerCase(),
        orgId: mockOrgId,
        invitedBy: mockInviterId,
        role: UserRole.STUDENT,
        token: 'token-123',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(),
        createdAt: new Date(),
        organization: { name: 'Test Org' },
        inviter: { name: 'Inviter' },
      };

      mockPrismaService.invitation.create.mockResolvedValue(mockInvitation as any);

      const result = await service.inviteMember(
        mockOrgId,
        mockInviterId,
        upperCaseEmail,
      );

      expect(result.email).toBe(upperCaseEmail.toLowerCase());
    });
  });

  describe('acceptInvitation', () => {
    const mockToken = 'token-123';
    const mockInvitation = {
      id: 'inv-123',
      email: mockEmail,
      orgId: mockOrgId,
      invitedBy: mockInviterId,
      role: UserRole.STUDENT,
      token: mockToken,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      organization: { id: mockOrgId, name: 'Test Org', slug: 'test-org' },
    };

    const mockUser = {
      id: mockUserId,
      email: mockEmail,
      orgId: null,
    };

    beforeEach(() => {
      mockPrismaService.invitation.findUnique.mockResolvedValue(mockInvitation as any);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrismaService.user.update.mockResolvedValue({} as any);
      mockPrismaService.invitation.update.mockResolvedValue({} as any);
    });

    it('should accept invitation successfully', async () => {
      const result = await service.acceptInvitation(mockToken, mockUserId);

      expect(result.message).toContain('موفقیت');
      expect(result.organization.id).toBe(mockOrgId);
      expect(result.role).toBe(UserRole.STUDENT);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          orgId: mockOrgId,
          role: UserRole.STUDENT,
          email: mockEmail,
        },
      });
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if invitation not found', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation(mockToken, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation already accepted', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      } as any);

      await expect(
        service.acceptInvitation(mockToken, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invitation expired', async () => {
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
      } as any);

      await expect(
        service.acceptInvitation(mockToken, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if email mismatch', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        email: 'different@example.com',
      } as any);

      await expect(
        service.acceptInvitation(mockToken, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user already in organization', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        orgId: 'other-org',
      } as any);

      await expect(
        service.acceptInvitation(mockToken, mockUserId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listPendingInvitations', () => {
    const mockAdmin = {
      id: mockUserId,
      role: UserRole.ORG_ADMIN,
      orgId: mockOrgId,
    };

    it('should list pending invitations', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin as any);
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: UserRole.STUDENT,
          status: InvitationStatus.PENDING,
          expiresAt: new Date(),
          createdAt: new Date(),
          inviter: { id: mockInviterId, name: 'Inviter', email: 'inviter@example.com' },
        },
      ];
      mockPrismaService.invitation.findMany.mockResolvedValue(mockInvitations as any);

      const result = await service.listPendingInvitations(mockOrgId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('user1@example.com');
      expect(mockPrismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          status: InvitationStatus.PENDING,
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: UserRole.STUDENT,
        orgId: mockOrgId,
      } as any);

      await expect(
        service.listPendingInvitations(mockOrgId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeInvitation', () => {
    const mockInvitationId = 'inv-123';
    const mockAdmin = {
      id: mockUserId,
      role: UserRole.ORG_ADMIN,
      orgId: mockOrgId,
    };

    it('should revoke invitation successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin as any);
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: mockInvitationId,
        orgId: mockOrgId,
        status: InvitationStatus.PENDING,
      } as any);
      mockPrismaService.invitation.update.mockResolvedValue({} as any);

      const result = await service.revokeInvitation(mockOrgId, mockInvitationId, mockUserId);

      expect(result.message).toContain('لغو');
      expect(mockPrismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitationId },
        data: { status: InvitationStatus.REVOKED },
      });
    });

    it('should throw NotFoundException if invitation not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin as any);
      mockPrismaService.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeInvitation(mockOrgId, mockInvitationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation not pending', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin as any);
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: mockInvitationId,
        orgId: mockOrgId,
        status: InvitationStatus.ACCEPTED,
      } as any);

      await expect(
        service.revokeInvitation(mockOrgId, mockInvitationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if invitation from different org', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin as any);
      mockPrismaService.invitation.findUnique.mockResolvedValue({
        id: mockInvitationId,
        orgId: 'other-org',
        status: InvitationStatus.PENDING,
      } as any);

      await expect(
        service.revokeInvitation(mockOrgId, mockInvitationId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
