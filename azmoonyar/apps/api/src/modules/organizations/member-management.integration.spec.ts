import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { AppModule } from '../../app.module';
import { UserRole, UserStatus } from '@prisma/client';

describe('Member Management Integration Tests (POST /organizations/:id/members)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let orgId: string;
  let adminId: string;
  let memberId: string;
  let anotherMemberId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // ایجاد سازمان و کاربران تست
    await setupTestData();
  });

  afterAll(async () => {
    // پاک‌سازی داده‌های تست
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // ایجاد سازمان
    const org = await prisma.organization.create({
      data: {
        name: 'سازمان تست مدیریت اعضا',
        slug: 'test-member-mgmt-org',
      },
    });
    orgId = org.id;

    // ایجاد ادمین
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        name: 'ادمین تست',
        password: 'hashedpassword',
        role: UserRole.ORG_ADMIN,
        orgId: org.id,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;

    // ایجاد عضو اول
    const member = await prisma.user.create({
      data: {
        email: `member1-${Date.now()}@test.com`,
        name: 'عضو تست ۱',
        password: 'hashedpassword',
        role: UserRole.STUDENT,
        orgId: org.id,
        status: UserStatus.ACTIVE,
      },
    });
    memberId = member.id;

    // ایجاد عضو دوم
    const anotherMember = await prisma.user.create({
      data: {
        email: `member2-${Date.now()}@test.com`,
        name: 'عضو تست ۲',
        password: 'hashedpassword',
        role: UserRole.TEACHER,
        orgId: org.id,
        status: UserStatus.ACTIVE,
      },
    });
    anotherMemberId = anotherMember.id;

    // ساخت توکن‌های JWT (برای سادگی، از یک helper استفاده می‌کنیم)
    // در محیط واقعی باید از auth service استفاده کنیم
    adminToken = await generateTestToken(admin);
    memberToken = await generateTestToken(member);
  }

  async function cleanupTestData() {
    if (orgId) {
      // حذف کاربران
      await prisma.user.deleteMany({
        where: { orgId },
      });

      // حذف سازمان
      await prisma.organization.delete({
        where: { id: orgId },
      });
    }
  }

  // Helper برای ساخت توکن تست
  async function generateTestToken(user: any): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/test-token')
      .send({ userId: user.id })
      .expect(201);
    return response.body.access_token;
  }

  describe('GET /organizations/:id/members', () => {
    it('باید لیست اعضای سازمان را برگرداند', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // admin + 2 members
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('role');
    });

    it('باید خطای 403 بدهد اگر کاربر دسترسی نداشته باشد', async () => {
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('باید خطای 401 بدهد اگر توکن ارسال نشود', async () => {
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .expect(401);
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/suspend', () => {
    it('باید حساب کاربری عضو را تعلیق کند', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(UserStatus.SUSPENDED);

      // بررسی تغییر در دیتابیس
      const user = await prisma.user.findUnique({ where: { id: memberId } });
      expect(user?.status).toBe(UserStatus.SUSPENDED);
    });

    it('باید خطای 400 بدهد اگر عضو قبلاً تعلیق شده باشد', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('باید خطای 403 بدهد اگر ادمین بخواهد خودش را تعلیق کند', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${adminId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/activate', () => {
    beforeAll(async () => {
      // مطمئن شویم که یک عضو تعلیق شده داریم
      await prisma.user.update({
        where: { id: memberId },
        data: { status: UserStatus.SUSPENDED },
      });
    });

    it('باید حساب کاربری عضو را فعال کند', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(UserStatus.ACTIVE);

      // بررسی تغییر در دیتابیس
      const user = await prisma.user.findUnique({ where: { id: memberId } });
      expect(user?.status).toBe(UserStatus.ACTIVE);
    });

    it('باید خطای 400 بدهد اگر عضو قبلاً فعال باشد', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/role', () => {
    it('باید نقش عضو را تغییر دهد', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.TEACHER })
        .expect(200);

      expect(response.body.role).toBe(UserRole.TEACHER);

      // بررسی تغییر در دیتابیس
      const user = await prisma.user.findUnique({ where: { id: memberId } });
      expect(user?.role).toBe(UserRole.TEACHER);
    });

    it('باید خطای 400 بدهد اگر نقش نامعتبر ارسال شود', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);
    });

    it('باید خطای 403 بدهد اگر ادمین بخواهد نقش خودش را تغییر دهد', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.TEACHER })
        .expect(403);
    });

    it('باید خطای 403 بدهد اگر ORG_ADMIN بخواهد کسی را SUPER_ADMIN کند', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.SUPER_ADMIN })
        .expect(403);
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/status', () => {
    it('باید وضعیت عضو را تغییر دهد', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${anotherMemberId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(200);

      expect(response.body.status).toBe(UserStatus.SUSPENDED);

      // بررسی تغییر در دیتابیس
      const user = await prisma.user.findUnique({ where: { id: anotherMemberId } });
      expect(user?.status).toBe(UserStatus.SUSPENDED);
    });

    it('باید خطای 400 بدهد اگر وضعیت نامعتبر ارسال شود', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${anotherMemberId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  describe('DELETE /organizations/:id/members/:memberId', () => {
    it('باید عضو را از سازمان حذف کند', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${anotherMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // بررسی حذف در دیتابیس
      const user = await prisma.user.findUnique({ where: { id: anotherMemberId } });
      expect(user?.orgId).toBeNull();
      expect(user?.role).toBe(UserRole.STUDENT);
    });

    it('باید خطای 404 بدهد اگر عضو وجود نداشته باشد', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/non-existent-id`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('باید خطای 403 بدهد اگر ادمین بخواهد خودش را حذف کند', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('باید خطای 403 بدهد اگر عضو از سازمان دیگر باشد', async () => {
      // ایجاد سازمان دیگر
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'سازمان دیگر',
          slug: `other-org-${Date.now()}`,
        },
      });

      // ایجاد عضو برای سازمان دیگر
      const otherMember = await prisma.user.create({
        data: {
          email: `other-member-${Date.now()}@test.com`,
          name: 'عضو سازمان دیگر',
          password: 'hashedpassword',
          role: UserRole.STUDENT,
          orgId: otherOrg.id,
          status: UserStatus.ACTIVE,
        },
      });

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${otherMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // پاک‌سازی
      await prisma.user.delete({ where: { id: otherMember.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('Security & Authorization Tests', () => {
    it('باید خطای 403 بدهد اگر یک STUDENT بخواهد عضو را تعلیق کند', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/suspend`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('باید خطای 403 بدهد اگر یک TEACHER بخواهد نقش عضو دیگر را تغییر دهد', async () => {
      // ایجاد یک معلم
      const teacher = await prisma.user.create({
        data: {
          email: `teacher-${Date.now()}@test.com`,
          name: 'معلم تست',
          password: 'hashedpassword',
          role: UserRole.TEACHER,
          orgId: orgId,
          status: UserStatus.ACTIVE,
        },
      });

      const teacherToken = await generateTestToken(teacher);

      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ role: UserRole.STUDENT })
        .expect(403);

      // پاک‌سازی
      await prisma.user.delete({ where: { id: teacher.id } });
    });
  });
});
