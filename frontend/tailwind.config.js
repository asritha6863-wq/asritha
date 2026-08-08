/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // NiSHKA Brand — Deep Rose on Blush Pink
        brand: {
          50:  '#fdf0f5',
          100: '#fde0ec',
          200: '#fbbdd6',
          300: '#f78ab6',
          400: '#ef5090',
          500: '#e02070',   // mid rose
          600: '#c13575',   // PRIMARY — logo color
          700: '#a12860',
          800: '#8a234f',
          900: '#6e1f41',
          950: '#3e0d24',
        },
        // Keep 'pink' as alias to brand for backward compat
        pink: {
          50:  '#fdf0f5',
          100: '#fde0ec',
          200: '#fbbdd6',
          300: '#f78ab6',
          400: '#ef5090',
          500: '#e02070',
          600: '#c13575',
          700: '#a12860',
          800: '#8a234f',
          900: '#6e1f41',
        },
        // Neutral navy kept for text/bg accents
        navy: {
          50:  '#f7f8fc',
          100: '#eef0f8',
          200: '#d5daf0',
          300: '#b2bce4',
          400: '#8997d4',
          500: '#6374c4',
          600: '#4a5bb5',
          700: '#3d4d9e',
          800: '#2d3a7a',
          900: '#1e2756',
        },
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['Inter',   'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        'brand-sm': '0 2px 8px rgba(193,53,117,0.10)',
        'brand':    '0 4px 16px rgba(193,53,117,0.15)',
        'brand-lg': '0 8px 32px rgba(193,53,117,0.20)',
      },
    },
  },
  plugins: [],
};
