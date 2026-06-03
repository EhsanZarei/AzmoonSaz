import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsDto } from './dto/list-organizations.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    // بررسی تکراری بودن slug
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('این نام کاربری قبلاً استفاده شده است');

    // بررسی تکراری بودن domain (اگر وارد شده باشد)
    if (dto.domain) {
      const existingDomain = await this.prisma.organization.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) throw new ConflictException('این دامنه قبلاً استفاده شده است');
    }

    const org = await this.prisma.organization.create({ data: dto });

    // تبدیل کاربر به ORG_ADMIN
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ORG_ADMIN', orgId: org.id },
    });

    return org;
  }

  async findAll(userId: string, query: ListOrganizationsDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    // بررسی نقش کاربر
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    // فیلتر بر اساس نقش: SUPER_ADMIN همه را می‌بیند، ORG_ADMIN فقط سازمان خودش را
    const where: any = {};
    if (user.role === 'ORG_ADMIN' && user.orgId) {
      where.id = user.orgId;
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('دسترسی ندارید');
    }

    // فیلترهای اضافی
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { 
            select: { 
              members: true, 
              exams: true,
              questionBanks: true,
            } 
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    await this.checkAccess(id, userId);
    
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { 
        _count: { 
          select: { 
            members: true, 
            exams: true,
            questionBanks: true,
          } 
        } 
      },
    });
    
    if (!org) throw new NotFoundException('سازمان یافت نشد');
    return org;
  }

  async findBySlug(slug: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: { 
        _count: { 
          select: { 
            members: true, 
            exams: true,
            questionBanks: true,
          } 
        } 
      },
    });
    
    if (!org) throw new NotFoundException('سازمان یافت نشد');
    
    // بررسی دسترسی
    await this.checkAccess(org.id, userId);
    
    return org;
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.checkAdminAccess(id, userId);
    
    // بررسی تکراری بودن domain (اگر تغییر کرده باشد)
    if (dto.domain) {
      const existingDomain = await this.prisma.organization.findFirst({
        where: { 
          domain: dto.domain,
          id: { not: id }
        },
      });
      if (existingDomain) throw new ConflictException('این دامنه قبلاً استفاده شده است');
    }
    
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.checkAdminAccess(id, userId);
    
    // Soft delete - تغییر وضعیت به inactive
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async getMembers(orgId: string, userId: string) {
    await this.checkAccess(orgId, userId);
    return this.prisma.user.findMany({
      where: { orgId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeMember(orgId: string, memberId: string, adminId: string) {
    await this.checkAdminAccess(orgId, adminId);
    if (memberId === adminId) throw new ForbiddenException('نمی‌توانید خودتان را حذف کنید');

    // بررسی اینکه عضو متعلق به همین سازمان است
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('عضو یافت نشد');
    }

    if (member.orgId !== orgId) {
      throw new ForbiddenException('این عضو متعلق به این سازمان نیست');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { orgId: null, role: 'STUDENT' },
    });
  }

  /**
   * تعلیق حساب کاربری عضو
   */
  async suspendMember(orgId: string, memberId: string, adminId: string) {
    await this.checkAdminAccess(orgId, adminId);
    if (memberId === adminId) {
      throw new ForbiddenException('نمی‌توانید خودتان را تعلیق کنید');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('عضو یافت نشد');
    }

    if (member.orgId !== orgId) {
      throw new ForbiddenException('این عضو متعلق به این سازمان نیست');
    }

    if (member.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('این عضو قبلاً تعلیق شده است');
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { status: UserStatus.SUSPENDED },
    });
  }

  /**
   * فعال‌سازی مجدد حساب کاربری عضو
   */
  async activateMember(orgId: string, memberId: string, adminId: string) {
    await this.checkAdminAccess(orgId, adminId);

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('عضو یافت نشد');
    }

    if (member.orgId !== orgId) {
      throw new ForbiddenException('این عضو متعلق به این سازمان نیست');
    }

    if (member.status === UserStatus.ACTIVE) {
      throw new BadRequestException('این عضو قبلاً فعال است');
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { status: UserStatus.ACTIVE },
    });
  }

  /**
   * تغییر نقش عضو
   */
  async updateMemberRole(orgId: string, memberId: string, adminId: string, dto: UpdateMemberRoleDto) {
    await this.checkAdminAccess(orgId, adminId);
    
    if (memberId === adminId) {
      throw new ForbiddenException('نمی‌توانید نقش خودتان را تغییر دهید');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('عضو یافت نشد');
    }

    if (member.orgId !== orgId) {
      throw new ForbiddenException('این عضو متعلق به این سازمان نیست');
    }

    // محدودیت: فقط SUPER_ADMIN می‌تواند کسی را به SUPER_ADMIN تبدیل کند
    if (dto.role === UserRole.SUPER_ADMIN) {
      const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
      if (admin?.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('فقط SUPER_ADMIN می‌تواند این نقش را تخصیص دهد');
      }
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  /**
   * به‌روزرسانی وضعیت عضو (برای تعلیق و فعال‌سازی)
   */
  async updateMemberStatus(orgId: string, memberId: string, adminId: string, dto: UpdateMemberStatusDto) {
    await this.checkAdminAccess(orgId, adminId);

    if (memberId === adminId) {
      throw new ForbiddenException('نمی‌توانید وضعیت خودتان را تغییر دهید');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('عضو یافت نشد');
    }

    if (member.orgId !== orgId) {
      throw new ForbiddenException('این عضو متعلق به این سازمان نیست');
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { status: dto.status },
    });
  }

  /**
   * بررسی دسترسی مدیریتی (فقط ORG_ADMIN یا SUPER_ADMIN)
   */
  private async checkAdminAccess(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    
    if (user.role === 'SUPER_ADMIN') return; // SUPER_ADMIN دسترسی کامل دارد
    
    if (user.role !== 'ORG_ADMIN' || user.orgId !== orgId) {
      throw new ForbiddenException('دسترسی ندارید');
    }
  }

  /**
   * بررسی دسترسی برای مشاهده (SUPER_ADMIN یا اعضای سازمان)
   */
  private async checkAccess(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    
    if (user.role === 'SUPER_ADMIN') return; // SUPER_ADMIN دسترسی کامل دارد
    
    if (user.orgId !== orgId) {
      throw new ForbiddenException('دسترسی ندارید');
    }
  }
}
