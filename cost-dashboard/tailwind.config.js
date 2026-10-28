/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0050cb', container: '#0066ff' },
        secondary: { DEFAULT: '#006c49', container: '#6cf8bb' },
        background: '#f7f8fb',
        surface: '#ffffff',
        ink: '#131b2e',
        muted: '#5c6578',
        line: '#d9deea',
        danger: '#ba1a1a',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
