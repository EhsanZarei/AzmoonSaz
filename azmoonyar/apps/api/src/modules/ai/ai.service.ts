import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.aiServiceUrl = config.get('AI_SERVICE_URL', 'http://localhost:8000');
  }

  // تولید سوال از متن
  async generateFromText(params: {
    content: string;
    count: number;
    difficulty: string;
    questionTypes: string[];
    language: string;
  }) {
    try {
      const { data } = await axios.post(`${this.aiServiceUrl}/generate/questions`, {
        content: params.content,
        count: params.count,
        difficulty: params.difficulty,
        question_types: params.questionTypes,
        language: params.language,
      });
      return data;
    } catch (err) {
      this.logger.error(`AI generate error: ${err.message}`);
      throw new BadRequestException('خطا در تولید سوال با هوش مصنوعی');
    }
  }

  // آپلود فایل و استخراج متن
  async uploadFile(file: Express.Multer.File) {
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    try {
      const { data } = await axios.post(`${this.aiServiceUrl}/generate/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxBodyLength: 50 * 1024 * 1024,
      });
      return data;
    } catch (err) {
      this.logger.error(`AI upload error: ${err.message}`);
      throw new BadRequestException('خطا در پردازش فایل');
    }
  }

  // گفتگو با AI (Chat-to-Quiz)
  async chat(params: {
    message: string;
    sessionId: string;
    examId?: string;
    userId: string;
    history: Array<{ role: string; content: string }>;
  }) {
    // ذخیره session در دیتابیس
    let session = await this.prisma.chatSession.findUnique({
      where: { id: params.sessionId },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: {
          id: params.sessionId,
          userId: params.userId,
          examId: params.examId,
          history: params.history,
        },
      });
    }

    try {
      const { data } = await axios.post(`${this.aiServiceUrl}/chat/`, {
        message: params.message,
        session_id: params.sessionId,
        exam_id: params.examId,
        history: params.history,
      });

      // به‌روزرسانی تاریخچه
      const updatedHistory = [
        ...params.history,
        { role: 'user', content: params.message },
        { role: 'assistant', content: data.reply },
      ];

      await this.prisma.chatSession.update({
        where: { id: params.sessionId },
        data: { history: updatedHistory },
      });

      return data;
    } catch (err) {
      this.logger.error(`AI chat error: ${err.message}`);
      throw new BadRequestException('خطا در ارتباط با هوش مصنوعی');
    }
  }
}
