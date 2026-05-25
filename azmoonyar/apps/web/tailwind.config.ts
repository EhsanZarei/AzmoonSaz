import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-vazirmatn)', 'Tahoma', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          50: '#F0EFFF',
          100: '#E4E2FF',
          200: '#C9C5FF',
          300: '#AEA8FF',
          400: '#938BFF',
          500: '#6C63FF',
          600: '#5A52E0',
          700: '#4840C0',
          800: '#362FA0',
          900: '#241E80',
        },
        secondary: {
          DEFAULT: '#FF6584',
          500: '#FF6584',
        },
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
      // انیمیشن‌های سفارشی
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
