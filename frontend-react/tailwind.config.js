/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',          // Deep minimalist obsidian
        panel: '#111113',       // Clean card surface
        'panel-alt': '#18181b',   // Elevated card element
        border: '#27272a',      // Subtle 1px zinc line
        'border-light': '#3f3f46',
        accent: '#f4f4f5',      // High-contrast clean white
        'accent-soft': '#27272a',
        primary: '#3b82f6',     // Precise electric blue
        emerald: {
          400: '#34d399',
          500: '#10b981',
          950: '#064e3b',
        },
        amber: '#f59e0b',
        red: '#ef4444',
        'text-dim': '#a1a1aa',  // Zinc 400
        'text-muted': '#71717a',// Zinc 500
        'text-main': '#fafafa', // Zinc 50
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Cascadia Code',
          'Fira Code',
          'monospace',
        ],
      },
      boxShadow: {
        minimal: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'minimal-lg': '0 8px 30px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
