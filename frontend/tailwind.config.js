/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary sky/teal palette
        primary: {
          50: '#e0f7ff',
          100: '#bae6fd',
          200: '#90cdfa',
          300: '#61bff6',
          400: '#2bb0f1',
          500: '#0ea5e9', // primary
          600: '#0891cf',
          700: '#0369a1', // dark
          800: '#014f73',
          900: '#013047',
        },
        // Keep existing NiSHKA brand colors for compatibility
        brand: {
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
          950: '#3e0d24',
        },
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
