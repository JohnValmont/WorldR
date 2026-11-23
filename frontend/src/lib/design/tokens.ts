// Hex mirror of public/design/tokens.css for inline-style code that needs real hex
// (e.g. `${color}88` alpha suffixes, chart libraries, canvas). The CSS file is the
// source of truth; `npm run check:tokens` (run in CI) fails if these drift from it.
// Prefer Tailwind token classes (bg-surface, text-dim, text-accent …) in new code.
import build from '../../../public/design/build.json';

export const color = {
  bg: '#0B0D12',
  surface: '#13161E',
  raised: '#1B1F29',
  overlay: '#232835',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  lineSolid: '#262B36',
  text: '#ECEAE4',
  textDim: '#A3A4AC',
  textFaint: '#868994',
  accent: '#E8B84B',
  accentHi: '#F4D58A',
  accentLo: '#B8892A',
  accentSoft: 'rgba(232,184,75,0.12)',
  accentLine: 'rgba(232,184,75,0.38)',
  onAccent: '#17130A',
  good: '#4FB286',
  bad: '#D9625A',
  warn: '#E8913A',
  info: '#6AA6E8',
} as const;

export const font = {
  display: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
  sans: "'Outfit', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 20 } as const;

/** Build label shown in the game chrome and on the public pages. Edit public/design/build.json. */
export const BUILD: { stage: string; version: string; discord: string; realHoursPerGameMonth: number } = build;
export const buildLabel = `${BUILD.stage} · v${BUILD.version}`;
