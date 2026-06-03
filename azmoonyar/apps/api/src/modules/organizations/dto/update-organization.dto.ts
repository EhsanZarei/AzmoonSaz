import { IsString, IsOptional, IsUrl, IsObject, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'نام سازمان', example: 'مدرسه علامه طباطبایی' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'آدرس لوگوی سازمان', example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'آدرس لوگو باید یک URL معتبر باشد' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'دامنه سازمان', example: 'school.edu' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ 
    description: 'تنظیمات سازمان',
    example: { theme: 'dark', language: 'fa' }
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'وضعیت سازمان',
    enum: OrganizationStatus,
    example: 'active'
  })
  @IsOptional()
  @IsEnum(OrganizationStatus, { message: 'وضعیت سازمان نامعتبر است' })
  status?: string;
}
