/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
        serif: ["Cinzel", "Playfair Display", "Georgia", "serif"],
      },
      colors: {
        terminal: {
          bg: "#000000",
          card: "#09090b",
          border: "#27272a",
          amber: "#ff9f0a",
          green: "#30d158",
          red: "#ff453a",
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
};
