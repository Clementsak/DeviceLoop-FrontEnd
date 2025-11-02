/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  "#f3f7f4",
          100: "#e6efe9",
          200: "#c7dfcc",
          300: "#a4cdae",
          400: "#6fb784",
          500: "#419c5f",   // primary
          600: "#2f7e4c",
          700: "#276640",
          800: "#1f4f34",
          900: "#173c29",
          950: "#0f291c",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
