/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          dark: '#0a0f1e',
          mid: '#0d1b2a',
        },
        brand: {
          orange: '#ff6b35',
          amber: '#f7931e',
          blue: '#4361ee',
          purple: '#7b2ff7',
        },
      },
    },
  },
  plugins: [],
}
