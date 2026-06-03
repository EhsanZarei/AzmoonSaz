'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, BarChart2, Users as UsersIcon,
  Award, Settings, LogOut, Zap, BookOpen, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { href: '/dashboard/exams', icon: FileText, label: 'آزمون‌ها' },
  { href: '/dashboard/reports', icon: BarChart2, label: 'گزارش‌ها' },
  { href: '/dashboard/students', icon: UsersIcon, label: 'دانش‌آموزان' },
  { href: '/dashboard/certificates', icon: Award, label: 'گواهینامه‌ها' },
  { href: '/dashboard/ai', icon: Zap, label: 'هوش مصنوعی' },
  { href: '/dashboard/question-bank', icon: BookOpen, label: 'بانک سوال' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 h-screen bg-white border-l border-border flex flex-col fixed right-0 top-0 z-40">
      {/* لوگو */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">آ</span>
          </div>
          <span className="font-bold text-lg">آزمونیار</span>
        </Link>
      </div>

      {/* منو */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* پروفایل */}
      <div className="p-4 border-t border-border space-y-1">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100"
        >
          <User className="w-5 h-5" />
          پروفایل
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100"
        >
          <Settings className="w-5 h-5" />
          تنظیمات
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          خروج
        </button>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.phone || user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
