/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand — pink/rose
        brand: {
          50:  '#fff0f5',
          100: '#ffe0ec',
          200: '#ffc1d9',
          300: '#ff92b8',
          400: '#ff5a96',
          500: '#f72b75',
          600: '#e00f5b',
          700: '#bc0a4b',
          800: '#9c0d41',
          900: '#83103a',
        },
        // Keep navy as secondary (for text, sidebar)
        navy: {
          50:  '#fdf2f7',
          100: '#fae0ec',
          200: '#f5c2d9',
          300: '#ee94bc',
          400: '#e45a96',
          500: '#d42a72',
          600: '#b81659',
          700: '#971248',
          800: '#7c1040',
          900: '#680e38',
        },
        gold: {
          50:  '#faf6ea',
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
