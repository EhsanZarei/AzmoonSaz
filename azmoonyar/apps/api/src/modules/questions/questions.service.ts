import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsEnum, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';
import { QuestionType, Difficulty } from '@prisma/client';

export class CreateQuestionDto {
  @IsEnum(QuestionType) type: QuestionType;
  content: Record<string, any>;
  @IsOptional() @IsNumber() @Min(0) score?: number;
  @IsOptional() @IsNumber() @Min(0) negativeScore?: number;
  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional() @IsNumber() @Min(1) @Max(3600) timeLimit?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateQuestionDto extends CreateQuestionDto {}

export class ReorderQuestionsDto {
  @IsArray() @IsString({ each: true }) order: string[];
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findByExam(examId: string, userId: string) {
    // بررسی مالکیت آزمون
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');

    return this.prisma.question.findMany({
      where: { examId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(examId: string, userId: string, dto: CreateQuestionDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');

    // تعیین orderIndex بعدی
    const lastQuestion = await this.prisma.question.findFirst({
      where: { examId },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex = (lastQuestion?.orderIndex ?? -1) + 1;

    return this.prisma.question.create({
      data: { ...dto, examId, orderIndex },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateQuestionDto>) {
    const question = await this.findOneWithOwnerCheck(id, userId);
    return this.prisma.question.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOneWithOwnerCheck(id, userId);
    await this.prisma.question.delete({ where: { id } });
  }

  async reorder(examId: string, userId: string, order: string[]) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');

    // به‌روزرسانی orderIndex برای هر سوال
    await Promise.all(
      order.map((questionId, index) =>
        this.prisma.question.update({
          where: { id: questionId },
          data: { orderIndex: index },
        }),
      ),
    );

    return { success: true };
  }

  private async findOneWithOwnerCheck(id: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { exam: { select: { ownerId: true } } },
    });
    if (!question) throw new NotFoundException('سوال یافت نشد');
    if (question.exam?.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');
    return question;
  }
}
