/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      colors: {
        primary: {
          DEFAULT: '#0F92BB',
          dark: '#014969',
          light: '#00E8C6',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#2d2d2d',
        },
        background: {
          DEFAULT: '#ffffff',
          dark: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}