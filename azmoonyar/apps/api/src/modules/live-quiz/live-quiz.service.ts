import { Injectable, Logger, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringService } from '../submissions/scoring.service';
import { Server } from 'socket.io';

interface RoomState {
  id: string;
  code: string;
  examId: string;
  hostSocketId: string;
  hostName: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  currentQuestionIndex: number;
  questions: any[];
  participants: Record<string, { name: string; socketId: string; score: number }>;
}

@Injectable()
export class LiveQuizService {
  private readonly logger = new Logger(LiveQuizService.name);

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private prisma: PrismaService,
    private scoring: ScoringService,
  ) {}

  // ایجاد اتاق
  async createRoom(examId: string, hostSocketId: string, hostName: string): Promise<RoomState> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    const code = this.generateRoomCode();
    const roomId = `room:${code}`;

    const room: RoomState = {
      id: roomId,
      code,
      examId,
      hostSocketId,
      hostName,
      status: 'waiting',
      currentQuestionIndex: -1,
      questions: exam!.questions,
      participants: {},
    };

    await this.redis.setex(roomId, 7200, JSON.stringify(room)); // 2 ساعت
    await this.redis.setex(`host:${hostSocketId}`, 7200, roomId);

    return room;
  }

  // پیوستن به اتاق
  async joinRoom(code: string, socketId: string, name: string) {
    const roomId = `room:${code}`;
    const roomData = await this.redis.get(roomId);
    if (!roomData) return null;

    const room: RoomState = JSON.parse(roomData);
    if (room.status === 'ended') return null;

    room.participants[socketId] = { name, socketId, score: 0 };
    await this.redis.setex(roomId, 7200, JSON.stringify(room));
    await this.redis.setex(`participant:${socketId}`, 7200, roomId);

    return { id: roomId, participantCount: Object.keys(room.participants).length };
  }

  // شروع آزمون
  async startQuiz(roomId: string) {
    const room = await this.getRoom(roomId);
    room.status = 'active';
    room.currentQuestionIndex = 0;
    await this.saveRoom(roomId, room);
    return this.formatQuestion(room.questions[0], 0, room.questions.length);
  }

  // سوال بعدی
  async nextQuestion(roomId: string) {
    const room = await this.getRoom(roomId);
    room.currentQuestionIndex++;

    if (room.currentQuestionIndex >= room.questions.length) {
      room.status = 'ended';
      await this.saveRoom(roomId, room);
      return { type: 'ended' };
    }

    await this.saveRoom(roomId, room);
    return {
      type: 'question',
      data: this.formatQuestion(
        room.questions[room.currentQuestionIndex],
        room.currentQuestionIndex,
        room.questions.length,
      ),
    };
  }

  // ثبت پاسخ
  async submitAnswer(
    socketId: string,
    questionId: string,
    answer: any,
    confidence: 'high' | 'medium' | 'low',
    timeSpent: number,
  ) {
    const roomId = await this.redis.get(`participant:${socketId}`);
    if (!roomId) return { success: false };

    const room = await this.getRoom(roomId);
    const question = room.questions.find((q: any) => q.id === questionId);
    if (!question) return { success: false };

    const { score: baseScore, isCorrect } = this.scoring.autoGrade(question, answer);
    const timeBonus = Math.max(0, 500 - timeSpent * 10);
    const finalScore = this.scoring.calculateConfidenceScore(
      baseScore * 1000,
      isCorrect || false,
      confidence,
      timeBonus,
    );

    // به‌روزرسانی امتیاز
    if (room.participants[socketId]) {
      room.participants[socketId].score += finalScore;
      await this.saveRoom(roomId, room);
    }

    return { success: true, is_correct: isCorrect, score: finalScore };
  }

  // لیدربورد
  async getLeaderboard(roomId: string) {
    const room = await this.getRoom(roomId);
    return Object.values(room.participants)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((p, i) => ({ rank: i + 1, name: p.name, score: Math.round(p.score) }));
  }

  // پایان آزمون
  async endQuiz(roomId: string) {
    const room = await this.getRoom(roomId);
    room.status = 'ended';
    await this.saveRoom(roomId, room);
    return this.getLeaderboard(roomId);
  }

  async pauseQuiz(roomId: string) {
    const room = await this.getRoom(roomId);
    room.status = room.status === 'paused' ? 'active' : 'paused';
    await this.saveRoom(roomId, room);
  }

  async getRoomByHost(hostSocketId: string): Promise<RoomState | null> {
    const roomId = await this.redis.get(`host:${hostSocketId}`);
    if (!roomId) return null;
    return this.getRoom(roomId);
  }

  async getRoomByParticipant(socketId: string): Promise<RoomState | null> {
    const roomId = await this.redis.get(`participant:${socketId}`);
    if (!roomId) return null;
    return this.getRoom(roomId);
  }

  async handleDisconnect(socketId: string, server: Server) {
    const roomId = await this.redis.get(`host:${socketId}`);
    if (roomId) {
      server.to(roomId).emit('host:disconnected', {});
    }
  }

  private async getRoom(roomId: string): Promise<RoomState> {
    const data = await this.redis.get(roomId);
    return JSON.parse(data!);
  }

  private async saveRoom(roomId: string, room: RoomState) {
    await this.redis.setex(roomId, 7200, JSON.stringify(room));
  }

  private formatQuestion(question: any, index: number, total: number) {
    const { content } = question;
    const { correct_answer, ...safeContent } = content;
    return {
      id: question.id,
      type: question.type,
      content: safeContent,
      time_limit: question.timeLimit || 30,
      index,
      total,
    };
  }

  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
