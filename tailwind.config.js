/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        card: '#1e293b',
        cardhover: '#243244',
        border: '#334155',
        primary: '#3b82f6',
        success: '#22c55e',
        warning: '#f97316',
        danger: '#ef4444',
        muted: '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
