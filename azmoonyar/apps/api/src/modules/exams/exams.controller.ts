import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ListExamsDto } from './dto/list-exams.dto';

@ApiTags('آزمون‌ها')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست آزمون‌ها' })
  findAll(@Query() query: ListExamsDto, @Request() req: any) {
    return this.examsService.findAll(req.user.id, query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'ایجاد آزمون جدید' })
  create(@Body() dto: CreateExamDto, @Request() req: any) {
    return this.examsService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات آزمون' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.examsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'ویرایش آزمون' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Request() req: any) {
    return this.examsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف آزمون' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.examsService.remove(id, req.user.id);
  }

  @Post(':id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'انتشار آزمون' })
  publish(@Param('id') id: string, @Request() req: any) {
    return this.examsService.publish(id, req.user.id);
  }

  @Post(':id/duplicate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'کپی آزمون' })
  duplicate(@Param('id') id: string, @Request() req: any) {
    return this.examsService.duplicate(id, req.user.id);
  }
}
