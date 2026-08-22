/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/views/**/*.ejs', './src/public/js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Placeholder neutral font stack — swap for WOSG's brand font once supplied (see README "Assets Needed From Dale").
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Neutral placeholder brand palette — swap for real WOSG hex codes once supplied.
        brand: {
          DEFAULT: '#1f2937',
          light: '#374151',
          accent: '#4f46e5',
        },
      },
      boxShadow: {
        tile: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'tile-hover': '0 10px 20px -5px rgb(0 0 0 / 0.15), 0 4px 8px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
