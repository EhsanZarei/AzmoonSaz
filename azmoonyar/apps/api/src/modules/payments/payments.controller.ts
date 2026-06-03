import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService, PaymentGateway } from './payments.service';

class CreatePaymentDto {
  @IsString() planId: string;
  @IsOptional() @IsEnum(['zarinpal', 'idpay']) gateway?: PaymentGateway;
}

@ApiTags('پرداخت')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'لیست پلن‌های اشتراک' })
  getPlans() {
    return this.paymentsService.getPlans();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد درخواست پرداخت' })
  createPayment(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.createPayment(req.user.id, dto.planId, dto.gateway);
  }

  @Get('verify')
  @ApiOperation({ summary: 'تأیید پرداخت (callback درگاه)' })
  verifyPayment(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
  ) {
    return this.paymentsService.verifyPayment(authority, status);
  }
}
