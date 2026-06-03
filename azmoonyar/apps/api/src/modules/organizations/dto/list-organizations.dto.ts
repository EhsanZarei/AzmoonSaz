import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum OrganizationStatusFilter {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export class ListOrganizationsDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'تعداد در هر صفحه', example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'جستجو در نام و slug', example: 'مدرسه' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'فیلتر بر اساس وضعیت',
    enum: OrganizationStatusFilter,
    example: 'active'
  })
  @IsOptional()
  @IsEnum(OrganizationStatusFilter, { message: 'وضعیت نامعتبر است' })
  status?: string;
}
