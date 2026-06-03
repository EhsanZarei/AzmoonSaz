import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ 
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    description: 'توکن دعوت‌نامه'
  })
  @IsString({ message: 'توکن باید رشته باشد' })
  @MinLength(10, { message: 'توکن نامعتبر است' })
  token: string;
}
