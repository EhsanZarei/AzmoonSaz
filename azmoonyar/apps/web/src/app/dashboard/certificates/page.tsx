'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink } from 'lucide-react';
import { certificatesApi } from '@/lib/api';
import { formatPersianDate, toPersianNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function CertificatesPage() {
  const { data: certs, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.myList().then((r) => r.data),
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
      <h1 className="text-2xl font-bold">گواهینامه‌های من</h1>

      {certs?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">هنوز گواهینامه‌ای ندارید</h3>
          <p className="text-gray-400">با شرکت در آزمون‌ها و قبولی، گواهینامه دریافت کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs?.map((cert: any) => (
            <div
              key={cert.id}
              className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
            >
              {/* هدر گواهینامه */}
              <div className="bg-gradient-to-l from-primary to-primary/80 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-8 h-8" />
                  <span className="font-bold text-lg">گواهینامه موفقیت</span>
                </div>
                <p className="text-primary-100 text-sm">آزمون‌یار</p>
              </div>

              {/* محتوا */}
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-gray-400">عنوان آزمون</p>
                  <p className="font-bold">{cert.exam?.title}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-400">نمره</p>
                    <p className="font-bold text-green-600">
                      {toPersianNumber(Math.round(cert.submission?.percentage ?? 0))}٪
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">تاریخ صدور</p>
                    <p className="font-medium text-sm">
                      {formatPersianDate(cert.issuedAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">کد تأیید</p>
                  <p className="font-mono text-sm text-primary">{cert.uniqueCode}</p>
                </div>
              </div>

              {/* دکمه‌ها */}
              <div className="border-t border-border p-4 flex gap-2">
                <a
                  href={`https://azmoonai.ir/certificates/verify/${cert.uniqueCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 ml-1" />
                    تأیید اعتبار
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
