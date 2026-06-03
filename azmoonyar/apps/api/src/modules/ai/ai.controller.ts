import {
  Controller, Post, Body, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { v4 as uuidv4 } from 'uuid';

class GenerateQuestionsDto {
  @IsString() content: string;
  @IsNumber() @Min(1) @Max(100) count: number;
  @IsOptional() @IsEnum(['easy', 'medium', 'hard', 'mixed']) difficulty?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) questionTypes?: string[];
  @IsOptional() @IsEnum(['fa', 'en']) language?: string;
}

class ChatDto {
  @IsString() message: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() examId?: string;
  @IsOptional() @IsArray() history?: Array<{ role: string; content: string }>;
}

@ApiTags('هوش مصنوعی')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate-questions')
  @ApiOperation({ summary: 'تولید سوال از متن' })
  generateFromText(@Body() dto: GenerateQuestionsDto) {
    return this.aiService.generateFromText({
      content: dto.content,
      count: dto.count,
      difficulty: dto.difficulty || 'medium',
      questionTypes: dto.questionTypes || ['mcq_single'],
      language: dto.language || 'fa',
    });
  }

  @Post('upload')
  @ApiOperation({ summary: 'آپلود فایل برای AI' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.uploadFile(file);
  }

  @Post('chat')
  @ApiOperation({ summary: 'گفتگو با AI (Chat-to-Quiz)' })
  chat(@Body() dto: ChatDto, @Request() req: any) {
    return this.aiService.chat({
      message: dto.message,
      sessionId: dto.sessionId || uuidv4(),
      examId: dto.examId,
      userId: req.user.id,
      history: dto.history || [],
    });
  }
}
