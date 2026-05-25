import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringService } from './scoring.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private scoring: ScoringService,
  ) {}

  // شروع آزمون
  async startExam(examId: string, userId: string | null, guestName: string | null, ip: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.status !== 'PUBLISHED') throw new ForbiddenException('آزمون منتشر نشده است');

    // بررسی تاریخ
    const now = new Date();
    if (exam.expiresAt && exam.expiresAt < now) {
      throw new BadRequestException('مهلت آزمون به پایان رسیده است');
    }

    // بررسی تعداد دفعات
    const settings = exam.settings as any;
    if (settings?.maxAttempts && userId) {
      const attempts = await this.prisma.submission.count({
        where: { examId, userId, status: 'COMPLETED' },
      });
      if (attempts >= settings.maxAttempts) {
        throw new BadRequestException('تعداد دفعات مجاز شرکت در آزمون تمام شده است');
      }
    }

    // ایجاد submission
    const submission = await this.prisma.submission.create({
      data: {
        examId,
        userId: userId || undefined,
        guestToken: userId ? undefined : uuidv4(),
        status: 'IN_PROGRESS',
        ipAddress: ip,
      },
    });

    // shuffle سوالات در صورت نیاز
    let questions = exam.questions;
    if (settings?.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // shuffle گزینه‌ها در صورت نیاز
    if (settings?.shuffleOptions) {
      questions = questions.map((q: any) => {
        if (q.content?.options) {
          return {
            ...q,
            content: {
              ...q.content,
              options: [...q.content.options].sort(() => Math.random() - 0.5),
            },
          };
        }
        return q;
      });
    }

    return {
      submission_id: submission.id,
      questions: questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        content: this.sanitizeQuestion(q.content),
        score: q.score,
        time_limit: q.timeLimit,
        order_index: q.orderIndex,
      })),
      timer: settings?.timer || null,
      started_at: submission.startedAt,
    };
  }

  // ذخیره پاسخ
  async saveAnswer(
    submissionId: string,
    questionId: string,
    response: any,
    timeSpent: number,
    userId: string | null,
  ) {
    const submission = await this.getSubmission(submissionId, userId);

    // بررسی سوال
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('سوال یافت نشد');

    // نمره‌دهی خودکار
    const { score, isCorrect } = this.scoring.autoGrade(question, response);

    // ذخیره یا به‌روزرسانی پاسخ
    await this.prisma.answer.upsert({
      where: {
        submissionId_questionId: { submissionId, questionId },
      } as any,
      create: {
        submissionId,
        questionId,
        response,
        score,
        isCorrect,
        timeSpent,
      },
      update: {
        response,
        score,
        isCorrect,
        timeSpent,
      },
    });

    return { success: true, is_correct: isCorrect, score };
  }

  // پایان آزمون
  async completeExam(submissionId: string, userId: string | null) {
    const submission = await this.getSubmission(submissionId, userId);

    if (submission.status === 'COMPLETED') {
      throw new BadRequestException('آزمون قبلاً به پایان رسیده است');
    }

    // محاسبه نمره کل
    const answers = await this.prisma.answer.findMany({
      where: { submissionId },
    });

    const exam = await this.prisma.exam.findUnique({
      where: { id: submission.examId },
      include: { questions: true },
    });

    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxScore = exam!.questions.reduce((sum, q) => sum + q.score, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const settings = exam!.settings as any;
    const passed = percentage >= (settings?.passingScore || 60);

    // به‌روزرسانی submission
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'COMPLETED',
        score: totalScore,
        maxScore,
        percentage,
        passed,
        completedAt: new Date(),
        timeSpent: Math.floor(
          (new Date().getTime() - submission.startedAt.getTime()) / 1000
        ),
      },
    });

    return {
      score: totalScore,
      max_score: maxScore,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      completed_at: updated.completedAt,
    };
  }

  // دریافت نتیجه
  async getResult(submissionId: string, userId: string | null) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: { include: { question: true } },
        exam: { select: { title: true, settings: true } },
        certificate: { select: { uniqueCode: true, issuedAt: true } },
      },
    });

    if (!submission) throw new NotFoundException('نتیجه یافت نشد');
    if (userId && submission.userId !== userId) {
      throw new ForbiddenException('دسترسی ندارید');
    }

    return submission;
  }

  // حذف پاسخ‌های صحیح از سوالات (برای امنیت)
  private sanitizeQuestion(content: any) {
    const { correct_answer, ...safe } = content;
    return safe;
  }

  private async getSubmission(submissionId: string, userId: string | null) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('آزمون یافت نشد');
    if (userId && submission.userId !== userId) {
      throw new ForbiddenException('دسترسی ندارید');
    }
    return submission;
  }
}
