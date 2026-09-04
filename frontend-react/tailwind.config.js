/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1417',
        panel: '#161d21',
        'panel-alt': '#1c252a',
        border: '#2a353b',
        accent: '#4fb3a9',
        'accent-soft': '#2a4a47',
        amber: '#d99a3f',
        red: '#c85a4f',
        'text-dim': '#8a999e',
        'text-main': '#dfe6e8',
        green: '#6fd196',
        purple: '#8899ff',
        orange: '#ff8844',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
