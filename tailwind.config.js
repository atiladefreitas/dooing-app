/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dooing palette (dark-first). Priority colors mirror the Neovim
        // plugin's DiagnosticError / DiagnosticWarn / DiagnosticInfo groups.
        priority: {
          important: '#e06c75', // DiagnosticError (red)
          urgent: '#e5c07b', // DiagnosticWarn (yellow)
          info: '#61afef', // DiagnosticInfo (blue)
        },
      },
    },
  },
  plugins: [],
};
