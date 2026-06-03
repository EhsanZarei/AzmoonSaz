import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'ایمیل کاربر' })
  @IsEmail({}, { message: 'فرمت ایمیل معتبر نیست' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'رمز عبور' })
  @IsString()
  password: string;
}
