/**
 * platformLabels.ts
 *
 * Maps a raw 5-axis party platform (0–100 per axis) to 2–3 plain-English
 * stance chips for display. Pure function — no API calls, no side effects.
 *
 * Axes: taxation, labour, investment, trade, stability
 * Convention: high taxation score = LOW tax (pro-market); low = high tax (statist).
 * High labour = pro-worker; low = pro-employer.
 * High investment = pro-spending/growth; low = austerity.
 * High trade = open borders/free trade; low = protectionist.
 * High stability = law-and-order/conservative; low = reform/progressive.
 */

export interface Platform {
  taxation?: number;
  labour?: number;
  investment?: number;
  trade?: number;
  stability?: number;
}

/** Returns 2–3 short stance labels for a party platform. */
export function platformLabels(platform: Platform | null | undefined): string[] {
  if (!platform) return [];

  const labels: string[] = [];

  // ── Taxation ──────────────────────────────────────────────────────────────
  const tax = platform.taxation ?? 50;
  if (tax >= 70)       labels.push('Low Tax');
  else if (tax <= 30)  labels.push('High Tax');

  // ── Labour ────────────────────────────────────────────────────────────────
  const lab = platform.labour ?? 50;
  if (lab >= 72)       labels.push('Pro-Worker');
  else if (lab <= 28)  labels.push('Pro-Employer');

  // ── Investment ────────────────────────────────────────────────────────────
  const inv = platform.investment ?? 50;
  if (inv >= 68)       labels.push('Pro-Growth');
  else if (inv <= 32)  labels.push('Austerity');

  // ── Trade ─────────────────────────────────────────────────────────────────
  const trd = platform.trade ?? 50;
  if (trd >= 68)       labels.push('Free Trade');
  else if (trd <= 30)  labels.push('Protectionist');

  // ── Stability ─────────────────────────────────────────────────────────────
  const sta = platform.stability ?? 50;
  if (sta >= 68)       labels.push('Law & Order');
  else if (sta <= 32)  labels.push('Reform');

  // If no strong stances detected, emit the dominant axis
  if (labels.length === 0) {
    const axes = [
      { label: 'Moderate Tax',    val: tax,  axis: 'tax'  },
      { label: 'Centrist Labour', val: lab,  axis: 'lab'  },
      { label: 'Balanced Growth', val: inv,  axis: 'inv'  },
      { label: 'Mixed Trade',     val: trd,  axis: 'trd'  },
      { label: 'Moderate',        val: sta,  axis: 'sta'  },
    ];
    const dominant = axes.reduce((a, b) =>
      Math.abs(a.val - 50) >= Math.abs(b.val - 50) ? a : b
    );
    labels.push(dominant.label);
  }

  // Cap at 3 chips
  return labels.slice(0, 3);
}
