import { 
  Controller, Get, Put, Post, Delete, Body, UseGuards, Request, Param,
  UseInterceptors, UploadedFile, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsEmail, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() organizationName?: string;
  @IsOptional() @IsString() position?: string;
}

class UpdateNotificationsDto {
  @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @IsOptional() @IsBoolean() inAppNotifications?: boolean;
  @IsOptional() @IsBoolean() examCompletedNotif?: boolean;
  @IsOptional() @IsBoolean() newStudentNotif?: boolean;
  @IsOptional() @IsBoolean() reportReadyNotif?: boolean;
}

@ApiTags('کاربران')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'پروفایل کاربر جاری' })
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'ویرایش پروفایل' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateMe(
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // اگر فایل آواتار آپلود شده، بررسی می‌کنیم
    if (file) {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('فقط فایل‌های JPG، PNG و WebP مجاز هستند');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new BadRequestException('حجم فایل نباید بیشتر از ۲ مگابایت باشد');
      }
    }

    return this.usersService.updateProfile(req.user.id, dto, file);
  }

  @Put('me/notifications')
  @ApiOperation({ summary: 'به‌روزرسانی تنظیمات اعلان' })
  updateNotifications(@Body() dto: UpdateNotificationsDto, @Request() req: any) {
    return this.usersService.updateNotifications(req.user.id, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'لیست دستگاه‌های متصل' })
  getSessions(@Request() req: any) {
    return this.usersService.getUserSessions(req.user.id);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'خروج از یک دستگاه' })
  revokeSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.usersService.revokeSession(req.user.id, sessionId);
  }

  @Delete('sessions')
  @ApiOperation({ summary: 'خروج از همه دستگاه‌ها به جز دستگاه فعلی' })
  revokeAllSessions(@Request() req: any) {
    return this.usersService.revokeAllSessions(req.user.id, req.user.sessionId);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'آپلود آواتار' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('فایل آپلود نشده است');
    }

    // بررسی نوع فایل
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('فقط فایل‌های JPG، PNG و WebP مجاز هستند');
    }

    // بررسی حجم فایل (2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('حجم فایل نباید بیشتر از ۲ مگابایت باشد');
    }

    return this.usersService.uploadAvatar(req.user.id, file);
  }
}
