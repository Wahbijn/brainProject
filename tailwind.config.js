/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          1: '#ff6a8d',
          2: '#ff3d6e',
          3: '#7a4dff',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        livePulse: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.5', transform: 'scale(.85)' } },
        sweep: { '0%': { left: '-50%' }, '55%,100%': { left: '120%' } },
        spin360: { to: { transform: 'rotate(360deg)' } },
        hue: { '0%': { backgroundPosition: '0% 0%' }, '100%': { backgroundPosition: '200% 0%' } },
        glowPulse: { '0%,100%': { opacity: '.45', transform: 'scale(.96)' }, '50%': { opacity: '.7', transform: 'scale(1.06)' } },
        veinPulse: { '0%,100%': { opacity: '.78' }, '50%': { opacity: '1' } },
        shimmer: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '.85' } },
      },
      animation: {
        livePulse: 'livePulse 1.4s infinite',
        sweep: 'sweep 3.5s ease-in-out infinite',
        spin360: 'spin360 5s linear infinite',
        hue: 'hue 5s linear infinite',
        glowPulse: 'glowPulse 4s ease-in-out infinite',
        veinPulse: 'veinPulse 3.5s ease-in-out infinite',
        shimmer: 'shimmer 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
