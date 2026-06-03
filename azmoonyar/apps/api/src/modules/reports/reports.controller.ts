import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('گزارش‌ها')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'داشبورد مدرس' })
  getDashboard(@Request() req: any) {
    return this.reportsService.getDashboard(req.user.id);
  }

  @Get('student-dashboard')
  @ApiOperation({ summary: 'داشبورد دانش‌آموز' })
  getStudentDashboard(@Request() req: any) {
    return this.reportsService.getStudentDashboard(req.user.id);
  }

  @Get('exams/:id')
  @ApiOperation({ summary: 'گزارش آزمون' })
  getExamReport(@Param('id') examId: string, @Request() req: any) {
    return this.reportsService.getExamReport(examId, req.user.id);
  }
}
