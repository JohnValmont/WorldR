import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // ── Game terminal palette ──────────────────────────────────────────
        terminal: {
          bg:     '#090A0F',
          card:   '#0c0d13',
          panel:  '#11131A',
          paper:  '#1E1A15',
          border: '#23232b',
          amber:  '#ff9f0a',
          green:  '#30d158',
          red:    '#ff453a',
          blue:   '#0a84ff',
          muted:  '#a1a1aa',
          faint:  '#71717a',
        },
      },
      boxShadow: {
        'amber-glow': '0 0 12px rgba(255,159,10,0.25)',
        'green-glow':  '0 0 12px rgba(48,209,88,0.25)',
        'red-glow':    '0 0 12px rgba(255,69,58,0.25)',
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
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
