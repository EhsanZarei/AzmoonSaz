import { Module } from '@nestjs/common';
import { LiveQuizGateway } from './live-quiz.gateway';
import { LiveQuizService } from './live-quiz.service';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [SubmissionsModule],
  providers: [LiveQuizGateway, LiveQuizService],
})
export class LiveQuizModule {}
