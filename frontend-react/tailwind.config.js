/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',          // Pure White Background
        panel: '#ffffff',       // White card surface
        'panel-alt': '#f4f4f5',   // Off-white / light zinc layer
        border: '#e4e4e7',      // Light border line (zinc-200)
        'border-light': '#d4d4d8',
        accent: '#000000',      // Pure Black Accent
        'accent-soft': '#f4f4f5',
        primary: '#000000',     // Pure Black
        'text-dim': '#52525b',  // Zinc 600
        'text-muted': '#71717a',// Zinc 500
        'text-main': '#000000', // Pure Black Text
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
        minimal: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'minimal-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
