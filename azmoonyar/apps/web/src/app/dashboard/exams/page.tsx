'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileText, MoreVertical, Copy, Trash2, Eye, Send } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { examsApi } from '@/lib/api';
import { toPersianNumber, formatPersianDate } from '@/lib/utils';

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['exams', search, statusFilter],
    queryFn: () =>
      examsApi.list({ search: search || undefined, status: statusFilter || undefined }).then((r) => r.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => examsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('آزمون منتشر شد');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => examsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('آزمون کپی شد');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('آزمون حذف شد');
    },
  });

  const statusLabels: Record<string, string> = {
    DRAFT: 'پیش‌نویس',
    PUBLISHED: 'منتشر شده',
    ARCHIVED: 'آرشیو',
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    PUBLISHED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">آزمون‌ها</h1>
        <Link href="/dashboard/exams/new">
          <Button>
            <Plus className="w-4 h-4 ml-1" />
            آزمون جدید
          </Button>
        </Link>
      </div>

      {/* فیلترها */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="جستجو در آزمون‌ها..."
            startIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">منتشر شده</option>
          <option value="ARCHIVED">آرشیو</option>
        </select>
      </div>

      {/* لیست آزمون‌ها */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">آزمونی یافت نشد</h3>
          <p className="text-gray-400 mb-6">اولین آزمون خود را بسازید</p>
          <Link href="/dashboard/exams/new">
            <Button>ساخت آزمون جدید</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((exam: any) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[exam.status]}`}>
                    {statusLabels[exam.status]}
                  </span>
                  <div className="relative group">
                    <button className="p-1 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    <div className="absolute left-0 top-8 bg-white border border-border rounded-xl shadow-lg py-1 w-40 hidden group-hover:block z-10">
                      <button
                        onClick={() => duplicateMutation.mutate(exam.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <Copy className="w-4 h-4" /> کپی آزمون
                      </button>
                      {exam.status === 'DRAFT' && (
                        <button
                          onClick={() => publishMutation.mutate(exam.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-green-600"
                        >
                          <Send className="w-4 h-4" /> انتشار
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('آیا مطمئنید؟')) deleteMutation.mutate(exam.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-base mb-1 line-clamp-2">{exam.title}</h3>
                {exam.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{exam.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                  <span>{toPersianNumber(exam._count?.questions ?? 0)} سوال</span>
                  <span>{toPersianNumber(exam._count?.submissions ?? 0)} شرکت‌کننده</span>
                </div>
              </div>

              <div className="border-t border-border p-3 flex gap-2">
                <Link href={`/dashboard/exams/${exam.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 ml-1" /> مشاهده
                  </Button>
                </Link>
                <Link href={`/dashboard/exams/${exam.id}/edit`} className="flex-1">
                  <Button size="sm" className="w-full">ویرایش</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
