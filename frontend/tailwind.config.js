/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beatwap: {
          gold: '#F5C542',
          black: '#0B0B0B',
          graphite: '#1C1C1E',
          white: '#F5F5F7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'gold-fade': {
          '0%, 100%': { color: 'rgba(245, 197, 66, 0.6)' },
          '50%': { color: 'rgba(245, 197, 66, 1)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gold-fade': 'gold-fade 2.2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
