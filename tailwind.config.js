/** @type {import('tailwindcss').Config} */
// Enterprise look in the spirit of SAP Fiori (Horizon): dark shell bar, blue primary,
// neutral canvas, white cards, Inter. PeakRole's own palette and brand.
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d2d3e',
        shell: { DEFAULT: '#12263f', 700: '#0b1b2e', 600: '#1b3554' },
        brand: { 50: '#eef5ff', 100: '#dbeafe', 200: '#b6d4fd', 500: '#0070f2', 600: '#0064d9', 700: '#0057be', 900: '#0b2f5c' },
        canvas: { 50: '#f5f6f7', 100: '#eceef1', 200: '#d9dee3' },
        accent: { 500: '#e76500', 600: '#c35500' },
        positive: '#188918',
        critical: '#e76500',
        negative: '#d20a0a',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(29,45,62,0.06), 0 2px 4px rgba(29,45,62,0.06)',
        raised: '0 0 0 1px rgba(29,45,62,0.06), 0 8px 24px rgba(29,45,62,0.12)',
      },
    },
  },
  plugins: [],
};
