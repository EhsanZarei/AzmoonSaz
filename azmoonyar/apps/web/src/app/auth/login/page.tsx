'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { isValidIranPhone, toPersianNumber } from '@/lib/utils';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(11, 'شماره موبایل باید ۱۱ رقم باشد')
    .refine(isValidIranPhone, 'شماره موبایل معتبر نیست'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'کد تأیید باید ۶ رقم باشد'),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [tempToken, setTempToken] = useState('');
  const [phone, setPhone] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [announcement, setAnnouncement] = useState(''); // برای screen reader
  
  // Refs for auto-focus management
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus management for better mobile UX
  useEffect(() => {
    if (step === 'phone' && phoneInputRef.current) {
      phoneInputRef.current.focus();
    } else if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // WebOTP API for auto-fill OTP on supported browsers
  useEffect(() => {
    if (step === 'otp' && 'OTPCredential' in window) {
      const abortController = new AbortController();
      
      navigator.credentials
        .get({
          // @ts-ignore - WebOTP API
          otp: { transport: ['sms'] },
          signal: abortController.signal,
        })
        .then((otp: any) => {
          if (otp?.code) {
            otpForm.setValue('otp', otp.code);
            otpForm.handleSubmit(onVerifyOtp)();
          }
        })
        .catch((err) => {
          // Ignore cancellation errors
          if (err.name !== 'AbortError') {
            console.error('WebOTP error:', err);
          }
        });

      return () => abortController.abort();
    }
  }, [step]);

  const onSendOtp = async (data: PhoneForm) => {
    try {
      const res = await authApi.sendOtp(data.phone);
      setTempToken(res.data.token);
      setPhone(data.phone);
      setStep('otp');
      setCountdown(120); // 2 minutes countdown
      setAnnouncement('کد تأیید ارسال شد. لطفاً کد ۶ رقمی دریافتی را وارد کنید');
      toast.success('کد تأیید ارسال شد');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'خطا در ارسال کد';
      setAnnouncement(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onVerifyOtp = async (data: OtpForm) => {
    try {
      const res = await authApi.verifyOtp(tempToken, data.otp);
      const { accessToken, refreshToken } = res.data;

      // دریافت اطلاعات کاربر
      const meRes = await authApi.getMe();
      setAuth(meRes.data, accessToken, refreshToken);

      toast.success('خوش آمدید!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'کد تأیید نادرست است');
      otpForm.setError('otp', { message: 'کد تأیید نادرست است' });
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await onSendOtp({ phone });
      setAnnouncement('کد تأیید جدید ارسال شد');
      toast.success('کد جدید ارسال شد');
    } catch (err) {
      // Error already handled in onSendOtp
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4 sm:p-6">
      {/* اعلان برای screen reader */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="w-full max-w-md">
        {/* لوگو */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <span className="text-white text-xl sm:text-2xl font-bold">آ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">آزمونیار</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">پلتفرم آزمون‌ساز آنلاین فارسی</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {step === 'phone' ? (
            <>
              <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">ورود به حساب</h2>
              <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4 sm:space-y-5">
                <Input
                  ref={phoneInputRef}
                  label="شماره موبایل"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel"
                  required
                  error={phoneForm.formState.errors.phone?.message}
                  {...phoneForm.register('phone')}
                  aria-label="شماره موبایل ۱۱ رقمی"
                  aria-describedby="phone-hint"
                  hint="شماره موبایل خود را با ۰۹ وارد کنید"
                  id="phone-hint"
                  className="text-base sm:text-sm h-12 sm:h-10"
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  }
                />
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-10 text-base sm:text-sm"
                  size="lg"
                  loading={phoneForm.formState.isSubmitting}
                  aria-label="دریافت کد تأیید از طریق پیامک"
                >
                  دریافت کد تأیید
                </Button>
              </form>
              
              {/* راهنمای اضافی برای موبایل */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    کد تأیید به شماره موبایل شما ارسال می‌شود. این کد تا ۲ دقیقه اعتبار دارد.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('phone');
                  otpForm.reset();
                }}
                className="text-sm text-primary mb-4 flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-1 -mr-1 touch-manipulation"
                aria-label="بازگشت به صفحه ورود شماره موبایل"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                تغییر شماره
              </button>
              <h2 className="text-lg sm:text-xl font-bold mb-2">کد تأیید</h2>
              <p className="text-gray-500 text-sm mb-5 sm:mb-6" dir="ltr">
                کد ۶ رقمی ارسال‌شده به <span className="font-bold text-gray-700">{phone}</span> را وارد کنید
              </p>
              <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4 sm:space-y-5">
                <Input
                  ref={otpInputRef}
                  label="کد تأیید"
                  placeholder="۱۲۳۴۵۶"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  dir="ltr"
                  className="text-center text-xl sm:text-2xl tracking-widest h-14 sm:h-12"
                  required
                  error={otpForm.formState.errors.otp?.message}
                  {...otpForm.register('otp')}
                  aria-label="کد تأیید شش رقمی"
                />
                
                {/* Progress indicator */}
                {countdown > 0 && (
                  <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 right-0 bg-primary transition-all duration-1000"
                      style={{ width: `${(countdown / 120) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-10 text-base sm:text-sm"
                  size="lg"
                  loading={otpForm.formState.isSubmitting}
                  aria-label="تأیید کد و ورود به سیستم"
                >
                  تأیید و ورود
                </Button>
                
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0}
                  className="w-full text-sm text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation min-h-[44px] flex items-center justify-center"
                  aria-label={countdown > 0 ? `ارسال مجدد کد در ${countdown} ثانیه` : 'ارسال مجدد کد'}
                >
                  {countdown > 0 ? (
                    <span>ارسال مجدد کد ({toPersianNumber(countdown)} ثانیه)</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      ارسال مجدد کد
                    </span>
                  )}
                </button>
              </form>
              
              {/* راهنمای اضافی برای موبایل */}
              <div className="mt-5 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-800 text-center">
                  کد را دریافت نکردید؟ لطفاً پوشه اسپم را بررسی کنید یا کد جدید درخواست کنید.
                </p>
              </div>
            </>
          )}

          {/* لینک ثبت‌نام */}
          {step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                حساب کاربری ندارید؟{' '}
                <Link 
                  href="/auth/register" 
                  className="text-primary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  ثبت‌نام کنید
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 sm:mt-6 px-4">
          با ورود، با{' '}
          <a href="/terms" className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">
            قوانین و مقررات
          </a>{' '}
          موافقت می‌کنید
        </p>
      </div>
    </div>
  );
}
