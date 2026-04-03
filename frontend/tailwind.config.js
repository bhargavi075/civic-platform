/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#a855f7',
          700: '#9333ea',
          800: '#7e22ce',
          900: '#6b21a8',
          950: '#4a044e',
        },
        civic: {
          teal:    '#10b981',
          amber:   '#f59e0b',
          rose:    '#f43f5e',
          indigo:  '#6366f1',
          emerald: '#059669',
          sky:     '#0ea5e9',
          purple:  '#a855f7',
        }
      },
      boxShadow: {
        'purple': '0 3px 14px rgba(168,85,247,.35)',
        'card':   '0 2px 12px rgba(168,85,247,.08)',
        'card-hover': '0 8px 28px rgba(168,85,247,.15)',
      },
      animation: {
        'fade-in':  'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow':'pulse 3s infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      }
    }
  },
  plugins: []
}
