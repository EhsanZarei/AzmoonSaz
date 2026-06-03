import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

export type PaymentGateway = 'zarinpal' | 'idpay';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ایجاد درخواست پرداخت
  async createPayment(
    userId: string,
    planId: string,
    gateway: PaymentGateway = 'zarinpal',
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('پلن یافت نشد');

    const amount = plan.priceMonthly; // تومان
    const callbackUrl = `${this.config.get('APP_URL')}/api/v1/payments/verify`;
    const description = `اشتراک ${plan.name} — آزمونیار`;

    if (gateway === 'zarinpal') {
      return this.createZarinpalPayment(userId, planId, amount, callbackUrl, description);
    }
    return this.createIdpayPayment(userId, planId, amount, callbackUrl, description);
  }

  // تأیید پرداخت
  async verifyPayment(authority: string, status: string, gateway: PaymentGateway = 'zarinpal') {
    if (status !== 'OK') throw new BadRequestException('پرداخت لغو شد');

    // TODO: تأیید با API درگاه و فعال‌سازی اشتراک
    this.logger.log(`Payment verified: ${authority}`);
    return { success: true, message: 'پرداخت با موفقیت انجام شد' };
  }

  // لیست پلن‌ها
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  private async createZarinpalPayment(
    userId: string,
    planId: string,
    amount: number,
    callbackUrl: string,
    description: string,
  ) {
    const merchantId = this.config.get('ZARINPAL_MERCHANT_ID', 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');

    try {
      const { data } = await axios.post('https://api.zarinpal.com/pg/v4/payment/request.json', {
        merchant_id: merchantId,
        amount: amount * 10, // تبدیل تومان به ریال
        description,
        callback_url: callbackUrl,
        metadata: { userId, planId },
      });

      if (data.data?.code === 100) {
        return {
          gateway: 'zarinpal',
          paymentUrl: `https://www.zarinpal.com/pg/StartPay/${data.data.authority}`,
          authority: data.data.authority,
        };
      }
      throw new BadRequestException('خطا در اتصال به درگاه پرداخت');
    } catch (err) {
      this.logger.error(`Zarinpal error: ${err.message}`);
      // در محیط dev، یک URL آزمایشی برمی‌گردانیم
      if (this.config.get('NODE_ENV') !== 'production') {
        return { gateway: 'zarinpal', paymentUrl: '/payment/test', authority: 'test-authority' };
      }
      throw new BadRequestException('خطا در اتصال به درگاه پرداخت');
    }
  }

  private async createIdpayPayment(
    userId: string,
    planId: string,
    amount: number,
    callbackUrl: string,
    description: string,
  ) {
    const apiKey = this.config.get('IDPAY_API_KEY', 'test');

    try {
      const { data } = await axios.post(
        'https://api.idpay.ir/v1.1/payment',
        { order_id: `${userId}-${planId}-${Date.now()}`, amount: amount * 10, desc: description, callback: callbackUrl },
        { headers: { 'X-API-KEY': apiKey, 'X-SANDBOX': this.config.get('NODE_ENV') !== 'production' ? '1' : '0' } },
      );

      return { gateway: 'idpay', paymentUrl: data.link, id: data.id };
    } catch (err) {
      this.logger.error(`IDPay error: ${err.message}`);
      throw new BadRequestException('خطا در اتصال به درگاه پرداخت');
    }
  }
}
