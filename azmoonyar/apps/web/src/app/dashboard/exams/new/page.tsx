'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { examsApi } from '@/lib/api';

const schema = z.object({
  title: z.string().min(3, 'عنوان باید حداقل ۳ کاراکتر باشد').max(200),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  language: z.enum(['fa', 'en']).default('fa'),
});

type FormData = z.infer<typeof schema>;

const categories = [
  'ریاضی', 'علوم', 'فیزیک', 'شیمی', 'زیست‌شناسی',
  'تاریخ', 'جغرافیا', 'ادبیات', 'زبان انگلیسی',
  'برنامه‌نویسی', 'هوش مصنوعی', 'کسب‌وکار', 'سایر',
];

export default function NewExamPage() {
  const router = useRouter();
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await examsApi.create({
        title: data.title,
        description: data.description,
        settings: {
          language: data.language,
          category: data.category,
          timer: null,
          shuffle_questions: false,
          show_result: 'immediately',
          passing_score: 60,
        },
      });
      toast.success('آزمون ساخته شد');
      router.push(`/dashboard/exams/${res.data.id}/edit`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ساخت آزمون');
    }
  };

  const handleAiCreate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('لطفاً توضیح آزمون را بنویسید');
      return;
    }
    setIsGenerating(true);
    try {
      // ابتدا آزمون خالی می‌سازیم
      const examRes = await examsApi.create({
        title: aiPrompt.slice(0, 100),
        description: aiPrompt,
        settings: { language: 'fa', ai_generated: true },
      });
      toast.success('آزمون ساخته شد — در حال تولید سوالات با AI...');
      router.push(`/dashboard/exams/${examRes.data.id}/edit?ai=true&prompt=${encodeURIComponent(aiPrompt)}`);
    } catch (err: any) {
      toast.error('خطا در ساخت آزمون');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* هدر */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت
        </button>
        <h1 className="text-2xl font-bold">آزمون جدید</h1>
        <p className="text-gray-500 mt-1">آزمون خود را بسازید یا از AI کمک بگیرید</p>
      </div>

      {/* انتخاب روش */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setIsAiMode(false)}
          className={`p-5 rounded-2xl border-2 text-right transition-all ${
            !isAiMode ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="text-2xl mb-2">✏️</div>
          <p className="font-bold">ساخت دستی</p>
          <p className="text-sm text-gray-500 mt-1">سوالات را خودتان اضافه کنید</p>
        </button>
        <button
          onClick={() => setIsAiMode(true)}
          className={`p-5 rounded-2xl border-2 text-right transition-all ${
            isAiMode ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="text-2xl mb-2">🤖</div>
          <p className="font-bold">ساخت با AI</p>
          <p className="text-sm text-gray-500 mt-1">هوش مصنوعی سوالات می‌سازد</p>
        </button>
      </div>

      {/* فرم دستی */}
      {!isAiMode && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="عنوان آزمون"
              placeholder="مثال: آزمون فصل ۳ شیمی"
              required
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">توضیحات (اختیاری)</label>
              <textarea
                placeholder="توضیح کوتاهی درباره آزمون..."
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">دسته‌بندی</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('category')}
                >
                  <option value="">انتخاب کنید</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">زبان</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('language')}
                >
                  <option value="fa">فارسی</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              ساخت آزمون و افزودن سوالات
            </Button>
          </form>
        </div>
      )}

      {/* فرم AI */}
      {isAiMode && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold">ساخت آزمون با هوش مصنوعی</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            بگویید چه آزمونی می‌خواهید. AI سوالات را برای شما می‌سازد.
          </p>
          <div className="space-y-4">
            <textarea
              placeholder="مثال: یه آزمون ۱۵ سوالی از فصل ۳ شیمی آلی برای دانش‌آموزان پایه یازدهم بساز. سطح متوسط تا سخت."
              rows={5}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {[
                'آزمون ۱۰ سوالی ریاضی پایه نهم',
                'آزمون زبان انگلیسی سطح متوسط',
                'آزمون برنامه‌نویسی Python مقدماتی',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setAiPrompt(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              onClick={handleAiCreate}
              className="w-full"
              loading={isGenerating}
            >
              <Sparkles className="w-4 h-4 ml-1" />
              ساخت آزمون با AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
