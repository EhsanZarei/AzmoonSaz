import {
  Controller, Post, Put, Get, Body, Param,
  UseGuards, Request, HttpCode, HttpStatus, Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';

class StartExamDto {
  @IsOptional() @IsString() guestName?: string;
}

class SaveAnswerDto {
  response: any;
  @IsOptional() @IsNumber() @Min(0) timeSpent?: number;
}

@ApiTags('شرکت در آزمون')
@Controller()
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Post('exams/:id/start')
  @ApiOperation({ summary: 'شروع آزمون' })
  startExam(
    @Param('id') examId: string,
    @Body() dto: StartExamDto,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    const userId = req.user?.id || null;
    return this.submissionsService.startExam(examId, userId, dto.guestName || null, ip);
  }

  @Put('submissions/:id/answers/:questionId')
  @ApiOperation({ summary: 'ذخیره پاسخ' })
  saveAnswer(
    @Param('id') submissionId: string,
    @Param('questionId') questionId: string,
    @Body() dto: SaveAnswerDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || null;
    return this.submissionsService.saveAnswer(
      submissionId,
      questionId,
      dto.response,
      dto.timeSpent || 0,
      userId,
    );
  }

  @Post('submissions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'پایان آزمون' })
  completeExam(@Param('id') submissionId: string, @Request() req: any) {
    const userId = req.user?.id || null;
    return this.submissionsService.completeExam(submissionId, userId);
  }

  @Get('submissions/:id/result')
  @ApiOperation({ summary: 'نتیجه آزمون' })
  getResult(@Param('id') submissionId: string, @Request() req: any) {
    const userId = req.user?.id || null;
    return this.submissionsService.getResult(submissionId, userId);
  }
}
