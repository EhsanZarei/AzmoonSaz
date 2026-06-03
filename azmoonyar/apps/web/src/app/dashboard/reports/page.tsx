'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { toPersianNumber, formatPersianDate } from '@/lib/utils';
import { BarChart2, Users, TrendingUp, Award } from 'lucide-react';

export default function ReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => reportsApi.studentDashboard().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">گزارش‌ها</h1>

      {/* آمار کلی */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{toPersianNumber(stats?.totalExams ?? 0)}</p>
          <p className="text-sm text-gray-500">آزمون شرکت‌کرده</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold">{toPersianNumber(stats?.avgScore ?? 0)}٪</p>
          <p className="text-sm text-gray-500">میانگین نمره</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold">
            {toPersianNumber(stats?.recentResults?.filter((r: any) => r.passed).length ?? 0)}
          </p>
          <p className="text-sm text-gray-500">آزمون قبول‌شده</p>
        </div>
      </div>

      {/* نتایج اخیر */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-lg">نتایج اخیر</h2>
        </div>
        <div className="divide-y divide-border">
          {stats?.recentResults?.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>هنوز در هیچ آزمونی شرکت نکرده‌اید</p>
            </div>
          )}
          {stats?.recentResults?.map((result: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{result.examTitle}</p>
                <p className="text-xs text-gray-400">
                  {result.completedAt ? formatPersianDate(result.completedAt) : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{toPersianNumber(Math.round(result.score ?? 0))}٪</span>
                <span className={`text-xs px-2 py-1 rounded-full ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                  {result.passed ? 'قبول' : 'رد'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
