import { Award, CheckCircle, XCircle } from 'lucide-react';
import { formatPersianDate } from '@/lib/utils';

async function getCertificate(code: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/certificates/verify/${code}`,
      { cache: 'no-store' }
    );
    return res.json();
  } catch {
    return null;
  }
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getCertificate(code);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* هدر */}
        <div className="bg-gradient-to-l from-primary to-primary/80 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">آزمون‌یار</h1>
          <p className="text-primary-100 text-sm mt-1">تأیید اعتبار گواهینامه</p>
        </div>

        {/* محتوا */}
        <div className="p-8">
          {!data || !data.valid ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">گواهینامه نامعتبر</h2>
              <p className="text-gray-500 text-sm">
                {data?.reason ?? 'این گواهینامه در سیستم یافت نشد یا معتبر نیست.'}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-green-600">گواهینامه معتبر است</h2>

              <div className="bg-gray-50 rounded-xl p-4 text-right space-y-3 mt-4">
                <div>
                  <p className="text-xs text-gray-400">دارنده گواهینامه</p>
                  <p className="font-bold text-lg">{data.certificate.holderName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">عنوان آزمون</p>
                  <p className="font-medium">{data.certificate.examTitle}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-400">نمره</p>
                    <p className="font-bold text-green-600">
                      {Math.round(data.certificate.score ?? 0)}٪
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">تاریخ صدور</p>
                    <p className="font-medium text-sm">
                      {formatPersianDate(data.certificate.issuedAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">کد تأیید</p>
                  <p className="font-mono text-sm text-primary">{data.certificate.uniqueCode}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 text-center">
          <a href="https://azmoonai.ir" className="text-sm text-primary hover:underline">
            آزمون‌یار — پلتفرم آزمون‌ساز آنلاین فارسی
          </a>
        </div>
      </div>
    </div>
  );
}
