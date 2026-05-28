import Link from 'next/link';
import { ArrowLeft, Sparkles, Brain, Target, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      
      {/* Header / Nav */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex justify-between items-center relative z-10">
        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <Target className="w-8 h-8" />
          <span>آزمونیار</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="#features" className="hover:text-indigo-600 transition-colors">امکانات</Link>
          <Link href="#pricing" className="hover:text-indigo-600 transition-colors">تعرفه‌ها</Link>
          <Link href="#about" className="hover:text-indigo-600 transition-colors">درباره ما</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
            ورود
          </Link>
          <Link href="/register" className="text-sm font-medium bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
            ثبت‌نام رایگان
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-6 relative overflow-hidden">
        
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center mt-20 md:mt-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium text-sm mb-8 border border-indigo-100 dark:border-indigo-900/50">
            <Sparkles className="w-4 h-4" />
            نسخه جدید ۲.۰ با پشتیبانی از هوش مصنوعی
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight mb-8">
            نسل جدید ساخت و برگزاری <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">
              آزمون‌های آنلاین
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-12">
            با کمک هوش مصنوعی، در چند ثانیه آزمون‌های استاندارد بسازید، به صورت زنده برگزار کنید و گواهینامه‌های معتبر صادر نمایید. اولین پلتفرم کاملاً بومی با استانداردهای جهانی.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl">
              شروع ساخت آزمون
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 px-8 py-4 rounded-2xl font-bold text-lg hover:border-indigo-600 dark:hover:border-indigo-400 transition-colors">
              مشاهده دمو
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 mb-20 relative z-10">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-right hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
              <Brain className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">دستیار هوشمند (AI)</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              فقط موضوع را به دستیار ما بگویید تا آزمونی کامل همراه با کلید سوالات و سطوح سختی متنوع برای شما تولید کند.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-right hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">آزمون‌های تعاملی</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              بیش از ۲۰ نوع سوال مختلف، حالت اطمینان (Confidence Mode) و سیستم رقابت زنده برای افزایش تعامل.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-right hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">امنیت و گواهینامه</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              برگزاری آزمون‌های امن با نظارت هوشمند و صدور آنی گواهینامه‌های معتبر بر بستر بلاکچین.
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}
