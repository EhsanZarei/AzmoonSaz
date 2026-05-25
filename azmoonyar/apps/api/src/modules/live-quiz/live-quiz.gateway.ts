import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { LiveQuizService } from './live-quiz.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  namespace: '/live',
})
export class LiveQuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LiveQuizGateway.name);

  constructor(private liveQuizService: LiveQuizService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    await this.liveQuizService.handleDisconnect(client.id, this.server);
  }

  // ===== HOST EVENTS =====

  @SubscribeMessage('room:create')
  async createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { exam_id: string; host_name: string },
  ) {
    const room = await this.liveQuizService.createRoom(data.exam_id, client.id, data.host_name);
    client.join(room.id);
    client.emit('room:created', { code: room.code, room_id: room.id });
  }

  @SubscribeMessage('host:start_quiz')
  async startQuiz(@ConnectedSocket() client: Socket) {
    const room = await this.liveQuizService.getRoomByHost(client.id);
    if (!room) return;

    const question = await this.liveQuizService.startQuiz(room.id);
    this.server.to(room.id).emit('quiz:question_show', question);
  }

  @SubscribeMessage('host:next_question')
  async nextQuestion(@ConnectedSocket() client: Socket) {
    const room = await this.liveQuizService.getRoomByHost(client.id);
    if (!room) return;

    const result = await this.liveQuizService.nextQuestion(room.id);

    if (result.type === 'question') {
      // نمایش لیدربورد قبل از سوال بعدی
      const leaderboard = await this.liveQuizService.getLeaderboard(room.id);
      this.server.to(room.id).emit('quiz:leaderboard', { rankings: leaderboard });

      setTimeout(() => {
        this.server.to(room.id).emit('quiz:question_show', result.data);
      }, 3000);
    } else {
      // پایان آزمون
      const finalScores = await this.liveQuizService.endQuiz(room.id);
      this.server.to(room.id).emit('quiz:ended', { final_scores: finalScores });
    }
  }

  @SubscribeMessage('host:pause')
  async pauseQuiz(@ConnectedSocket() client: Socket) {
    const room = await this.liveQuizService.getRoomByHost(client.id);
    if (!room) return;
    await this.liveQuizService.pauseQuiz(room.id);
    this.server.to(room.id).emit('quiz:paused', {});
  }

  @SubscribeMessage('host:send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ) {
    const room = await this.liveQuizService.getRoomByHost(client.id);
    if (!room) return;
    this.server.to(room.id).emit('host:message', { text: data.text });
  }

  // ===== PARTICIPANT EVENTS =====

  @SubscribeMessage('room:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; name: string },
  ) {
    const room = await this.liveQuizService.joinRoom(data.code, client.id, data.name);
    if (!room) {
      client.emit('error', { message: 'اتاق یافت نشد یا پر شده است' });
      return;
    }

    client.join(room.id);
    client.emit('room:joined', { room_id: room.id, participant_count: room.participantCount });

    // اطلاع به host
    this.server.to(room.id).emit('room:participant_joined', {
      name: data.name,
      count: room.participantCount,
    });
  }

  @SubscribeMessage('quiz:submit_answer')
  async submitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      question_id: string;
      answer: any;
      confidence: 'high' | 'medium' | 'low';
      time_spent: number;
    },
  ) {
    const result = await this.liveQuizService.submitAnswer(
      client.id,
      data.question_id,
      data.answer,
      data.confidence,
      data.time_spent,
    );

    client.emit('quiz:answer_result', result);

    // به‌روزرسانی لیدربورد برای host
    const room = await this.liveQuizService.getRoomByParticipant(client.id);
    if (room) {
      const leaderboard = await this.liveQuizService.getLeaderboard(room.id);
      this.server.to(room.id).emit('quiz:leaderboard_update', { rankings: leaderboard });
    }
  }
}
