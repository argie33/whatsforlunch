/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2F7D5B',
          dark: '#266A4D',
          muted: '#E8F4EF',
          light: '#F0FAF5',
        },
        surface: '#FBFAF7',
        status: {
          fresh: '#2F7D5B',
          soon: '#E8A838',
          urgent: '#E85C38',
          expired: '#9B9B9B',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
