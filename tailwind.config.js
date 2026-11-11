/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14201b',
        moss: { 50: '#f1f6f3', 100: '#dcebe2', 200: '#b9d6c5', 500: '#2f7a55', 600: '#24643f', 700: '#1c4f33', 900: '#0f2a1c' },
        sand: { 50: '#fbf8f2', 100: '#f4eee2', 200: '#e8dcc4' },
        clay: { 500: '#c8643b', 600: '#a94f2b' },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
