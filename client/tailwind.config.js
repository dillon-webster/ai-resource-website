/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1F2B37',
          blue: '#4F76F6',
          light: '#F9F9F9',
          mint: '#77F2A1',
        },
      },
    },
  },
  plugins: [],
}
