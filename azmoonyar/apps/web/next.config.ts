import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // فعال‌سازی App Router
  experimental: {
    typedRoutes: true,
  },

  // تنظیمات تصویر
  images: {
    domains: ['localhost', 'minio', 'cdn.azmoonyar.ir'],
    formats: ['image/webp', 'image/avif'],
  },

  // هدرهای امنیتی
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=self, microphone=self, geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirect های پایه
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/exams',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
