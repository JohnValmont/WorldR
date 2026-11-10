/**
 * Car identity / styling options for the Car Designer.
 *
 * VISUAL ONLY — none of these affect engineering scores, cost or demand, so
 * they can never become pay-to-win. They give players a car that looks like
 * *theirs*, and are the natural home for future cosmetic unlocks
 * (premium paints, liveries, wheel sets) — mark such options `premium: true`.
 */

export interface PaintOption { id: string; label: string; hex: string; finish: 'solid' | 'metallic' | 'pearl'; premium?: boolean }
export interface StyleOption { id: string; label: string; premium?: boolean }

export const PAINT_COLORS: PaintOption[] = [
  { id: 'arctic-white',   label: 'Arctic White',   hex: '#F2F2F0', finish: 'solid' },
  { id: 'graphite',       label: 'Graphite',       hex: '#3A3D42', finish: 'metallic' },
  { id: 'midnight-black', label: 'Midnight Black', hex: '#141518', finish: 'solid' },
  { id: 'silver-mist',    label: 'Silver Mist',    hex: '#B9BEC4', finish: 'metallic' },
  { id: 'drennia-red',    label: 'Drennia Red',    hex: '#B3262E', finish: 'solid' },
  { id: 'ember-orange',   label: 'Ember Orange',   hex: '#D9622B', finish: 'metallic' },
  { id: 'harvest-gold',   label: 'Harvest Gold',   hex: '#C9A24A', finish: 'metallic' },
  { id: 'racing-green',   label: 'Racing Green',   hex: '#1F4D3A', finish: 'solid' },
  { id: 'ocean-blue',     label: 'Ocean Blue',     hex: '#1F4E8C', finish: 'metallic' },
  { id: 'glacier-blue',   label: 'Glacier Blue',   hex: '#8FB8D8', finish: 'solid' },
  { id: 'plum',           label: 'Royal Plum',     hex: '#5B2A5E', finish: 'pearl' },
  { id: 'sand',           label: 'Desert Sand',    hex: '#CDB892', finish: 'solid' },
];

/** Body styles available per vehicle class (silhouette in the designer and showroom). */
export const BODY_STYLES: Record<string, StyleOption[]> = {
  'Compact Car': [
    { id: 'hatchback', label: 'Hatchback' },
    { id: 'city',      label: 'City Car' },
    { id: 'crossover', label: 'Mini Crossover' },
  ],
  'Sedan': [
    { id: 'saloon',    label: 'Saloon' },
    { id: 'coupe',     label: 'Coupé' },
    { id: 'estate',    label: 'Estate' },
  ],
  'Utility Van': [
    { id: 'panel-van', label: 'Panel Van' },
    { id: 'minibus',   label: 'Minibus' },
    { id: 'pickup',    label: 'Pickup' },
  ],
};

export const WHEEL_STYLES: StyleOption[] = [
  { id: 'steel',   label: 'Steel' },
  { id: 'spoke',   label: 'Five-Spoke' },
  { id: 'turbine', label: 'Turbine' },
  { id: 'mesh',    label: 'Mesh' },
];

export const TAGLINE_MAX_LENGTH = 60;

export interface CarStyle {
  paint: string;      // PAINT_COLORS id
  accent: string;     // PAINT_COLORS id (roof / trim)
  bodyStyle: string;  // BODY_STYLES[vehicleClass] id
  wheels: string;     // WHEEL_STYLES id
  tagline?: string;
}

/** Fill gaps and reject unknown ids so stored styles are always renderable. */
export function normaliseCarStyle(input: Partial<CarStyle> | null | undefined, vehicleClass: string): CarStyle {
  const bodies = BODY_STYLES[vehicleClass] ?? BODY_STYLES['Sedan'];
  const isPaint = (id?: string) => !!id && PAINT_COLORS.some(p => p.id === id);
  const tagline = typeof input?.tagline === 'string'
    ? input.tagline.replace(/[\u0000-\u001f]/g, '').trim().slice(0, TAGLINE_MAX_LENGTH)
    : '';
  return {
    paint: isPaint(input?.paint) ? input!.paint! : PAINT_COLORS[0].id,
    accent: isPaint(input?.accent) ? input!.accent! : PAINT_COLORS[2].id,
    bodyStyle: bodies.some(b => b.id === input?.bodyStyle) ? input!.bodyStyle! : bodies[0].id,
    wheels: WHEEL_STYLES.some(w => w.id === input?.wheels) ? input!.wheels! : WHEEL_STYLES[0].id,
    ...(tagline ? { tagline } : {}),
  };
}
