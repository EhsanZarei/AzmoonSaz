import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { ScoringService } from './scoring.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, ScoringService],
  exports: [SubmissionsService, ScoringService],
})
export class SubmissionsModule {}
