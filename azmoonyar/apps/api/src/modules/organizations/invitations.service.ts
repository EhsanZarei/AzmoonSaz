import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException, 
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, InvitationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {
    this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * دعوت عضو جدید به سازمان
   */
  async inviteMember(
    orgId: string,
    inviterId: string,
    email: string,
    role: UserRole = UserRole.STUDENT,
  ) {
    // بررسی دسترسی مدیریتی
    await this.checkAdminAccess(orgId, inviterId);

    // نرمال‌سازی ایمیل
    const normalizedEmail = email.toLowerCase().trim();

    // بررسی اعتبار نقش (فقط TEACHER، STUDENT مجاز هستند)
    const allowedRoles: UserRole[] = [UserRole.TEACHER, UserRole.STUDENT];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException('فقط نقش‌های معلم و دانش‌آموز برای دعوت مجاز هستند');
    }

    // بررسی وجود کاربر در سازمان
    const existingMember = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, orgId },
    });
    if (existingMember) {
      throw new ConflictException('این کاربر قبلاً عضو سازمان است');
    }

    // بررسی دعوت‌نامه معلق موجود
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email: normalizedEmail,
        orgId,
        status: InvitationStatus.PENDING,
        expiresAt: { gte: new Date() },
      },
    });
    if (existingInvitation) {
      throw new ConflictException('دعوت‌نامه‌ای برای این ایمیل در انتظار تأیید است');
    }

    // Rate limiting: بررسی تعداد دعوت‌نامه‌های یک ساعت گذشته
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInvitations = await this.prisma.invitation.count({
      where: {
        orgId,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentInvitations >= 10) {
      throw new BadRequestException('محدودیت تعداد دعوت‌نامه: حداکثر ۱۰ دعوت در ساعت');
    }

    // تولید توکن یکتا
    const token = randomUUID();

    // تاریخ انقضا: ۷ روز
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ایجاد دعوت‌نامه
    const invitation = await this.prisma.invitation.create({
      data: {
        email: normalizedEmail,
        orgId,
        invitedBy: inviterId,
        role,
        token,
        expiresAt,
      },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });

    // ارسال ایمیل دعوت
    try {
      await this.sendInvitationEmail(invitation);
    } catch (error) {
      this.logger.error(`Failed to send invitation email: ${error.message}`);
      // ادامه می‌دهیم چون دعوت‌نامه ایجاد شده است
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  /**
   * پذیرش دعوت‌نامه
   */
  async acceptInvitation(token: string, userId: string) {
    // پیدا کردن دعوت‌نامه
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('دعوت‌نامه یافت نشد');
    }

    // بررسی وضعیت
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('این دعوت‌نامه قبلاً پذیرفته یا لغو شده است');
    }

    // بررسی انقضا
    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('این دعوت‌نامه منقضی شده است');
    }

    // دریافت اطلاعات کاربر
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    // بررسی تطابق ایمیل (اگر کاربر ایمیل دارد)
    if (user.email && user.email.toLowerCase() !== invitation.email) {
      throw new ForbiddenException('این دعوت‌نامه برای ایمیل دیگری است');
    }

    // بررسی عضویت فعلی
    if (user.orgId) {
      throw new ConflictException('شما قبلاً عضو یک سازمان هستید');
    }

    // به‌روزرسانی کاربر
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        orgId: invitation.orgId,
        role: invitation.role,
        email: user.email || invitation.email, // تنظیم ایمیل اگر نداشت
      },
    });

    // به‌روزرسانی دعوت‌نامه
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      message: 'با موفقیت به سازمان پیوستید',
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
      role: invitation.role,
    };
  }

  /**
   * لیست دعوت‌نامه‌های معلق سازمان
   */
  async listPendingInvitations(orgId: string, userId: string) {
    await this.checkAdminAccess(orgId, userId);

    return this.prisma.invitation.findMany({
      where: {
        orgId,
        status: InvitationStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * لغو دعوت‌نامه
   */
  async revokeInvitation(orgId: string, invitationId: string, userId: string) {
    await this.checkAdminAccess(orgId, userId);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('دعوت‌نامه یافت نشد');
    }

    if (invitation.orgId !== orgId) {
      throw new ForbiddenException('دسترسی ندارید');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('فقط دعوت‌نامه‌های در انتظار قابل لغو هستند');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });

    return { message: 'دعوت‌نامه لغو شد' };
  }

  /**
   * ارسال ایمیل دعوت
   */
  private async sendInvitationEmail(invitation: any) {
    const invitationLink = `${this.frontendUrl}/invitations/accept?token=${invitation.token}`;
    
    const subject = `دعوت به عضویت در سازمان ${invitation.organization.name}`;
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 دعوت به عضویت</h1>
          </div>
          <div class="content">
            <p>سلام،</p>
            <p><strong>${invitation.inviter.name}</strong> شما را به عضویت در سازمان <strong>${invitation.organization.name}</strong> در پلتفرم آزمونیار دعوت کرده است.</p>
            
            <p><strong>نقش شما:</strong> ${this.getRoleName(invitation.role)}</p>
            
            <div style="text-align: center;">
              <a href="${invitationLink}" class="button">پذیرش دعوت‌نامه</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ توجه:</strong> این دعوت‌نامه تا تاریخ <strong>${this.formatDate(invitation.expiresAt)}</strong> معتبر است (۷ روز).
            </div>
            
            <p>اگر قصد پذیرش دعوت را ندارید، این ایمیل را نادیده بگیرید.</p>
            
            <div class="footer">
              <p>این ایمیل توسط سیستم آزمونیار به صورت خودکار ارسال شده است.</p>
              <p>لینک دعوت: <a href="${invitationLink}">${invitationLink}</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.notifications.sendEmail(invitation.email, subject, html);
  }

  /**
   * بررسی دسترسی مدیریتی
   */
  private async checkAdminAccess(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    if (user.role === UserRole.SUPER_ADMIN) return;

    if (user.role !== UserRole.ORG_ADMIN || user.orgId !== orgId) {
      throw new ForbiddenException('دسترسی ندارید');
    }
  }

  /**
   * تبدیل نام نقش به فارسی
   */
  private getRoleName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'مدیر کل',
      [UserRole.ORG_ADMIN]: 'مدیر سازمان',
      [UserRole.TEACHER]: 'معلم',
      [UserRole.STUDENT]: 'دانش‌آموز',
      [UserRole.GUEST]: 'مهمان',
    };
    return roleNames[role] || role;
  }

  /**
   * فرمت تاریخ فارسی
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
