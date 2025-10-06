/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // TU CONFIGURACIÓN EXISTENTE (se mantiene)
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },

      // ✅ NUEVA CONFIGURACIÓN AÑADIDA
      keyframes: {
        'pulse-bg': {
          '0%': { 'background-position': '200% 0' },
          '100%': { 'background-position': '-200% 0' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'order-update-glow': {
          '0%': { transform: 'scale(1.02)', 'box-shadow': '0 4px 20px rgba(59, 130, 246, 0.3)' },
          '50%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)', 'box-shadow': 'none' },
        },
        'realtime-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.2)' },
        },
        'slide-in-from-right': {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        'modal-update-progress': {
          '0%': { 'background-position': '200% 0' },
          '100%': { 'background-position': '-200% 0' },
        },
        'loading-shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-bg': 'pulse-bg 1.5s infinite ease-in-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'order-update-glow': 'order-update-glow 4s ease-out',
        'realtime-pulse': 'realtime-pulse 2s infinite',
        'slide-in-from-right': 'slide-in-from-right 0.4s ease-out',
        'modal-update-progress': 'modal-update-progress 2s ease-in-out',
        'loading-shine': 'loading-shine 1.5s infinite',
      }
    },
  },
  plugins: [],
}