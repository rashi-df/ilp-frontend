/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: { DEFAULT: '#059669', light: '#10b981', bg: '#ecfdf5' },
        warning: { DEFAULT: '#d97706', light: '#f59e0b', bg: '#fffbeb' },
        danger: { DEFAULT: '#dc2626', light: '#ef4444', bg: '#fef2f2' },
        sidebar: { DEFAULT: '#1e293b', hover: '#334155', active: '#0f172a' },
        surface: { DEFAULT: '#ffffff', alt: '#f5f7fa', border: '#e2e8f0' },
        text: { primary: '#1e293b', secondary: '#64748b', muted: '#9ca3af' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
