import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('Organizations Member Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminToken: string;
  let orgAdminToken: string;
  let orgId: string;
  let memberId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // پاک‌سازی دیتابیس
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});

    // ایجاد SUPER_ADMIN
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@test.com',
        phone: '09121111111',
        password: '$2b$10$hashedpassword', // فرض: رمز hashed شده
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    // ایجاد سازمان و ORG_ADMIN
    const org = await prisma.organization.create({
      data: {
        name: 'مدرسه تست',
        slug: 'test-school',
        status: 'active',
      },
    });
    orgId = org.id;

    const orgAdmin = await prisma.user.create({
      data: {
        name: 'Org Admin',
        email: 'orgadmin@test.com',
        phone: '09122222222',
        password: '$2b$10$hashedpassword',
        role: UserRole.ORG_ADMIN,
        orgId: org.id,
        status: UserStatus.ACTIVE,
      },
    });

    // ایجاد یک عضو عادی
    const member = await prisma.user.create({
      data: {
        name: 'Test Member',
        email: 'member@test.com',
        phone: '09123333333',
        password: '$2b$10$hashedpassword',
        role: UserRole.STUDENT,
        orgId: org.id,
        status: UserStatus.ACTIVE,
      },
    });
    memberId = member.id;

    // تولید توکن‌ها (فرض: استفاده از JwtService)
    // در محیط واقعی باید از AuthService استفاده کنیم
    // برای سادگی، از یک روش ساده استفاده می‌کنیم
    const JwtService = (await import('@nestjs/jwt')).JwtService;
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
    });

    superAdminToken = jwtService.sign({
      sub: superAdmin.id,
      role: superAdmin.role,
    });

    orgAdminToken = jwtService.sign({
      sub: orgAdmin.id,
      role: orgAdmin.role,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});
    await app.close();
  });

  describe('GET /organizations/:id/members', () => {
    it('باید لیست اعضای سازمان را برگرداند', () => {
      return request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('role');
        });
    });

    it('باید خطای Unauthorized بدهد بدون توکن', () => {
      return request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .expect(401);
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/suspend', () => {
    it('باید عضو را تعلیق کند', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/suspend`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe(UserStatus.SUSPENDED);

      // بررسی در دیتابیس
      const updatedMember = await prisma.user.findUnique({
        where: { id: memberId },
      });
      expect(updatedMember?.status).toBe(UserStatus.SUSPENDED);
    });

    it('باید خطا بدهد اگر عضو قبلاً تعلیق شده باشد', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/suspend`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('قبلاً تعلیق شده است');
        });
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/activate', () => {
    it('باید عضو را فعال کند', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/activate`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(200);

      expect(response.body.status).toBe(UserStatus.ACTIVE);

      // بررسی در دیتابیس
      const updatedMember = await prisma.user.findUnique({
        where: { id: memberId },
      });
      expect(updatedMember?.status).toBe(UserStatus.ACTIVE);
    });

    it('باید خطا بدهد اگر عضو قبلاً فعال باشد', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/activate`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('قبلاً فعال است');
        });
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/role', () => {
    it('باید نقش عضو را به TEACHER تغییر دهد', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ role: UserRole.TEACHER })
        .expect(200);

      expect(response.body.role).toBe(UserRole.TEACHER);

      // بررسی در دیتابیس
      const updatedMember = await prisma.user.findUnique({
        where: { id: memberId },
      });
      expect(updatedMember?.role).toBe(UserRole.TEACHER);
    });

    it('باید خطا بدهد اگر نقش نامعتبر باشد', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);
    });

    it('باید خطا بدهد اگر ORG_ADMIN بخواهد کسی را SUPER_ADMIN کند', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ role: UserRole.SUPER_ADMIN })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('SUPER_ADMIN');
        });
    });

    it('باید SUPER_ADMIN بتواند کسی را SUPER_ADMIN کند', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: UserRole.SUPER_ADMIN })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(UserRole.SUPER_ADMIN);
        });
    });
  });

  describe('PATCH /organizations/:id/members/:memberId/status', () => {
    it('باید وضعیت عضو را تغییر دهد', async () => {
      // ابتدا عضو را به حالت STUDENT برمی‌گردانیم
      await prisma.user.update({
        where: { id: memberId },
        data: { role: UserRole.STUDENT },
      });

      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/status`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(200);

      expect(response.body.status).toBe(UserStatus.SUSPENDED);
    });

    it('باید خطا بدهد اگر وضعیت نامعتبر باشد', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${orgId}/members/${memberId}/status`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  describe('DELETE /organizations/:id/members/:memberId', () => {
    it('باید عضو را از سازمان حذف کند', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${memberId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(204);

      // بررسی در دیتابیس
      const removedMember = await prisma.user.findUnique({
        where: { id: memberId },
      });
      expect(removedMember?.orgId).toBeNull();
      expect(removedMember?.role).toBe(UserRole.STUDENT);
    });

    it('باید خطا بدهد اگر عضو قبلاً حذف شده باشد', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${memberId}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('متعلق به این سازمان نیست');
        });
    });
  });
});
