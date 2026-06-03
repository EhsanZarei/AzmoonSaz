import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'ایمیل کاربر برای دعوت'
  })
  @IsEmail({}, { message: 'فرمت ایمیل معتبر نیست' })
  email: string;

  @ApiProperty({ 
    example: 'STUDENT',
    enum: UserRole,
    description: 'نقش پیش‌فرض کاربر در سازمان',
    required: false,
    default: 'STUDENT'
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'نقش معتبر نیست' })
  role?: UserRole;
}
