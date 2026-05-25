import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';

// ترکیب کلاس‌های Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// فرمت تاریخ شمسی
export function formatPersianDate(date: Date | string, pattern = 'yyyy/MM/dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: faIR });
}

// تبدیل اعداد به فارسی
export function toPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
}

// فرمت عدد با جداکننده هزار
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num);
}

// کوتاه کردن متن
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// تولید رنگ تصادفی برای آواتار
export function generateAvatarColor(name: string): string {
  const colors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500',
    'bg-yellow-500', 'bg-red-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// تبدیل ثانیه به فرمت mm:ss
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// بررسی معتبر بودن ایمیل
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// بررسی معتبر بودن شماره موبایل ایران
export function isValidIranPhone(phone: string): boolean {
  return /^09[0-9]{9}$/.test(phone);
}
