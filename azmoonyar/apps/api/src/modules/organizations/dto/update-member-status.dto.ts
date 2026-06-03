import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateMemberStatusDto {
  @ApiProperty({
    description: 'وضعیت جدید عضو',
    enum: UserStatus,
    example: 'SUSPENDED',
  })
  @IsEnum(UserStatus)
  status: UserStatus;
}
