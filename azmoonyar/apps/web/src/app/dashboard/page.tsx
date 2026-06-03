'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Users, TrendingUp, Clock } from 'lucide-react';
import { reportsApi, examsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toPersianNumber, formatPersianDate } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-3xl font-bold mb-1">{toPersianNumber(value)}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
  });

  const { data: examsData } = useQuery({
    queryKey: ['exams', 'recent'],
    queryFn: () => examsApi.list({ limit: 5 }).then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      {/* سرتیتر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            خوش آمدید، {user?.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">امروز چه آزمونی می‌سازید؟</p>
        </div>
        <Link href="/dashboard/exams/new">
          <Button size="lg">+ آزمون جدید</Button>
        </Link>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="آزمون فعال"
          value={stats?.activeExams ?? 0}
          color="bg-primary"
        />
        <StatCard
          icon={Users}
          label="شرکت‌کننده این هفته"
          value={stats?.weeklySubmissions ?? 0}
          color="bg-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="میانگین نمره"
          value={`${stats?.avgScore ?? 0}٪`}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label="در انتظار نمره‌دهی"
          value={stats?.pendingGrading ?? 0}
          color="bg-orange-500"
        />
      </div>

      {/* آزمون‌های اخیر */}
      <div className="bg-white rounded-2xl shadow-sm border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-bold text-lg">آزمون‌های اخیر</h2>
          <Link href="/dashboard/exams" className="text-sm text-primary hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="divide-y divide-border">
          {examsData?.data?.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>هنوز آزمونی نساخته‌اید</p>
              <Link href="/dashboard/exams/new">
                <Button variant="outline" className="mt-4">
                  اولین آزمون را بسازید
                </Button>
              </Link>
            </div>
          )}
          {examsData?.data?.map((exam: any) => (
            <div key={exam.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-xs text-gray-400">
                    {toPersianNumber(exam._count?.questions ?? 0)} سوال ·{' '}
                    {toPersianNumber(exam._count?.submissions ?? 0)} شرکت‌کننده
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    exam.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {exam.status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'}
                </span>
                <Link href={`/dashboard/exams/${exam.id}`}>
                  <Button variant="ghost" size="sm">مشاهده</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
