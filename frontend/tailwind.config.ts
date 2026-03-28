import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#050508',
        'bg-raised': '#0c0c12',
        'bg-overlay': '#111118',
        'bg-subtle': '#18181f',
        'border-default': 'rgba(255,255,255,0.07)',
        'border-hover': 'rgba(255,255,255,0.12)',
        accent: '#7c5cfc',
        'accent-glow': 'rgba(124,92,252,0.25)',
        'accent-2': '#c084fc',
        'accent-3': '#06b6d4',
        green: '#22d3a0',
        amber: '#fbbf24',
        red: '#f87171',
        text: '#e2e2f0',
        muted: '#6b6b80',
        'muted-2': '#9292a8',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        shake: 'shake 0.4s ease-in-out',
        'pulse-amber': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,92,252,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124,92,252,0.6)' },
        },
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
