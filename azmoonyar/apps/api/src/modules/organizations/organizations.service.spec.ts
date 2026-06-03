import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsDto } from './dto/list-organizations.dto';
import { UserRole, UserStatus } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('باید سازمان جدید ایجاد کند و کاربر را به ORG_ADMIN تبدیل کند', async () => {
      const userId = 'user-123';
      const dto: CreateOrganizationDto = {
        name: 'مدرسه علامه',
        slug: 'allameh',
        logoUrl: 'https://example.com/logo.png',
        domain: 'allameh.edu',
      };

      const createdOrg = {
        id: 'org-123',
        ...dto,
        planId: null,
        settings: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(createdOrg);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.create(userId, dto);

      expect(result).toEqual(createdOrg);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: dto.slug },
      });
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { domain: dto.domain },
      });
      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: 'ORG_ADMIN', orgId: createdOrg.id },
      });
    });

    it('باید خطا بدهد اگر slug تکراری باشد', async () => {
      const userId = 'user-123';
      const dto: CreateOrganizationDto = {
        name: 'مدرسه علامه',
        slug: 'allameh',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'existing-org' });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.organization.create).not.toHaveBeenCalled();
    });

    it('باید خطا بدهد اگر domain تکراری باشد', async () => {
      const userId = 'user-123';
      const dto: CreateOrganizationDto = {
        name: 'مدرسه علامه',
        slug: 'allameh',
        domain: 'allameh.edu',
      };

      // اولین findUnique برای slug - null برمی‌گرداند (slug موجود نیست)
      // دومین findUnique برای domain - یک سازمان برمی‌گرداند (domain موجود است)
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-org' });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.organization.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('باید لیست سازمان‌ها را برای SUPER_ADMIN برگرداند', async () => {
      const userId = 'user-123';
      const query: ListOrganizationsDto = { page: 1, limit: 20 };

      const mockUser = { id: userId, role: 'SUPER_ADMIN', orgId: null };
      const mockOrgs = [
        { id: 'org-1', name: 'مدرسه 1', slug: 'school-1', _count: { members: 10, exams: 5, questionBanks: 2 } },
        { id: 'org-2', name: 'مدرسه 2', slug: 'school-2', _count: { members: 15, exams: 8, questionBanks: 3 } },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.findMany.mockResolvedValue(mockOrgs);
      mockPrismaService.organization.count.mockResolvedValue(2);

      const result = await service.findAll(userId, query);

      expect(result).toEqual({
        data: mockOrgs,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      });
    });

    it('باید فقط سازمان خود کاربر را برای ORG_ADMIN برگرداند', async () => {
      const userId = 'user-123';
      const query: ListOrganizationsDto = { page: 1, limit: 20 };

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId: 'org-1' };
      const mockOrg = { id: 'org-1', name: 'مدرسه 1', slug: 'school-1', _count: { members: 10, exams: 5, questionBanks: 2 } };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrg]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      const result = await service.findAll(userId, query);

      expect(result.data).toEqual([mockOrg]);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'org-1' }),
        })
      );
    });

    it('باید خطای Forbidden بدهد برای کاربران غیر مجاز', async () => {
      const userId = 'user-123';
      const query: ListOrganizationsDto = { page: 1, limit: 20 };

      const mockUser = { id: userId, role: 'STUDENT', orgId: 'org-1' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.findAll(userId, query)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('باید جزئیات سازمان را برگرداند', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId };
      const mockOrg = {
        id: orgId,
        name: 'مدرسه علامه',
        slug: 'allameh',
        _count: { members: 10, exams: 5, questionBanks: 2 },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findOne(orgId, userId);

      expect(result).toEqual(mockOrg);
    });

    it('باید خطای NotFound بدهد اگر سازمان وجود نداشته باشد', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';

      const mockUser = { id: userId, role: 'SUPER_ADMIN', orgId: null };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne(orgId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('باید سازمان را بر اساس slug برگرداند', async () => {
      const userId = 'user-123';
      const slug = 'allameh';

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId: 'org-123' };
      const mockOrg = {
        id: 'org-123',
        name: 'مدرسه علامه',
        slug,
        _count: { members: 10, exams: 5, questionBanks: 2 },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findBySlug(slug, userId);

      expect(result).toEqual(mockOrg);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('باید سازمان را به‌روزرسانی کند', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';
      const dto: UpdateOrganizationDto = {
        name: 'مدرسه علامه جدید',
      };

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId };
      const updatedOrg = { id: orgId, ...dto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.update.mockResolvedValue(updatedOrg);

      const result = await service.update(orgId, userId, dto);

      expect(result).toEqual(updatedOrg);
      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: orgId },
        data: dto,
      });
    });

    it('باید خطا بدهد اگر domain جدید تکراری باشد', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';
      const dto: UpdateOrganizationDto = {
        domain: 'existing.edu',
      };

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.findFirst.mockResolvedValue({ id: 'other-org' });

      await expect(service.update(orgId, userId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('باید سازمان را غیرفعال کند (soft delete)', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organization.update.mockResolvedValue({ id: orgId, status: 'inactive' });

      await service.remove(orgId, userId);

      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: orgId },
        data: { status: 'inactive' },
      });
    });
  });

  describe('getMembers', () => {
    it('باید لیست اعضای سازمان را برگرداند', async () => {
      const userId = 'user-123';
      const orgId = 'org-123';

      const mockUser = { id: userId, role: 'ORG_ADMIN', orgId };
      const mockMembers = [
        { id: 'user-1', name: 'علی', email: 'ali@example.com', role: 'TEACHER' },
        { id: 'user-2', name: 'سارا', email: 'sara@example.com', role: 'STUDENT' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findMany.mockResolvedValue(mockMembers);

      const result = await service.getMembers(orgId, userId);

      expect(result).toEqual(mockMembers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { orgId },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('removeMember', () => {
    it('باید عضو را از سازمان حذف کند', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin) // برای checkAdminAccess
        .mockResolvedValueOnce(mockMember); // برای بررسی عضویت
      mockPrismaService.user.update.mockResolvedValue({});

      await service.removeMember(orgId, memberId, adminId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { orgId: null, role: 'STUDENT' },
      });
    });

    it('باید خطا بدهد اگر ادمین بخواهد خودش را حذف کند', async () => {
      const adminId = 'admin-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.removeMember(orgId, adminId, adminId)).rejects.toThrow(ForbiddenException);
    });

    it('باید خطا بدهد اگر عضو یافت نشود', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(null);

      await expect(service.removeMember(orgId, memberId, adminId)).rejects.toThrow(NotFoundException);
    });

    it('باید خطا بدهد اگر عضو متعلق به سازمان نباشد', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId: 'other-org', role: 'STUDENT', status: 'ACTIVE' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);

      await expect(service.removeMember(orgId, memberId, adminId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('suspendMember', () => {
    it('باید حساب کاربری عضو را تعلیق کند', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };
      const suspendedMember = { ...mockMember, status: 'SUSPENDED' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.user.update.mockResolvedValue(suspendedMember);

      const result = await service.suspendMember(orgId, memberId, adminId);

      expect(result).toEqual(suspendedMember);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: 'SUSPENDED' },
      });
    });

    it('باید خطا بدهد اگر ادمین بخواهد خودش را تعلیق کند', async () => {
      const adminId = 'admin-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.suspendMember(orgId, adminId, adminId)).rejects.toThrow(ForbiddenException);
    });

    it('باید خطا بدهد اگر عضو قبلاً تعلیق شده باشد', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'SUSPENDED' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);

      await expect(service.suspendMember(orgId, memberId, adminId)).rejects.toThrow('این عضو قبلاً تعلیق شده است');
    });
  });

  describe('activateMember', () => {
    it('باید حساب کاربری عضو را فعال کند', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'SUSPENDED' };
      const activatedMember = { ...mockMember, status: 'ACTIVE' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.user.update.mockResolvedValue(activatedMember);

      const result = await service.activateMember(orgId, memberId, adminId);

      expect(result).toEqual(activatedMember);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: 'ACTIVE' },
      });
    });

    it('باید خطا بدهد اگر عضو قبلاً فعال باشد', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);

      await expect(service.activateMember(orgId, memberId, adminId)).rejects.toThrow('این عضو قبلاً فعال است');
    });
  });

  describe('updateMemberRole', () => {
    it('باید نقش عضو را تغییر دهد', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';
      const dto = { role: UserRole.TEACHER };

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };
      const updatedMember = { ...mockMember, role: UserRole.TEACHER };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.user.update.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(orgId, memberId, adminId, dto);

      expect(result).toEqual(updatedMember);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { role: 'TEACHER' },
      });
    });

    it('باید خطا بدهد اگر ادمین بخواهد نقش خودش را تغییر دهد', async () => {
      const adminId = 'admin-123';
      const orgId = 'org-123';
      const dto = { role: UserRole.TEACHER };

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.updateMemberRole(orgId, adminId, adminId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('باید خطا بدهد اگر ORG_ADMIN بخواهد کسی را به SUPER_ADMIN تبدیل کند', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';
      const dto = { role: UserRole.SUPER_ADMIN };

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(mockAdmin); // برای بررسی نقش admin

      await expect(service.updateMemberRole(orgId, memberId, adminId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('باید SUPER_ADMIN بتواند کسی را به SUPER_ADMIN تبدیل کند', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';
      const dto = { role: UserRole.SUPER_ADMIN };

      const mockAdmin = { id: adminId, role: 'SUPER_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };
      const updatedMember = { ...mockMember, role: UserRole.SUPER_ADMIN };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(mockAdmin);
      mockPrismaService.user.update.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(orgId, memberId, adminId, dto);

      expect(result).toEqual(updatedMember);
    });
  });

  describe('updateMemberStatus', () => {
    it('باید وضعیت عضو را تغییر دهد', async () => {
      const adminId = 'admin-123';
      const memberId = 'member-123';
      const orgId = 'org-123';
      const dto = { status: UserStatus.SUSPENDED };

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };
      const mockMember = { id: memberId, orgId, role: 'STUDENT', status: 'ACTIVE' };
      const updatedMember = { ...mockMember, status: UserStatus.SUSPENDED };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.user.update.mockResolvedValue(updatedMember);

      const result = await service.updateMemberStatus(orgId, memberId, adminId, dto);

      expect(result).toEqual(updatedMember);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: 'SUSPENDED' },
      });
    });

    it('باید خطا بدهد اگر ادمین بخواهد وضعیت خودش را تغییر دهد', async () => {
      const adminId = 'admin-123';
      const orgId = 'org-123';
      const dto = { status: UserStatus.SUSPENDED };

      const mockAdmin = { id: adminId, role: 'ORG_ADMIN', orgId };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.updateMemberStatus(orgId, adminId, adminId, dto)).rejects.toThrow(ForbiddenException);
    });
  });
});
