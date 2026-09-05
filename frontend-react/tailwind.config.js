/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',          // Pure Black
        panel: '#09090b',       // Dark zinc card surface
        'panel-alt': '#121215',   // Elevated card element
        border: '#27272a',      // Subtle 1px line
        'border-light': '#3f3f46',
        accent: '#ffffff',      // Pure White
        'accent-soft': '#27272a',
        primary: '#ffffff',     // Pure White
        'text-dim': '#a1a1aa',  // Zinc 400
        'text-muted': '#71717a',// Zinc 500
        'text-main': '#ffffff', // Pure White
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
        minimal: '0 1px 2px 0 rgba(0, 0, 0, 0.6)',
        'minimal-lg': '0 8px 30px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
}
