'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Edit, Send, Users, BarChart2, Copy, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { examsApi, reportsApi } from '@/lib/api';
import { toPersianNumber, formatPersianDate } from '@/lib/utils';

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.get(id).then((r) => r.data),
  });

  const { data: report } = useQuery({
    queryKey: ['exam-report', id],
    queryFn: () => reportsApi.examReport(id).then((r) => r.data),
    enabled: exam?.status === 'PUBLISHED',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!exam) return null;

  const examUrl = `${process.env.NEXT_PUBLIC_APP_URL}/exam/${id}`;

  return (
    <div className="max-w-4xl space-y-6">
      {/* هدر */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-2"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </button>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {exam.status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'}
            </span>
            <span className="text-sm text-gray-400">
              {toPersianNumber(exam.questions?.length ?? 0)} سوال
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/exams/${id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 ml-1" />
              ویرایش
            </Button>
          </Link>
          {exam.status === 'PUBLISHED' && (
            <a href={examUrl} target="_blank" rel="noopener noreferrer">
              <Button>
                <Eye className="w-4 h-4 ml-1" />
                مشاهده آزمون
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* لینک اشتراک‌گذاری */}
      {exam.status === 'PUBLISHED' && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-bold mb-3">لینک آزمون</h2>
          <div className="flex gap-2">
            <input
              readOnly
              value={examUrl}
              className="flex-1 bg-gray-50 rounded-xl border border-border px-3 py-2 text-sm font-mono"
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(examUrl);
              }}
            >
              <Copy className="w-4 h-4 ml-1" />
              کپی
            </Button>
          </div>
        </div>
      )}

      {/* آمار */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'شرکت‌کننده', value: report.summary?.totalSubmissions ?? 0, icon: Users },
            { label: 'قبول‌شده', value: report.summary?.passedCount ?? 0, icon: BarChart2 },
            { label: 'نرخ قبولی', value: `${report.summary?.passRate ?? 0}٪`, icon: BarChart2 },
            { label: 'میانگین نمره', value: `${report.summary?.avgScore ?? 0}٪`, icon: BarChart2 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-border p-4 text-center">
              <p className="text-2xl font-bold">{typeof stat.value === 'number' ? toPersianNumber(stat.value) : stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* لیست شرکت‌کنندگان */}
      {report?.participants?.length > 0 && (
        <div className="bg-white rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold">شرکت‌کنندگان</h2>
          </div>
          <div className="divide-y divide-border">
            {report.participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.completedAt ? formatPersianDate(p.completedAt) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{toPersianNumber(Math.round(p.percentage ?? 0))}٪</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                    {p.passed ? 'قبول' : 'رد'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
