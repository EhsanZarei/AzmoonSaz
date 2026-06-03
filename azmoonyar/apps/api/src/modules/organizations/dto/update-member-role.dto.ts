import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'نقش جدید عضو',
    enum: UserRole,
    example: 'TEACHER',
  })
  @IsEnum(UserRole)
  role: UserRole;
}
