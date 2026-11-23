// Visual language for the rebuilt Politics screens: "the Capitol at night".
// Deep navy stone, brass and crimson from Drennia's flag, ivory ink.

export const C = {
  night: '#0B0D12',
  stone: '#13161E',
  stone2: '#1B1F29',
  line: 'rgba(232,184,75,0.18)',
  lineSoft: 'rgba(236,234,228,0.08)',
  brass: '#E8B84B',
  brassSoft: 'rgba(232,184,75,0.14)',
  crimson: '#9E2B2B',
  ivory: '#ECEAE4',
  ink: '#C9C2B2',
  muted: '#868994',
  faint: '#868994',
  yea: '#4FB286',
  nay: '#D9625A',
} as const;

export const STAT_LABELS: Record<string, { name: string; good: 'high' | 'low'; blurb: string }> = {
  prosperity: { name: 'Prosperity', good: 'high', blurb: 'How well the economy is doing' },
  cost_of_living: { name: 'Cost of living', good: 'low', blurb: 'How hard it is to make ends meet' },
  fiscal_health: { name: 'Public finances', good: 'high', blurb: 'The state of the budget' },
  equity: { name: 'Fairness', good: 'high', blurb: 'How evenly wealth is shared' },
  human_development: { name: 'Health & education', good: 'high', blurb: 'Schools, hospitals, life chances' },
  order_safety: { name: 'Law & order', good: 'high', blurb: 'Crime and public safety' },
  freedom_rights: { name: 'Freedoms', good: 'high', blurb: 'Civil liberties and press freedom' },
  bureaucracy: { name: 'State capacity', good: 'high', blurb: 'How well the civil service delivers' },
  global_standing: { name: 'Global standing', good: 'high', blurb: 'Reputation abroad' },
};

export const PHASES: { key: string; label: string; blurb: string }[] = [
  { key: 'governing', label: 'Governing', blurb: 'The government passes laws. Parties prepare.' },
  { key: 'filing', label: 'Filing', blurb: 'Parties file candidates for every district.' },
  { key: 'campaign', label: 'Campaign', blurb: 'Rallies, ads and canvassing win votes.' },
  { key: 'polling', label: 'Election', blurb: 'Drennia votes. Seats are shared by vote.' },
  { key: 'formation', label: 'Formation', blurb: 'The largest party builds a government.' },
];

export const fmtPct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
