import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'توکن موقت دریافت‌شده از send-otp' })
  @IsString()
  token: string;

  @ApiProperty({ example: '123456', description: 'کد ۶ رقمی' })
  @IsString()
  @Length(6, 6, { message: 'کد باید ۶ رقم باشد' })
  otp: string;
}
