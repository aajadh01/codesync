/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base: "#0B0F19",      // Premium background
          card: "#161D30",      // Card background
          border: "#25324E",    // Border details
          sidebar: "#0F1422",   // Sidebar background
          nav: "#121826"        // Top navbar
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
