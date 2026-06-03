import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth: config.get('SMTP_USER')
        ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') }
        : undefined,
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"آزمونیار" <noreply@azmoonyar.ir>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendExamResultEmail(
    to: string,
    name: string,
    examTitle: string,
    score: number,
    passed: boolean,
    certificateCode?: string,
  ): Promise<void> {
    const subject = `نتیجه آزمون: ${examTitle}`;
    const statusText = passed ? '✅ قبول شدید' : '❌ قبول نشدید';
    const certSection = certificateCode
      ? `<p>کد گواهینامه شما: <strong>${certificateCode}</strong></p>
         <p><a href="https://azmoonyar.ir/certificates/verify/${certificateCode}">مشاهده گواهینامه</a></p>`
      : '';

    const html = `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>سلام ${name} عزیز</h2>
        <p>نتیجه آزمون <strong>${examTitle}</strong> اعلام شد.</p>
        <p>نمره شما: <strong>${score}٪</strong></p>
        <p>${statusText}</p>
        ${certSection}
        <hr>
        <p style="color: #666; font-size: 12px;">آزمونیار — پلتفرم آزمون‌ساز آنلاین فارسی</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendOtpSms(phone: string, otp: string): Promise<void> {
    // TODO: یکپارچگی با کاوه‌نگار یا ملی‌پیامک
    this.logger.log(`[SMS] OTP ${otp} → ${phone}`);
  }
}
