import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ListExamsDto } from './dto/list-exams.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: ListExamsDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { ownerId: userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { questions: true, submissions: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(userId: string, dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        ...dto,
        ownerId: userId,
        status: 'DRAFT',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });

    if (!exam) throw new NotFoundException('آزمون یافت نشد');
    if (exam.ownerId !== userId) throw new ForbiddenException('دسترسی ندارید');

    return exam;
  }

  async update(id: string, userId: string, dto: UpdateExamDto) {
    await this.findOne(id, userId);
    return this.prisma.exam.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.exam.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async publish(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async duplicate(id: string, userId: string) {
    const exam = await this.findOne(id, userId);
    const { id: _, createdAt, updatedAt, publishedAt, ...examData } = exam as any;

    const newExam = await this.prisma.exam.create({
      data: {
        ...examData,
        title: `کپی از ${exam.title}`,
        status: 'DRAFT',
        ownerId: userId,
      },
    });

    // کپی سوالات
    if (exam.questions?.length) {
      await this.prisma.question.createMany({
        data: exam.questions.map(({ id: _, examId: __, ...q }: any) => ({
          ...q,
          examId: newExam.id,
        })),
      });
    }

    return newExam;
  }
}
