'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

// Password validation schema matching backend requirements
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .max(100, 'نام نباید بیش از ۱۰۰ کاراکتر باشد'),
  email: z
    .string()
    .email('فرمت ایمیل معتبر نیست')
    .min(1, 'ایمیل الزامی است'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(100, 'رمز عبور نباید بیش از ۱۰۰ کاراکتر باشد')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]{8,}$/,
      'رمز عبور باید شامل حروف بزرگ و کوچک انگلیسی، عدد و کاراکتر خاص باشد'
    ),
  confirmPassword: z.string().min(1, 'تأیید رمز عبور الزامی است'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'رمز عبور و تأیید آن مطابقت ندارند',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [announcement, setAnnouncement] = useState(''); // برای screen reader
  
  // Ref for auto-focus management
  const nameInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RegisterForm>({ 
    resolver: zodResolver(registerSchema),
    mode: 'onBlur', // Validate on blur for better UX
  });

  // Auto-focus on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    try {
      // Call registration endpoint
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      const { accessToken, refreshToken, user } = res.data;

      // Set auth state
      setAuth(user, accessToken, refreshToken);

      setAnnouncement('ثبت‌نام با موفقیت انجام شد. در حال انتقال به داشبورد...');
      toast.success('ثبت‌نام با موفقیت انجام شد!');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید';
      setAnnouncement(errorMessage);
      toast.error(errorMessage);
      
      // Set specific field errors if available
      if (err.response?.data?.field) {
        form.setError(err.response.data.field, { 
          message: errorMessage 
        });
      }
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
          <h2 className="text-lg sm:text-xl font-bold mb-2">ثبت‌نام در آزمونیار</h2>
          <p className="text-sm text-gray-500 mb-5 sm:mb-6">
            برای شروع، اطلاعات خود را وارد کنید
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {/* نام و نام خانوادگی */}
            <Input
              ref={nameInputRef}
              label="نام و نام خانوادگی"
              placeholder="علی احمدی"
              type="text"
              autoComplete="name"
              required
              error={form.formState.errors.name?.message}
              {...form.register('name')}
              aria-label="نام و نام خانوادگی"
              className="text-base sm:text-sm h-12 sm:h-10"
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            />

            {/* ایمیل */}
            <Input
              label="ایمیل"
              placeholder="user@example.com"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              error={form.formState.errors.email?.message}
              {...form.register('email')}
              aria-label="آدرس ایمیل"
              className="text-base sm:text-sm h-12 sm:h-10"
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
            />

            {/* رمز عبور */}
            <Input
              label="رمز عبور"
              placeholder="حداقل ۸ کاراکتر"
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
              required
              error={form.formState.errors.password?.message}
              {...form.register('password')}
              aria-label="رمز عبور"
              className="text-base sm:text-sm h-12 sm:h-10"
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-1"
                  aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* تأیید رمز عبور */}
            <Input
              label="تأیید رمز عبور"
              placeholder="رمز عبور را دوباره وارد کنید"
              type={showConfirmPassword ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
              required
              error={form.formState.errors.confirmPassword?.message}
              {...form.register('confirmPassword')}
              aria-label="تأیید رمز عبور"
              className="text-base sm:text-sm h-12 sm:h-10"
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-1"
                  aria-label={showConfirmPassword ? 'مخفی کردن تأیید رمز عبور' : 'نمایش تأیید رمز عبور'}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* راهنمای رمز عبور */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-800 mb-2 font-medium">رمز عبور باید شامل موارد زیر باشد:</p>
              <ul className="text-xs text-blue-700 space-y-1 mr-4">
                <li className="list-disc">حداقل ۸ کاراکتر</li>
                <li className="list-disc">حروف بزرگ و کوچک انگلیسی (a-z, A-Z)</li>
                <li className="list-disc">حداقل یک عدد (0-9)</li>
                <li className="list-disc">حداقل یک کاراکتر خاص (@$!%*?&#)</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full h-12 sm:h-10 text-base sm:text-sm"
              size="lg"
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
              aria-label="ثبت‌نام در سیستم"
            >
              ثبت‌نام
            </Button>
          </form>

          {/* لینک ورود */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              قبلاً ثبت‌نام کرده‌اید؟{' '}
              <Link 
                href="/auth/login" 
                className="text-primary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                وارد شوید
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 sm:mt-6 px-4">
          با ثبت‌نام، با{' '}
          <a href="/terms" className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">
            قوانین و مقررات
          </a>{' '}
          و{' '}
          <a href="/privacy" className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">
            حریم خصوصی
          </a>{' '}
          موافقت می‌کنید
        </p>
      </div>
    </div>
  );
}
