import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  // صدور گواهینامه پس از قبولی
  async issue(submissionId: string): Promise<any> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { exam: true, user: true },
    });

    if (!submission || !submission.passed || !submission.userId) return null;

    // بررسی وجود گواهینامه قبلی
    const existing = await this.prisma.certificate.findUnique({
      where: { submissionId },
    });
    if (existing) return existing;

    const uniqueCode = this.generateUniqueCode();

    return this.prisma.certificate.create({
      data: {
        submissionId,
        userId: submission.userId,
        examId: submission.examId,
        uniqueCode,
        issuedAt: new Date(),
      },
    });
  }

  // تأیید اعتبار گواهینامه (عمومی)
  async verify(uniqueCode: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { uniqueCode },
      include: {
        user: { select: { name: true } },
        exam: { select: { title: true } },
        submission: { select: { score: true, percentage: true, completedAt: true } },
      },
    });

    if (!cert) throw new NotFoundException('گواهینامه یافت نشد');
    if (cert.revokedAt) return { valid: false, reason: 'گواهینامه باطل شده است' };
    if (cert.expiresAt && cert.expiresAt < new Date()) {
      return { valid: false, reason: 'گواهینامه منقضی شده است' };
    }

    // افزایش شمارنده دانلود
    await this.prisma.certificate.update({
      where: { uniqueCode },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      valid: true,
      certificate: {
        uniqueCode: cert.uniqueCode,
        holderName: cert.user.name,
        examTitle: cert.exam.title,
        score: cert.submission.percentage,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
      },
    };
  }

  // لیست گواهینامه‌های کاربر
  async findByUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId, revokedAt: null },
      include: {
        exam: { select: { title: true } },
        submission: { select: { percentage: true, completedAt: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  // ابطال گواهینامه
  async revoke(uniqueCode: string, adminId: string) {
    return this.prisma.certificate.update({
      where: { uniqueCode },
      data: { revokedAt: new Date() },
    });
  }

  private generateUniqueCode(): string {
    // فرمت: AZM-XXXX-XXXX-XXXX
    const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AZM-${part()}-${part()}-${part()}`;
  }
}
