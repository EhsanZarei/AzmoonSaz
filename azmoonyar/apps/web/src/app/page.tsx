import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary/5">
      {/* هدر */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">آ</span>
          </div>
          <span className="font-bold text-xl">آزمونیار</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">ورود</Button>
          </Link>
          <Link href="/auth/login">
            <Button>شروع رایگان</Button>
          </Link>
        </div>
      </header>

      {/* هیرو */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
          🤖 ساخت آزمون با هوش مصنوعی فارسی
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          آزمون‌ساز آنلاین
          <br />
          <span className="text-primary">برای معلمان ایرانی</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          در کمتر از ۶۰ ثانیه آزمون بسازید. با هوش مصنوعی، گیمیفیکیشن و گواهینامه دیجیتال.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/login">
            <Button size="lg" className="px-8">
              رایگان شروع کنید
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline">
              بیشتر بدانید
            </Button>
          </Link>
        </div>
      </section>

      {/* ویژگی‌ها */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">چرا آزمونیار؟</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { emoji: '🤖', title: 'AI مکالمه‌ای فارسی', desc: 'فقط بگویید «یه آزمون ۲۰ سوالی از فصل ۳ شیمی بساز» — آزمون آماده است.' },
            { emoji: '🎮', title: 'گیمیفیکیشن پیشرفته', desc: 'Confidence Mode، لیدربورد زنده، نشان‌ها و آزمون زنده مثل Kahoot.' },
            { emoji: '🏆', title: 'گواهینامه دیجیتال', desc: 'گواهینامه با QR Code قابل تأیید، ارسال خودکار به ایمیل دانش‌آموز.' },
            { emoji: '📱', title: 'موبایل‌فرست', desc: 'طراحی از ابتدا برای موبایل ایرانی. کار می‌کند حتی با اینترنت ضعیف.' },
            { emoji: '💳', title: 'پرداخت ریالی', desc: 'زرین‌پال و IDPay. بدون نیاز به ارز خارجی یا VPN.' },
            { emoji: '🔒', title: 'امنیت آزمون', desc: 'Browser Lockdown، تشخیص تقلب، نظارت با دوربین — بدون نرم‌افزار جانبی.' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">همین الان شروع کنید</h2>
        <p className="text-primary-100 mb-8">رایگان، بدون نیاز به کارت بانکی</p>
        <Link href="/auth/login">
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100">
            ثبت‌نام رایگان
          </Button>
        </Link>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400">
        © ۱۴۰۵ آزمونیار — ساخته شده با ❤️ برای معلمان ایران
      </footer>
    </div>
  );
}
