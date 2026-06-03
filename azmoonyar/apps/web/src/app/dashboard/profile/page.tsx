'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  User, Mail, Phone, Building2, Briefcase, 
  Upload, Camera, Bell, Monitor, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns-jalali';

// Schema for profile form
const profileSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  email: z.string().email('ایمیل نامعتبر است').optional().or(z.literal('')),
  organizationName: z.string().optional(),
  position: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Schema for notification settings
const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  examCompletedNotif: z.boolean(),
  newStudentNotif: z.boolean(),
  reportReadyNotif: z.boolean(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatarUrl);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      organizationName: '',
      position: '',
    },
  });

  // Notification form
  const {
    register: registerNotif,
    handleSubmit: handleSubmitNotif,
    watch: watchNotif,
    setValue: setValueNotif,
    formState: { isSubmitting: isNotifSubmitting },
  } = useForm<NotificationFormData>({
    defaultValues: {
      emailNotifications: true,
      smsNotifications: true,
      inAppNotifications: true,
      examCompletedNotif: true,
      newStudentNotif: false,
      reportReadyNotif: true,
    },
  });

  // Fetch active sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.email) formData.append('email', data.email);
      if (data.organizationName) formData.append('organizationName', data.organizationName);
      if (data.position) formData.append('position', data.position);
      if (selectedAvatar) formData.append('avatar', selectedAvatar);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data);
      toast.success('پروفایل با موفقیت به‌روز شد');
      setSelectedAvatar(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'خطا در به‌روزرسانی پروفایل');
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/me/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update notifications');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('تنظیمات اعلان‌ها به‌روز شد');
    },
    onError: (error: any) => {
      toast.error(error.message || 'خطا در به‌روزرسانی تنظیمات');
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke session');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('دستگاه از حساب شما خارج شد');
    },
    onError: (error: any) => {
      toast.error(error.message || 'خطا در خروج از دستگاه');
    },
  });

  // Revoke all sessions mutation
  const revokeAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/sessions`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke all sessions');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('از همه دستگاه‌ها خارج شدید');
    },
    onError: (error: any) => {
      toast.error(error.message || 'خطا در خروج از دستگاه‌ها');
    },
  });

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم تصویر نباید بیشتر از ۲ مگابایت باشد');
        return;
      }
      setSelectedAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile submit
  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle notification submit
  const onNotificationSubmit = (data: NotificationFormData) => {
    updateNotificationsMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">مدیریت پروفایل</h1>
        <p className="text-gray-500 mt-2">اطلاعات شخصی و تنظیمات حساب کاربری خود را مدیریت کنید</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 ml-2" />
            اطلاعات پروفایل
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 ml-2" />
            اعلان‌ها
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Monitor className="w-4 h-4 ml-2" />
            دستگاه‌ها
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle>تصویر پروفایل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar
                    src={avatarPreview}
                    fallback={user?.name.charAt(0)}
                    size="xl"
                  />
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">
                      تصویری با فرمت JPG یا PNG و حجم حداکثر ۲ مگابایت آپلود کنید
                    </p>
                    <div className="flex gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleAvatarChange}
                          className="sr-only"
                        />
                        <span className="inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-medium rounded-xl border-2 border-primary text-primary bg-transparent hover:bg-primary/10 transition-all">
                          <Upload className="w-4 h-4 ml-2" />
                          آپلود تصویر
                        </span>
                      </label>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAvatarPreview(undefined);
                            setSelectedAvatar(null);
                          }}
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات شخصی</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="نام و نام خانوادگی"
                  placeholder="نام کامل خود را وارد کنید"
                  startIcon={<User className="w-4 h-4" />}
                  error={profileErrors.name?.message}
                  {...registerProfile('name')}
                  required
                />

                <Input
                  label="شماره موبایل"
                  value={user?.phone ?? ''}
                  disabled
                  startIcon={<Phone className="w-4 h-4" />}
                  hint="شماره موبایل قابل تغییر نیست"
                />

                <Input
                  label="آدرس ایمیل"
                  type="email"
                  placeholder="example@domain.com"
                  startIcon={<Mail className="w-4 h-4" />}
                  error={profileErrors.email?.message}
                  {...registerProfile('email')}
                />
              </CardContent>
            </Card>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات سازمانی</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="نام سازمان / مدرسه"
                  placeholder="نام مدرسه یا سازمان خود را وارد کنید"
                  startIcon={<Building2 className="w-4 h-4" />}
                  {...registerProfile('organizationName')}
                />

                <Input
                  label="سمت"
                  placeholder="مثلاً: معلم ریاضی، مدیر آموزش"
                  startIcon={<Briefcase className="w-4 h-4" />}
                  {...registerProfile('position')}
                />
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات حساب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">نقش کاربری</span>
                    <span className="font-medium">
                      {user?.role === 'TEACHER'
                        ? 'مدرس'
                        : user?.role === 'STUDENT'
                        ? 'دانش‌آموز'
                        : user?.role === 'ORG_ADMIN'
                        ? 'مدیر سازمان'
                        : user?.role}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t">
                    <span className="text-gray-500">شناسه کاربری</span>
                    <span className="font-mono text-xs text-gray-400">
                      {user?.id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t">
                    <span className="text-gray-500">تاریخ عضویت</span>
                    <span className="text-gray-600">
                      {format(new Date(), 'yyyy/MM/dd')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={isProfileSubmitting || updateProfileMutation.isPending}
                size="lg"
              >
                ذخیره تغییرات
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <form onSubmit={handleSubmitNotif(onNotificationSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>روش‌های اعلان</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">اعلان از طریق ایمیل</p>
                    <p className="text-sm text-gray-500">دریافت اعلان‌ها به آدرس ایمیل</p>
                  </div>
                  <Switch
                    checked={watchNotif('emailNotifications')}
                    onCheckedChange={(checked) => setValueNotif('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">اعلان از طریق پیامک</p>
                    <p className="text-sm text-gray-500">دریافت اعلان‌ها به شماره موبایل</p>
                  </div>
                  <Switch
                    checked={watchNotif('smsNotifications')}
                    onCheckedChange={(checked) => setValueNotif('smsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">اعلان درون‌برنامه‌ای</p>
                    <p className="text-sm text-gray-500">نمایش اعلان‌ها در داشبورد</p>
                  </div>
                  <Switch
                    checked={watchNotif('inAppNotifications')}
                    onCheckedChange={(checked) => setValueNotif('inAppNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>انواع اعلان</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">اتمام آزمون</p>
                    <p className="text-sm text-gray-500">
                      زمانی که دانش‌آموزی آزمون را تکمیل می‌کند
                    </p>
                  </div>
                  <Switch
                    checked={watchNotif('examCompletedNotif')}
                    onCheckedChange={(checked) => setValueNotif('examCompletedNotif', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">دانش‌آموز جدید</p>
                    <p className="text-sm text-gray-500">زمانی که دانش‌آموزی به کلاس اضافه می‌شود</p>
                  </div>
                  <Switch
                    checked={watchNotif('newStudentNotif')}
                    onCheckedChange={(checked) => setValueNotif('newStudentNotif', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">گزارش آماده</p>
                    <p className="text-sm text-gray-500">زمانی که گزارش آزمون آماده می‌شود</p>
                  </div>
                  <Switch
                    checked={watchNotif('reportReadyNotif')}
                    onCheckedChange={(checked) => setValueNotif('reportReadyNotif', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={isNotifSubmitting || updateNotificationsMutation.isPending}
                size="lg"
              >
                ذخیره تنظیمات
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>دستگاه‌های متصل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">دستگاه متصلی یافت نشد</p>
                ) : (
                  sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <Monitor className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{session.device || 'دستگاه ناشناس'}</p>
                          <p className="text-sm text-gray-500">
                            {session.browser} • {session.os}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            آخرین فعالیت: {format(new Date(session.lastActivity), 'yyyy/MM/dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      {session.isCurrent ? (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                          دستگاه فعلی
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeSessionMutation.mutate(session.id)}
                          loading={revokeSessionMutation.isPending}
                        >
                          خروج
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {sessions.length > 1 && (
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeAllSessionsMutation.mutate()}
                    loading={revokeAllSessionsMutation.isPending}
                  >
                    خروج از همه دستگاه‌ها
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    با این کار از تمام دستگاه‌ها به جز دستگاه فعلی خارج خواهید شد
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
