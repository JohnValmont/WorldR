// Shared political party logo SVG renderer.
// Used in create-party page, choose-motherland mini card, and future party dashboards.

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
    case 'eagle':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="8" r="3.5" fill={color} />
          <path d="M16 6 C12 8 4 12 3 17 L7 17 L9 13 L16 18 L23 13 L25 17 L29 17 C28 12 20 8 16 6Z" fill={color} opacity="0.88" />
          <path d="M13 18 L10 28 L16 23 L22 28 L19 18" fill={color} opacity="0.72" />
        </svg>
      );
    case 'star':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32">
          <polygon
            points="16,2 19.5,12 30,12 21.5,18.5 24.5,29 16,22.5 7.5,29 10.5,18.5 2,12 12.5,12"
            fill={color}
          />
        </svg>
      );
    case 'shield':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L4 7 L4 18 C4 25 10 29 16 31 C22 29 28 25 28 18 L28 7 Z" fill={color} opacity="0.85" />
          <path d="M16 7 L9 11 L9 18 C9 22 12 25 16 27 C20 25 23 22 23 18 L23 11 Z" stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />
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
    case 'lion':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <circle
              key={i}
              cx={16 + 9.5 * Math.cos((a * Math.PI) / 180)}
              cy={15 + 9.5 * Math.sin((a * Math.PI) / 180)}
              r="3"
              fill={color}
              opacity="0.58"
            />
          ))}
          <circle cx="16" cy="15" r="6" fill={color} opacity="0.95" />
          <circle cx="13.5" cy="14" r="1.2" fill="rgba(0,0,0,0.4)" />
          <circle cx="18.5" cy="14" r="1.2" fill="rgba(0,0,0,0.4)" />
          <path d="M13.5 18.5 Q16 20.5 18.5 18.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'wreath':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => (
            <ellipse
              key={i}
              cx={16 + 11.5 * Math.cos((a * Math.PI) / 180)}
              cy={16 + 11.5 * Math.sin((a * Math.PI) / 180)}
              rx="2.2"
              ry="1"
              transform={`rotate(${a + 90}, ${16 + 11.5 * Math.cos((a * Math.PI) / 180)}, ${
                16 + 11.5 * Math.sin((a * Math.PI) / 180)
              })`}
              fill={color}
              opacity="0.85"
            />
          ))}
          <circle cx="16" cy="16" r="5.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.45" />
          <circle cx="16" cy="16" r="2.5" fill={color} opacity="0.6" />
        </svg>
      );
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
    case 'mountain':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 3 L28 25 L4 25 Z" fill={color} opacity="0.9" />
          <path d="M7 19 L13 9 L20 19" fill={color} opacity="0.52" />
          <path d="M14 3 L20 10" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          <rect x="2" y="25" width="28" height="4" rx="1" fill={color} opacity="0.32" />
        </svg>
      );
    case 'sun':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="7" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <line
              key={i}
              x1={16 + 9.5 * Math.cos((a * Math.PI) / 180)}
              y1={16 + 9.5 * Math.sin((a * Math.PI) / 180)}
              x2={16 + 14 * Math.cos((a * Math.PI) / 180)}
              y2={16 + 14 * Math.sin((a * Math.PI) / 180)}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
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
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill={color} opacity="0.4" />
        </svg>
      );
  }
}
