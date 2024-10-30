/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F92BB',
          dark: '#014969',
          light: '#00E8C6',
        },
        accent: {
          DEFAULT: '#00E8C6',
          dark: '#00B4A2',
          light: '#7FFFD4',
        },
        background: {
          light: '#ffffff',
          dark: '#0f172a',
        },
        surface: {
          light: '#f3f4f6',
          dark: '#1e293b',
        }
      },
      fontFamily: {
        figtree: ['Figtree', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 232, 198, 0.15)',
        'glow-lg': '0 0 30px rgba(0, 232, 198, 0.2)',
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [],
}