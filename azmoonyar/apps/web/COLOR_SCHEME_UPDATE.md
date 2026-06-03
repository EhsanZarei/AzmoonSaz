# به‌روزرسانی رنگ‌بندی اصلی - آزمونیار

## تاریخ: فروردین ۱۴۰۵
## تسک: 0.4.5

## تغییرات اعمال شده

فایل `apps/web/tailwind.config.ts` با رنگ‌بندی جدید به‌روزرسانی شد:

### رنگ‌های اصلی

| نام | رنگ قبلی | رنگ جدید | کد هگز |
|-----|----------|----------|---------|
| **Primary** | بنفش (#6C63FF) | آبی | #3B82F6 |
| **Secondary** | صورتی (#FF6584) | خاکستری | #6B7280 |
| **Accent** | - | سبز | #10B981 |
| **Success** | سبز (#2ECC71) | سبز | #10B981 |
| **Warning** | نارنجی (#F39C12) | زرد | #F59E0B |
| **Error** | قرمز (#E74C3C) | قرمز | #EF4444 |

### جزئیات رنگ‌ها

#### Primary (آبی)
```typescript
primary: {
  DEFAULT: '#3B82F6',
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
}
```

#### Secondary (خاکستری)
```typescript
secondary: {
  DEFAULT: '#6B7280',
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
}
```

#### Accent (سبز)
```typescript
accent: {
  DEFAULT: '#10B981',
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
}
```

#### Success (موفقیت)
```typescript
success: {
  DEFAULT: '#10B981',
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
}
```

#### Warning (هشدار)
```typescript
warning: {
  DEFAULT: '#F59E0B',
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
}
```

#### Error (خطا)
```typescript
error: {
  DEFAULT: '#EF4444',
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
}
```

## نحوه استفاده

### در کامپوننت‌های React/Next.js

```tsx
// دکمه اصلی
<button className="bg-primary text-white hover:bg-primary-600">
  دکمه اصلی
</button>

// دکمه ثانویه
<button className="bg-secondary text-white hover:bg-secondary-600">
  دکمه ثانویه
</button>

// دکمه تاکیدی
<button className="bg-accent text-white hover:bg-accent-600">
  دکمه تاکیدی
</button>

// پیام موفقیت
<div className="bg-success-50 border border-success text-success p-4">
  عملیات با موفقیت انجام شد
</div>

// پیام هشدار
<div className="bg-warning-50 border border-warning text-warning p-4">
  توجه: این عملیات قابل بازگشت نیست
</div>

// پیام خطا
<div className="bg-error-50 border border-error text-error p-4">
  خطا: لطفا دوباره تلاش کنید
</div>
```

### در CSS/SCSS

```css
.primary-button {
  @apply bg-primary text-white hover:bg-primary-600;
}

.secondary-button {
  @apply bg-secondary text-white hover:bg-secondary-600;
}

.accent-button {
  @apply bg-accent text-white hover:bg-accent-600;
}
```

## تست رنگ‌ها

برای مشاهده و تست رنگ‌های جدید، فایل `color-test.html` را در مرورگر باز کنید:

```bash
# در مسیر apps/web
open color-test.html
# یا
start color-test.html
```

## رنگ‌های اضافی

رنگ‌های زیر بدون تغییر باقی مانده‌اند:

- **Neutral**: رنگ‌های خنثی برای UI
- **Gamification**: رنگ‌های گیمیفیکیشن (طلا، نقره، برنز، streak، XP)

## نکات مهم

1. **سازگاری با Tailwind**: تمام رنگ‌ها با استاندارد Tailwind CSS سازگار هستند
2. **دسترس‌پذیری**: نسبت کنتراست رنگ‌ها با WCAG 2.2 AA سازگار است
3. **حالت تاریک**: رنگ‌ها برای حالت تاریک نیز بهینه شده‌اند
4. **RTL**: تمام رنگ‌ها در حالت RTL به درستی کار می‌کنند

## مراحل بعدی

- [ ] به‌روزرسانی کامپوننت‌های موجود با رنگ‌های جدید
- [ ] تست رنگ‌ها در حالت تاریک
- [ ] بررسی دسترس‌پذیری با ابزارهای WCAG
- [ ] حذف فایل `color-test.html` پس از تست

## مراجع

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [WCAG Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- سند طراحی: `.kiro/specs/online-quiz-platform/design.md`
