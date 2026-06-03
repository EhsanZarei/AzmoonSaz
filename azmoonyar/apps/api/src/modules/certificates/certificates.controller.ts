import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';

@ApiTags('گواهینامه‌ها')
@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  // تأیید اعتبار — عمومی، بدون نیاز به ورود
  @Get('verify/:code')
  @ApiOperation({ summary: 'تأیید اعتبار گواهینامه' })
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  // گواهینامه‌های کاربر — نیاز به ورود
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'گواهینامه‌های من' })
  myList(@Request() req: any) {
    return this.certificatesService.findByUser(req.user.id);
  }

  // صدور دستی گواهینامه برای یک submission
  @Post('issue/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'صدور گواهینامه' })
  issue(@Param('submissionId') submissionId: string) {
    return this.certificatesService.issue(submissionId);
  }
}
