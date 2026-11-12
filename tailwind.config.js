/** @type {import('tailwindcss').Config} */
// EWM-TM Jobs design (from the Stitch mock-ups): white header, blue primary, saffron CTA, green salary, borderless cards.
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171b26',
        shell: { DEFAULT: '#ffffff', 700: '#f2f3ff', 600: '#eaedfd' },
        brand: { 50: '#f2f3ff', 100: '#dce1ff', 200: '#b6c4ff', 500: '#1f4fd1', 600: '#0037ab', 700: '#002f93', 900: '#001550' },
        canvas: { 50: '#faf8ff', 100: '#eaedfd', 200: '#dfe2f1' },
        accent: { 500: '#fda214', 600: '#865300', ink: '#2b1700', 50: '#ffddb9' },
        positive: '#006a28',
        mint: '#97f8a1',
        critical: '#865300',
        negative: '#ba1a1a',
        muted: '#434654',
        line: '#c4c5d7',
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Hanken Grotesk"', '"Noto Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(27,31,42,0.05), 0 1px 2px rgba(27,31,42,0.03)',
        raised: '0 4px 14px rgba(27,31,42,0.10)',
      },
    },
  },
  plugins: [],
};
