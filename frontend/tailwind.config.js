/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // NiSHKA brand — rose pink
        brand: {
          50:  '#fdf2f6',
          100: '#fbe8f0',
          200: '#f7d1e2',
          300: '#f0aac8',
          400: '#e87aab',
          500: '#d94f8c',   // primary brand
          600: '#c73578',
          700: '#a62860',
          800: '#8a234f',
          900: '#6e1f41',
          950: '#3e0d24',
        },
        // Sidebar / accent
        navy: {
          50:  '#fdf2f6',
          100: '#fbe8f0',
          200: '#f7d1e2',
          300: '#f0aac8',
          400: '#e87aab',
          500: '#d94f8c',
          600: '#c73578',
          700: '#a62860',
          800: '#8a234f',
          900: '#6e1f41',
        },
        gold: {
          500: '#d94f8c',
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
