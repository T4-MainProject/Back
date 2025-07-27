/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#03C75A',
        'primary-600': '#02994F',
        'primary-700': '#017E42',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
