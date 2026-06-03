'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const schema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setUser(data);
      toast.success('پروفایل به‌روز شد');
    },
    onError: () => toast.error('خطا در به‌روزرسانی'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">تنظیمات</h1>

      {/* پروفایل */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-bold mb-4">اطلاعات پروفایل</h2>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <Input
            label="نام و نام خانوادگی"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="شماره موبایل"
            value={user?.phone ?? ''}
            disabled
            hint="شماره موبایل قابل تغییر نیست"
          />
          <Button type="submit" loading={isSubmitting || updateMutation.isPending}>
            ذخیره تغییرات
          </Button>
        </form>
      </div>

      {/* اطلاعات حساب */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-bold mb-4">اطلاعات حساب</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">نقش</span>
            <span className="font-medium">
              {user?.role === 'TEACHER' ? 'مدرس' :
               user?.role === 'STUDENT' ? 'دانش‌آموز' :
               user?.role === 'ORG_ADMIN' ? 'مدیر سازمان' : user?.role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">شناسه کاربری</span>
            <span className="font-mono text-xs text-gray-400">{user?.id?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
