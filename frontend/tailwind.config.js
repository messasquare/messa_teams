// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'messa-red': '#D72A2A',
        'messa-red-dark': '#B71C1C',
        'messa-red-light': '#EF5350',
        dark: '#0a0a0a',
        card: '#141414',
        'card-hover': '#1a1a1a',
        muted: '#1e1e1e',
        'muted-2': '#2a2a2a',
        border: '#2e2e2e',
        'border-light': '#3a3a3a',
        'text-primary': '#ffffff',
        'text-secondary': '#b3b3b3',
        'text-muted': '#707070',
        online: '#22c55e',
        away: '#f59e0b',
        offline: '#6b7280',
        'bubble-out': '#0e3a2e',
        'bubble-in': '#1e1e1e',
      },
      fontFamily: {
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 1.5s infinite',
        'bounce-dot': 'bounceDot 1.4s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'recording-pulse': 'recordingPulse 1.5s infinite',
        'ring-pulse': 'ringPulse 1s infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideInLeft: {
          from: { transform: 'translateX(-20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.1)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.5 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        recordingPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(215,42,42,0.6)' },
          '50%': { boxShadow: '0 0 0 12px rgba(215,42,42,0)' },
        },
        ringPulse: {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(2.5)', opacity: 0 },
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.5)',
        modal: '0 25px 80px rgba(0,0,0,0.8)',
        bubble: '0 1px 2px rgba(0,0,0,0.4)',
        'glow-red': '0 0 20px rgba(215,42,42,0.3)',
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}