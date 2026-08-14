/** @type {import('tailwindcss').Config} */

/** `rgb(var(--x) / <alpha-value>)` keeps opacity modifiers (`bg-surface/50`) working. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],

  // REQUIRED. NativeWind throws from setColorScheme() unless darkMode is 'class'
  // (see nativewind/dist/stylesheet.js) — with the default 'media' the app can
  // only follow the OS and a manual Night/Light override crashes at runtime.
  darkMode: 'class',

  theme: {
    extend: {
      // Semantic tokens only — see DESIGN.md §2 and src/global.css.
      // Deliberately NOT extending Tailwind's stock scales: `bg-neutral-800` and
      // friends are not theme-aware and must not appear in new code.
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        elevated: token('elevated'),
        overlay: token('overlay'),

        fg: {
          DEFAULT: token('fg'),
          dim: token('fg-dim'),
          muted: token('fg-muted'),
          faint: token('fg-faint'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },

        accent: token('accent'),
        danger: token('danger'),
        warn: token('warn'),
        ok: token('ok'),

        hue: {
          cyan: token('hue-cyan'),
          teal: token('hue-teal'),
          green: token('hue-green'),
          yellow: token('hue-yellow'),
          orange: token('hue-orange'),
          magenta: token('hue-magenta'),
        },

        // DEPRECATED — not theme-aware. Still referenced by the pre-redesign
        // status-checkbox and the priority pills in todo-item. Both are deleted
        // in step 4 (the marker carries priority), and this block goes with them.
        priority: {
          important: '#e06c75',
          urgent: '#e5c07b',
          info: '#61afef',
        },
      },

      // React Native resolves weight via the family name, not fontWeight — so
      // `font-mono font-bold` does NOT produce bold. Each weight is its own family.
      fontFamily: {
        mono: ['JetBrainsMono_400Regular'],
        'mono-md': ['JetBrainsMono_500Medium'],
        'mono-bd': ['JetBrainsMono_700Bold'],
        sans: ['Inter_400Regular'],
        'sans-md': ['Inter_500Medium'],
        'sans-sb': ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
