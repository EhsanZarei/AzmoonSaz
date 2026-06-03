import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { RedisService } from '../../redis/redis.service';

interface UpdateProfileData {
  name?: string;
  email?: string;
  organizationName?: string;
  position?: string;
}

interface UpdateNotificationsData {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  inAppNotifications?: boolean;
  examCompletedNotif?: boolean;
  newStudentNotif?: boolean;
  reportReadyNotif?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private redis: RedisService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        orgId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(
    id: string,
    data: UpdateProfileData,
    avatarFile?: Express.Multer.File,
  ) {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email) {
      // بررسی یکتا بودن ایمیل
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ForbiddenException('این ایمیل قبلاً استفاده شده است');
      }
      updateData.email = data.email;
    }

    // آپلود آواتار در صورت وجود فایل
    if (avatarFile) {
      const avatarUrl = await this.storage.uploadFile(
        avatarFile,
        `avatars/${id}`,
      );
      updateData.avatarUrl = avatarUrl;
    }

    // ذخیره اطلاعات سازمانی در metadata (فیلد JSON)
    if (data.organizationName || data.position) {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { metadata: true },
      });
      const metadata = (user?.metadata as any) || {};
      if (data.organizationName)
        metadata.organizationName = data.organizationName;
      if (data.position) metadata.position = data.position;
      updateData.metadata = metadata;
    }

    return this.prisma.user.update({ where: { id }, data: updateData });
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const avatarUrl = await this.storage.uploadFile(file, `avatars/${id}`);
    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
    });
  }

  async updateNotifications(id: string, data: UpdateNotificationsData) {
    // ذخیره تنظیمات اعلان در Redis
    const key = `user:${id}:notifications`;
    await this.redis.set(key, JSON.stringify(data));

    // همچنین در دیتابیس ذخیره می‌کنیم (در فیلد metadata)
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { metadata: true },
    });
    const metadata = (user?.metadata as any) || {};
    metadata.notifications = data;

    await this.prisma.user.update({
      where: { id },
      data: { metadata },
    });

    return { success: true, message: 'تنظیمات اعلان به‌روز شد' };
  }

  async getUserSessions(userId: string) {
    // واکشی session های فعال از Redis
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    const sessions = await Promise.all(
      keys.map(async (key) => {
        const data = await this.redis.get(key);
        if (!data) return null;
        const session = JSON.parse(data);
        const sessionId = key.split(':')[2];
        return {
          id: sessionId,
          device: session.device || 'Unknown Device',
          browser: session.browser || 'Unknown Browser',
          os: session.os || 'Unknown OS',
          ip: session.ip,
          lastActivity: session.lastActivity || new Date(),
          isCurrent: session.isCurrent || false,
        };
      }),
    );

    return sessions.filter((s) => s !== null);
  }

  async revokeSession(userId: string, sessionId: string) {
    const key = `session:${userId}:${sessionId}`;
    const exists = await this.redis.exists(key);

    if (!exists) {
      throw new NotFoundException('نشست یافت نشد');
    }

    await this.redis.del(key);
    return { success: true, message: 'دستگاه با موفقیت خارج شد' };
  }

  async revokeAllSessions(userId: string, currentSessionId?: string) {
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    const keysToDelete = keys.filter(
      (key) => !currentSessionId || !key.includes(currentSessionId),
    );

    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
    }

    return {
      success: true,
      message: `${keysToDelete.length} دستگاه خارج شدند`,
    };
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
