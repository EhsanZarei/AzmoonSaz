import { IsString, IsOptional, IsUrl, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'نام سازمان', example: 'مدرسه علامه طباطبایی' })
  @IsString()
  @MinLength(2, { message: 'نام سازمان باید حداقل ۲ کاراکتر باشد' })
  name: string;

  @ApiProperty({ 
    description: 'شناسه یکتای سازمان (فقط حروف انگلیسی، اعداد و خط فاصله)',
    example: 'allameh-tabatabaei'
  })
  @IsString()
  @MinLength(2, { message: 'شناسه سازمان باید حداقل ۲ کاراکتر باشد' })
  @Matches(/^[a-z0-9-]+$/, { message: 'شناسه سازمان فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و خط فاصله باشد' })
  slug: string;

  @ApiPropertyOptional({ description: 'آدرس لوگوی سازمان', example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'آدرس لوگو باید یک URL معتبر باشد' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'دامنه سازمان', example: 'school.edu' })
  @IsOptional()
  @IsString()
  domain?: string;
}
