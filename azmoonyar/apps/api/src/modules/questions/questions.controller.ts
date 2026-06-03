import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionsService, CreateQuestionDto, UpdateQuestionDto, ReorderQuestionsDto } from './questions.service';

@ApiTags('سوالات')
@Controller('exams/:examId/questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست سوالات آزمون' })
  findAll(@Param('examId') examId: string, @Request() req: any) {
    return this.questionsService.findByExam(examId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'افزودن سوال' })
  create(
    @Param('examId') examId: string,
    @Body() dto: CreateQuestionDto,
    @Request() req: any,
  ) {
    return this.questionsService.create(examId, req.user.id, dto);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'مرتب‌سازی سوالات' })
  reorder(
    @Param('examId') examId: string,
    @Body() dto: ReorderQuestionsDto,
    @Request() req: any,
  ) {
    return this.questionsService.reorder(examId, req.user.id, dto.order);
  }

  @Put(':id')
  @ApiOperation({ summary: 'ویرایش سوال' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Request() req: any,
  ) {
    return this.questionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف سوال' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.questionsService.remove(id, req.user.id);
  }
}
