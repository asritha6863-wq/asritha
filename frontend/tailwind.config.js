/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f6',
          100: '#d4dee8',
          200: '#a9bdd1',
          300: '#7e9cba',
          400: '#537ba3',
          500: '#365f85',
          600: '#284a68',
          700: '#1E3A5F',
          800: '#162a44',
          900: '#0e1a2b',
        },
        gold: {
          50: '#faf6ea',
          100: '#f0e6c2',
          200: '#e5d599',
          300: '#dac370',
          400: '#d0b247',
          500: '#C9A227',
          600: '#a3831f',
          700: '#7c6418',
          800: '#554510',
          900: '#2e2508',
        },
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
