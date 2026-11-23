import type { Config } from 'tailwindcss';

/** A colour from public/design/tokens.css (`--<name>-rgb` channels) with Tailwind opacity support. */
const tok = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Every colour reads a channel from public/design/tokens.css, so `bg-surface/60` works
      // and changing a token re-themes the whole game. See docs/DESIGN_SYSTEM.md.
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        bg: tok('bg'),
        surface: tok('surface'),
        raised: tok('raised'),
        overlay: tok('overlay'),
        ink: { DEFAULT: tok('text'), dim: tok('text-dim'), faint: tok('text-faint') },
        accent: { DEFAULT: tok('accent'), hi: '#F4D58A', lo: '#B8892A' },
        good: tok('good'),
        bad: tok('bad'),
        warn: tok('warn'),
        info: tok('info'),
        line: { DEFAULT: 'rgba(255,255,255,0.08)', strong: 'rgba(255,255,255,0.16)', solid: '#262B36' },
        // Legacy names kept so existing screens follow the tokens.
        terminal: {
          bg: tok('bg'),
          card: tok('surface'),
          panel: tok('surface'),
          paper: '#1E1B14',
          border: '#262B36',
          amber: tok('accent'),
          green: tok('good'),
          red: tok('bad'),
          blue: tok('info'),
          muted: tok('text-dim'),
          faint: tok('text-faint'),
        },
        // Cool neutral greys tuned for AA on the token surfaces (stock zinc-600 text was 2.3:1).
        zinc: {
          50: '#FAFAFA', 100: '#F2F2F3', 200: '#E3E4E7', 300: '#CFD0D5', 400: '#B4B6BE',
          500: '#9A9DA8', 600: '#868994', 700: '#3A3F4C', 800: '#262B36', 900: '#161922', 950: '#0B0D12',
        },
        // Tailwind amber classes (auth, modals) follow the brand gold instead of stock orange-amber.
        amber: {
          50: '#FDF8EC', 100: '#FAEDCB', 200: '#F6DFA0', 300: '#F4D58A', 400: '#EEC765',
          500: '#E8B84B', 600: '#C99A33', 700: '#A57A22', 800: '#7D5C1A', 900: '#5A4213', 950: '#33250A',
        },
      },
      borderRadius: { card: '16px', control: '10px' },
      boxShadow: {
        'amber-glow': '0 0 12px rgba(232,184,75,0.25)',
        'green-glow':  '0 0 12px rgba(79,178,134,0.25)',
        'red-glow':    '0 0 12px rgba(217,98,90,0.25)',
        'card':        'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px -28px rgba(0,0,0,0.9)',
        'pop':         '0 24px 60px -20px rgba(0,0,0,0.85)',
        'focus':       '0 0 0 2px rgb(var(--bg-rgb)), 0 0 0 4px rgba(232,184,75,0.85)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'count-up':   'count-up 0.6s ease-out forwards',
        'slide-in':   'slide-in 0.3s ease-out',
        'bar-fill':   'bar-fill 0.8s cubic-bezier(0.4,0,0.2,1) forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'bar-fill': {
          from: { transform: 'scaleX(0)', transformOrigin: 'left' },
          to:   { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }: any) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width':    'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.text-balance': { 'text-wrap': 'balance' },
      });
    },
  ],
};

export default config;
