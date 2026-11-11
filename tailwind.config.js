/** @type {import('tailwindcss').Config} */
// Indian job-portal style: white header, search first, dense job cards. PeakRole's own palette.
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1b1f2a',
        shell: { DEFAULT: '#ffffff', 700: '#f4f5f8', 600: '#eceef3' },
        brand: { 50: '#eef2ff', 100: '#dfe6fe', 200: '#bccafc', 500: '#1f4fd1', 600: '#1a43b3', 700: '#163897', 900: '#0f2566' },
        canvas: { 50: '#f4f5f8', 100: '#eceef3', 200: '#dde1e8' },
        accent: { 500: '#f29900', 600: '#c77d00' },
        positive: '#1a7f37',
        critical: '#c77d00',
        negative: '#c62828',
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Poppins', '"Noto Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,31,42,0.05)',
        raised: '0 6px 20px rgba(27,31,42,0.10)',
      },
    },
  },
  plugins: [],
};
