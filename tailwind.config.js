/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#075e54',
          panel: '#111b21',
          surface: '#202c33',
          border: '#2a3942',
          muted: '#8696a0',
          accent: '#00a884',
          'accent-hover': '#06cf9c',
          bubble: '#005c4b',
          chat: '#0b141a',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
