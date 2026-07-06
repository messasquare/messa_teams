/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        messa: { red: '#D72A2A', dark: '#0a0a0a', card: '#141414', muted: '#1e1e1e' }
      }
    }
  },
  plugins: []
}
