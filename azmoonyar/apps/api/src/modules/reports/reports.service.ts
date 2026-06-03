import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // داشبورد مدرس
  async getDashboard(userId: string) {
    const [totalExams, activeExams, recentSubmissions] = await Promise.all([
      this.prisma.exam.count({ where: { ownerId: userId, status: { not: 'DELETED' } } }),
      this.prisma.exam.count({ where: { ownerId: userId, status: 'PUBLISHED' } }),
      this.prisma.submission.findMany({
        where: {
          exam: { ownerId: userId },
          status: 'COMPLETED',
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { score: true, percentage: true, completedAt: true },
      }),
    ]);

    const avgScore =
      recentSubmissions.length > 0
        ? recentSubmissions.reduce((s, r) => s + (r.percentage || 0), 0) /
          recentSubmissions.length
        : 0;

    const pendingGrading = await this.prisma.answer.count({
      where: {
        submission: { exam: { ownerId: userId } },
        isCorrect: null,
        question: { type: { in: ['ESSAY', 'FILE_UPLOAD'] } },
      },
    });

    return {
      totalExams,
      activeExams,
      weeklySubmissions: recentSubmissions.length,
      avgScore: Math.round(avgScore * 10) / 10,
      pendingGrading,
    };
  }

  // گزارش یک آزمون
  async getExamReport(examId: string, userId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');

    const submissions = await this.prisma.submission.findMany({
      where: { examId, status: 'COMPLETED' },
      include: { answers: true, user: { select: { name: true, email: true } } },
      orderBy: { completedAt: 'desc' },
    });

    // آمار کلی
    const scores = submissions.map((s) => s.percentage || 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passed = submissions.filter((s) => s.passed).length;

    // آمار هر سوال
    const questionStats = await Promise.all(
      exam.questions.map(async (q) => {
        const answers = await this.prisma.answer.findMany({
          where: { questionId: q.id, submission: { status: 'COMPLETED' } },
        });
        const correct = answers.filter((a) => a.isCorrect).length;
        const avgTime =
          answers.length > 0
            ? answers.reduce((s, a) => s + (a.timeSpent || 0), 0) / answers.length
            : 0;

        return {
          questionId: q.id,
          type: q.type,
          totalAnswers: answers.length,
          correctRate: answers.length ? Math.round((correct / answers.length) * 100) : 0,
          avgTimeSeconds: Math.round(avgTime),
        };
      }),
    );

    return {
      exam: { id: exam.id, title: exam.title },
      summary: {
        totalSubmissions: submissions.length,
        passedCount: passed,
        passRate: submissions.length ? Math.round((passed / submissions.length) * 100) : 0,
        avgScore: Math.round(avg * 10) / 10,
        minScore: scores.length ? Math.min(...scores) : 0,
        maxScore: scores.length ? Math.max(...scores) : 0,
      },
      participants: submissions.map((s) => ({
        id: s.id,
        name: s.user?.name || s.guestName || 'مهمان',
        score: s.score,
        percentage: s.percentage,
        passed: s.passed,
        timeSpent: s.timeSpent,
        completedAt: s.completedAt,
      })),
      questionStats,
    };
  }

  // داشبورد دانش‌آموز
  async getStudentDashboard(userId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { exam: { select: { title: true } } },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    return {
      totalExams: submissions.length,
      avgScore:
        submissions.length > 0
          ? Math.round(
              (submissions.reduce((s, r) => s + (r.percentage || 0), 0) / submissions.length) * 10,
            ) / 10
          : 0,
      recentResults: submissions.map((s) => ({
        examTitle: s.exam.title,
        score: s.percentage,
        passed: s.passed,
        completedAt: s.completedAt,
      })),
    };
  }
}
