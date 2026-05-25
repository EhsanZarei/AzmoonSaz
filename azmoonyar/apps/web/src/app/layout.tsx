import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'آزمونیار — پلتفرم آزمون‌ساز آنلاین فارسی',
    template: '%s | آزمونیار',
  },
  description: 'ساخت آزمون آنلاین با هوش مصنوعی، گیمیفیکیشن و گواهینامه دیجیتال',
  keywords: ['آزمون آنلاین', 'آزمون‌ساز', 'پرسشنامه', 'هوش مصنوعی', 'آموزش'],
  authors: [{ name: 'آزمونیار' }],
  creator: 'آزمونیار',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://azmoonyar.ir'),
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'آزمونیار',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              dir="rtl"
              toastOptions={{
                style: { fontFamily: 'Vazirmatn, Tahoma, sans-serif' },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
