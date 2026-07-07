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
        muted: '#1e1e1e',
        'muted-2': '#2a2a2a',
        border: '#2e2e2e',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'text-muted': '#666666',
        'online': '#22c55e',
        'away': '#f59e0b',
        'bubble-out': '#1a3a1a',
        'bubble-in': '#1e1e1e',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-dot': 'pulseDot 1.5s infinite',
        'bounce-dots': 'bounceDots 1.4s infinite',
        'recording-pulse': 'recordingPulse 1s infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        bounceDots: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: 0.5 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
        recordingPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(215,42,42,0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(215,42,42,0)' },
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.4)',
        'modal': '0 20px 60px rgba(0,0,0,0.8)',
        'bubble': '0 1px 2px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}