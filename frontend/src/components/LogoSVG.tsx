// Shared political party logo SVG renderer.
// Used in create-party page, choose-motherland mini card, and future party dashboards.
// All logos are viewBox="0 0 32 32", rendered inline as pure SVG.

export function LogoSVG({
  logoId,
  color,
  size = 32,
}: {
  logoId: string;
  color: string;
  size?: number;
}) {
  const s = size;

  switch (logoId) {
    // ── Animals ──────────────────────────────────────────────────────────────
    case 'eagle':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="8" r="3.5" fill={color} />
          <path d="M16 6 C12 8 4 12 3 17 L7 17 L9 13 L16 18 L23 13 L25 17 L29 17 C28 12 20 8 16 6Z" fill={color} opacity="0.88" />
          <path d="M13 18 L10 28 L16 23 L22 28 L19 18" fill={color} opacity="0.72" />
        </svg>
      );

    case 'lion':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <circle key={i}
              cx={16 + 9.5 * Math.cos((a * Math.PI) / 180)}
              cy={15 + 9.5 * Math.sin((a * Math.PI) / 180)}
              r="3" fill={color} opacity="0.55" />
          ))}
          <circle cx="16" cy="15" r="6" fill={color} opacity="0.95" />
          <circle cx="13.5" cy="14" r="1.2" fill="rgba(0,0,0,0.4)" />
          <circle cx="18.5" cy="14" r="1.2" fill="rgba(0,0,0,0.4)" />
          <path d="M13.5 18.5 Q16 20.5 18.5 18.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'dragon':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M5 27 C5 27 3 21 7 17 L11 13 C13 11 13 9 15 7 C17 5 21 3 23 5 C25 7 23 11 19 11 L15 13 L17 20 C19 24 23 25 25 23"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M11 13 L3 7 L9 11" fill={color} opacity="0.5" />
          <path d="M15 9 L7 3 L13 7" fill={color} opacity="0.38" />
          <circle cx="23" cy="5" r="3" fill={color} opacity="0.9" />
          <path d="M25 6 L29 9 L26 8 L29 12 L25 10" fill={color} opacity="0.65" />
        </svg>
      );

    case 'wolf':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M9 4 L6 12 L13 10 Z" fill={color} opacity="0.82" />
          <path d="M23 4 L26 12 L19 10 Z" fill={color} opacity="0.82" />
          <ellipse cx="16" cy="17" rx="9" ry="8" fill={color} opacity="0.87" />
          <ellipse cx="16" cy="21" rx="4" ry="2.5" fill={color} opacity="0.68" />
          <ellipse cx="12.5" cy="15.5" rx="1.5" ry="1.2" fill="rgba(0,0,0,0.42)" />
          <ellipse cx="19.5" cy="15.5" rx="1.5" ry="1.2" fill="rgba(0,0,0,0.42)" />
          <ellipse cx="16" cy="19.5" rx="1.2" ry="0.8" fill="rgba(0,0,0,0.38)" />
        </svg>
      );

    case 'bear':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="10" cy="9" r="4.5" fill={color} opacity="0.7" />
          <circle cx="22" cy="9" r="4.5" fill={color} opacity="0.7" />
          <circle cx="16" cy="18" r="10" fill={color} opacity="0.9" />
          <circle cx="12" cy="16" r="1.5" fill="rgba(0,0,0,0.4)" />
          <circle cx="20" cy="16" r="1.5" fill="rgba(0,0,0,0.4)" />
          <ellipse cx="16" cy="21" rx="3.5" ry="2.5" fill={color} opacity="0.52" />
          <circle cx="16" cy="20.5" r="1" fill="rgba(0,0,0,0.35)" />
        </svg>
      );

    case 'horse':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M12 28 C12 28 10 20 12 14 C13 10 16 8 18 6" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
          <ellipse cx="22" cy="8" rx="6" ry="4" fill={color} opacity="0.9" transform="rotate(-20 22 8)" />
          <path d="M14 14 C14 14 12 8 16 6 C18 5 20 6 20 8" fill={color} opacity="0.52" />
          <circle cx="24" cy="6" r="1" fill="rgba(0,0,0,0.5)" />
        </svg>
      );

    case 'falcon':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="8" r="4" fill={color} />
          <path d="M12 12 L2 8 L8 17 Z" fill={color} opacity="0.75" />
          <path d="M20 12 L30 8 L24 17 Z" fill={color} opacity="0.75" />
          <ellipse cx="16" cy="17" rx="5" ry="8" fill={color} opacity="0.82" />
          <path d="M14 25 L12 31 L16 27 L20 31 L18 25" fill={color} opacity="0.58" />
          <path d="M14 10 L12 13 L16 11 Z" fill="rgba(0,0,0,0.32)" />
        </svg>
      );

    case 'tiger':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M8 6 L6 2 L12 6 Z" fill={color} opacity="0.8" />
          <path d="M24 6 L26 2 L20 6 Z" fill={color} opacity="0.8" />
          <ellipse cx="16" cy="17" rx="11" ry="10" fill={color} opacity="0.86" />
          <path d="M10 11 L8 15" stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 11 L24 15" stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 9 L12 13" stroke="rgba(0,0,0,0.13)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19 9 L20 13" stroke="rgba(0,0,0,0.13)" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="12" cy="15" rx="2" ry="1.5" fill="rgba(0,0,0,0.4)" />
          <ellipse cx="20" cy="15" rx="2" ry="1.5" fill="rgba(0,0,0,0.4)" />
          <circle cx="16" cy="19" r="1.2" fill="rgba(0,0,0,0.32)" />
          <path d="M13 21 Q16 23 19 21" stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'phoenix':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 28 C12 22 8 18 10 14 C12 10 16 12 16 8 C16 12 20 10 22 14 C24 18 20 22 16 28 Z" fill={color} opacity="0.58" />
          <path d="M16 16 L4 10 L10 18 L6 20 L14 18 Z" fill={color} opacity="0.8" />
          <path d="M16 16 L28 10 L22 18 L26 20 L18 18 Z" fill={color} opacity="0.8" />
          <ellipse cx="16" cy="14" rx="4" ry="5" fill={color} opacity="0.92" />
          <circle cx="16" cy="9" r="3" fill={color} />
          <path d="M14 7 L16 3 L18 7" fill={color} opacity="0.68" />
        </svg>
      );

    case 'bull':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M8 10 C4 8 2 4 6 4 C8 4 10 6 10 10" fill={color} opacity="0.75" />
          <path d="M24 10 C28 8 30 4 26 4 C24 4 22 6 22 10" fill={color} opacity="0.75" />
          <ellipse cx="16" cy="19" rx="11" ry="9" fill={color} opacity="0.88" />
          <ellipse cx="16" cy="24" rx="5" ry="3.5" fill={color} opacity="0.6" />
          <circle cx="14" cy="24" r="1.2" fill="rgba(0,0,0,0.4)" />
          <circle cx="18" cy="24" r="1.2" fill="rgba(0,0,0,0.4)" />
          <circle cx="11.5" cy="16" r="1.5" fill="rgba(0,0,0,0.4)" />
          <circle cx="20.5" cy="16" r="1.5" fill="rgba(0,0,0,0.4)" />
        </svg>
      );

    case 'dove':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <ellipse cx="16" cy="18" rx="7" ry="5" fill={color} opacity="0.88" />
          <path d="M9 16 C5 10 2 6 6 8 C10 10 14 12 16 16" fill={color} opacity="0.7" />
          <path d="M16 16 C18 12 22 10 26 8 C30 6 27 10 23 16" fill={color} opacity="0.55" />
          <circle cx="22" cy="13" r="4" fill={color} />
          <circle cx="23.5" cy="12" r="1" fill="rgba(0,0,0,0.45)" />
          <path d="M25 14 L28 14" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 22 L14 26 M14 26 L12 28 M14 26 L16 28" stroke={color} strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />
        </svg>
      );

    // ── National / Political ──────────────────────────────────────────────────
    case 'crown':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 25 L4 14 L10 21 L16 7 L22 21 L28 14 L28 25 Z" fill={color} opacity="0.88" />
          <rect x="4" y="25" width="24" height="3.5" rx="1" fill={color} />
          <circle cx="16" cy="7" r="1.5" fill="rgba(255,255,255,0.45)" />
          <circle cx="4" cy="14" r="1.2" fill="rgba(255,255,255,0.3)" />
          <circle cx="28" cy="14" r="1.2" fill="rgba(255,255,255,0.3)" />
        </svg>
      );

    case 'shield':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L4 7 L4 18 C4 25 10 29 16 31 C22 29 28 25 28 18 L28 7 Z" fill={color} opacity="0.85" />
          <path d="M16 7 L9 11 L9 18 C9 22 12 25 16 27 C20 25 23 22 23 18 L23 11 Z" stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />
        </svg>
      );

    case 'star':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32">
          <polygon points="16,2 19.5,12 30,12 21.5,18.5 24.5,29 16,22.5 7.5,29 10.5,18.5 2,12 12.5,12" fill={color} />
        </svg>
      );

    case 'torch':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="14" y="20" width="4" height="10" rx="1.5" fill={color} opacity="0.9" />
          <ellipse cx="16" cy="16" rx="4.5" ry="6" fill={color} opacity="0.6" />
          <ellipse cx="16" cy="11" rx="3" ry="4.5" fill="rgba(255,180,50,0.92)" />
          <ellipse cx="15.8" cy="7.5" rx="2" ry="3" fill="rgba(255,240,180,1)" />
        </svg>
      );

    case 'wreath':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => (
            <ellipse key={i}
              cx={16 + 11.5 * Math.cos((a * Math.PI) / 180)}
              cy={16 + 11.5 * Math.sin((a * Math.PI) / 180)}
              rx="2.2" ry="1"
              transform={`rotate(${a + 90}, ${16 + 11.5 * Math.cos((a * Math.PI) / 180)}, ${16 + 11.5 * Math.sin((a * Math.PI) / 180)})`}
              fill={color} opacity="0.85" />
          ))}
          <circle cx="16" cy="16" r="5.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.45" />
          <circle cx="16" cy="16" r="2.5" fill={color} opacity="0.6" />
        </svg>
      );

    case 'flag':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <line x1="6" y1="3" x2="6" y2="29" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M6 5 C12 3 20 7 26 5 L26 17 C20 19 12 15 6 17 Z" fill={color} opacity="0.85" />
          <circle cx="6" cy="3" r="1.5" fill={color} />
        </svg>
      );

    case 'globe':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="2" />
          <ellipse cx="16" cy="16" rx="6" ry="13" stroke={color} strokeWidth="1.5" />
          <line x1="3" y1="16" x2="29" y2="16" stroke={color} strokeWidth="1.5" />
          <line x1="5" y1="10" x2="27" y2="10" stroke={color} strokeWidth="1" />
          <line x1="5" y1="22" x2="27" y2="22" stroke={color} strokeWidth="1" />
        </svg>
      );

    case 'scales':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <line x1="16" y1="3" x2="16" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="6" y1="9" x2="26" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="9" x2="3" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="9" x2="29" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M1 18 C1 18 3 15 6 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M26 18 C26 18 29 15 31 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <rect x="12" y="26" width="8" height="2.5" rx="1" fill={color} />
        </svg>
      );

    case 'castle':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="4" y="14" width="24" height="14" rx="1" fill={color} opacity="0.82" />
          <rect x="4" y="8" width="7" height="10" fill={color} opacity="0.9" />
          <rect x="4" y="6" width="2" height="4" fill={color} />
          <rect x="7" y="6" width="2" height="4" fill={color} />
          <rect x="21" y="8" width="7" height="10" fill={color} opacity="0.9" />
          <rect x="21" y="6" width="2" height="4" fill={color} />
          <rect x="24" y="6" width="2" height="4" fill={color} />
          <rect x="11" y="6" width="10" height="12" fill={color} opacity="0.88" />
          <rect x="11" y="4" width="2" height="4" fill={color} />
          <rect x="14.5" y="4" width="2" height="4" fill={color} />
          <rect x="18" y="4" width="2" height="4" fill={color} />
          <path d="M14 22 L14 28 L18 28 L18 22 Q16 20 14 22 Z" fill="rgba(0,0,0,0.42)" />
          <rect x="13" y="10" width="2" height="3" rx="1" fill="rgba(0,0,0,0.32)" />
          <rect x="17" y="10" width="2" height="3" rx="1" fill="rgba(0,0,0,0.32)" />
        </svg>
      );

    // ── Nature / Sky ──────────────────────────────────────────────────────────
    case 'sun':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="7" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <line key={i}
              x1={16 + 9.5 * Math.cos((a * Math.PI) / 180)}
              y1={16 + 9.5 * Math.sin((a * Math.PI) / 180)}
              x2={16 + 14 * Math.cos((a * Math.PI) / 180)}
              y2={16 + 14 * Math.sin((a * Math.PI) / 180)}
              stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </svg>
      );

    case 'moon':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M22 5 C16 5 10 10 10 17 C10 24 16 29 22 29 C14 29 6 23 6 16 C6 9 13 4 22 5 Z" fill={color} opacity="0.9" />
          <circle cx="25" cy="8" r="1" fill={color} opacity="0.5" />
          <circle cx="27" cy="14" r="0.7" fill={color} opacity="0.38" />
        </svg>
      );

    case 'mountain':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 3 L28 25 L4 25 Z" fill={color} opacity="0.9" />
          <path d="M7 19 L13 9 L20 19" fill={color} opacity="0.52" />
          <path d="M14 3 L20 10" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          <rect x="2" y="25" width="28" height="4" rx="1" fill={color} opacity="0.32" />
        </svg>
      );

    case 'tree':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L22 12 L8 12 Z" fill={color} opacity="0.9" />
          <path d="M16 8 L25 21 L7 21 Z" fill={color} opacity="0.85" />
          <path d="M16 14 L27 28 L5 28 Z" fill={color} opacity="0.8" />
          <rect x="14" y="26" width="4" height="4" rx="1" fill={color} opacity="0.68" />
        </svg>
      );

    case 'flame':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 C16 2 8 10 8 18 C8 24 12 30 16 30 C20 30 24 24 24 18 C24 10 16 2 16 2 Z" fill={color} opacity="0.9" />
          <path d="M16 10 C16 10 12 16 12 20 C12 24 14 28 16 28 C18 28 20 24 20 20 C20 16 16 10 16 10 Z" fill="rgba(255,200,80,0.48)" />
          <ellipse cx="16" cy="23" rx="2.5" ry="4" fill="rgba(255,255,255,0.28)" />
        </svg>
      );

    case 'leaf':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 C8 8 4 16 8 24 C12 30 20 30 24 24 C28 18 26 8 16 2 Z" fill={color} opacity="0.88" />
          <path d="M16 2 C14 12 12 20 8 24" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <line x1="6" y1="24" x2="4" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        </svg>
      );

    case 'lightning':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M20 2 L10 16 L17 16 L12 30 L22 14 L15 14 Z" fill={color} opacity="0.9" />
          <path d="M20 2 L10 16 L17 16 L12 30 L22 14 L15 14 Z" fill="rgba(255,255,255,0.13)" />
        </svg>
      );

    // ── Military / Maritime ───────────────────────────────────────────────────
    case 'sword':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 3 L18 22 L16 30 L14 22 Z" fill={color} opacity="0.88" />
          <rect x="8" y="20" width="16" height="3" rx="1" fill={color} opacity="0.85" />
          <rect x="14" y="23" width="4" height="6" rx="1" fill={color} opacity="0.68" />
          <circle cx="16" cy="29" r="1.8" fill={color} opacity="0.78" />
          <line x1="16" y1="3" x2="16" y2="20" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        </svg>
      );

    case 'anchor':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="6" r="3" stroke={color} strokeWidth="2" fill="none" />
          <line x1="16" y1="9" x2="16" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="13" x2="24" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M5 22 Q6 28 16 26 Q26 28 27 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="16" y1="26" x2="5" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="26" x2="27" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'tower':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="10" y="8" width="12" height="20" fill={color} opacity="0.88" />
          <rect x="10" y="4" width="3" height="6" fill={color} />
          <rect x="14.5" y="4" width="3" height="6" fill={color} />
          <rect x="19" y="4" width="3" height="6" fill={color} />
          <rect x="6" y="26" width="20" height="4" rx="1" fill={color} opacity="0.72" />
          <rect x="14" y="12" width="4" height="6" rx="1" fill="rgba(0,0,0,0.35)" />
          <rect x="14" y="20" width="4" height="4" rx="1" fill="rgba(0,0,0,0.3)" />
          <line x1="16" y1="2" x2="16" y2="5" stroke={color} strokeWidth="1.5" />
          <path d="M16 2 L21 4 L16 6 Z" fill={color} opacity="0.68" />
        </svg>
      );

    case 'ship':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 20 L6 26 L26 26 L28 20 Z" fill={color} opacity="0.88" />
          <line x1="16" y1="6" x2="16" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 6 L24 18 L16 20 Z" fill={color} opacity="0.7" />
          <path d="M16 6 L8 16 L16 18 Z" fill={color} opacity="0.55" />
          <line x1="10" y1="10" x2="22" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.58" />
          <path d="M16 6 L20 4 L16 3 Z" fill={color} opacity="0.78" />
          <path d="M4 26 Q16 30 28 26" stroke={color} strokeWidth="1" fill="none" opacity="0.38" />
        </svg>
      );

    case 'compass':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M16 3 L13 16 L16 14 L19 16 Z" fill={color} opacity="0.9" />
          <path d="M16 29 L19 16 L16 18 L13 16 Z" fill={color} opacity="0.5" />
          <path d="M29 16 L16 13 L18 16 L16 19 Z" fill={color} opacity="0.7" />
          <path d="M3 16 L16 19 L14 16 L16 13 Z" fill={color} opacity="0.52" />
          <circle cx="16" cy="16" r="2" fill={color} />
        </svg>
      );

    // ── Social / Economic ─────────────────────────────────────────────────────
    case 'book':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 6 L16 6 L16 26 C16 26 12 24 4 26 Z" fill={color} opacity="0.85" />
          <path d="M16 6 L28 6 L28 26 C20 24 16 26 16 26 Z" fill={color} opacity="0.72" />
          <rect x="15" y="5" width="2" height="22" fill="rgba(0,0,0,0.25)" />
          <line x1="7" y1="12" x2="14" y2="12" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <line x1="7" y1="16" x2="14" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <line x1="7" y1="20" x2="14" y2="20" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <line x1="18" y1="12" x2="25" y2="12" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
          <line x1="18" y1="16" x2="25" y2="16" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
          <rect x="4" y="4" width="24" height="3" rx="1" fill={color} opacity="0.58" />
        </svg>
      );

    case 'handshake':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="2" y="16" width="8" height="6" rx="2.5" fill={color} opacity="0.72" />
          <rect x="22" y="16" width="8" height="6" rx="2.5" fill={color} opacity="0.62" />
          <path d="M2 18 L8 12 L12 14 L14 12 L16 14 L18 12 L20 14 L24 12 L30 18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="16" cy="14" rx="4" ry="2.5" fill={color} opacity="0.62" />
        </svg>
      );

    case 'gear':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <rect key={i} x="14" y="1" width="4" height="5" rx="1"
              fill={color} opacity="0.85"
              transform={`rotate(${a} 16 16)`} />
          ))}
          <circle cx="16" cy="16" r="10" fill={color} opacity="0.75" />
          <circle cx="16" cy="16" r="5" fill="rgba(0,0,0,0.48)" />
          <circle cx="16" cy="16" r="2.5" fill={color} opacity="0.48" />
        </svg>
      );

    case 'hammer':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="8" y="6" width="16" height="10" rx="2" fill={color} opacity="0.9" />
          <rect x="8" y="6" width="5" height="10" rx="1" fill={color} opacity="0.58" />
          <rect x="14.5" y="14" width="3.5" height="16" rx="1.5" fill={color} opacity="0.72" />
        </svg>
      );

    case 'eye':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 16 Q16 4 28 16 Q16 28 4 16 Z" fill={color} opacity="0.85" />
          <circle cx="16" cy="16" r="6" fill={color} />
          <circle cx="16" cy="16" r="3" fill="rgba(0,0,0,0.5)" />
          <circle cx="14" cy="14" r="1.2" fill="rgba(255,255,255,0.4)" />
        </svg>
      );

    case 'fist':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="8" y="8" width="4" height="8" rx="2" fill={color} opacity="0.85" />
          <rect x="13" y="6" width="4" height="10" rx="2" fill={color} opacity="0.9" />
          <rect x="18" y="6" width="4" height="10" rx="2" fill={color} opacity="0.9" />
          <rect x="23" y="8" width="3.5" height="8" rx="1.5" fill={color} opacity="0.8" />
          <rect x="8" y="14" width="18.5" height="10" rx="3" fill={color} opacity="0.88" />
          <rect x="4" y="12" width="6" height="5" rx="2.5" fill={color} opacity="0.78" />
          <line x1="12" y1="14" x2="12" y2="18" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          <line x1="17" y1="14" x2="17" y2="18" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          <line x1="22" y1="14" x2="22" y2="18" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        </svg>
      );

    case 'bridge':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect x="2" y="16" width="28" height="3" rx="1" fill={color} opacity="0.88" />
          <path d="M2 16 Q10 8 16 16" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M16 16 Q22 8 30 16" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="2" y="10" width="4" height="9" fill={color} opacity="0.8" />
          <rect x="14" y="8" width="4" height="11" fill={color} opacity="0.85" />
          <rect x="26" y="10" width="4" height="9" fill={color} opacity="0.8" />
          <line x1="4" y1="10" x2="16" y2="16" stroke={color} strokeWidth="1" opacity="0.45" />
          <line x1="28" y1="10" x2="16" y2="16" stroke={color} strokeWidth="1" opacity="0.45" />
          <line x1="2" y1="19" x2="2" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          <line x1="30" y1="19" x2="30" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </svg>
      );

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill={color} opacity="0.4" />
        </svg>
      );
  }
}
