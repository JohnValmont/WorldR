'use client';
import React, { useState, useEffect } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:         '#090A0F',
  overlay:    'rgba(9,10,15,0.92)',
  panel:      '#11131A',
  border:     '#2A2630',
  amber:      '#C9A24A',
  amberGlow:  'rgba(201,162,74,0.25)',
  ivory:      '#F4EBD6',
  muted:      '#A79D8C',
  faint:      '#6B6358',
};

const STORAGE_KEY = 'worldr_seen_3m_bonus_modal';

interface ThreeMillionBonusModalProps {
  onDismiss: () => void;
}

export default function ThreeMillionBonusModal({ onDismiss }: ThreeMillionBonusModalProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setFadeIn(true), 40);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onDismiss();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: T.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          width: '100%',
          maxWidth: 480,
          boxShadow: `0 0 60px rgba(201,162,74,0.08), 0 24px 80px rgba(0,0,0,0.7)`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.25em', color: T.faint }}>
            System Notice
          </div>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: 11, fontFamily: 'monospace' }}
          >
            Close
          </button>
        </div>

        {/* Card body */}
        <div style={{ padding: '30px 22px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif', color: T.ivory, margin: '0 0 16px', lineHeight: 1.3 }}>
              You have got 3 mILLION
            </h2>
            <p style={{ fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.6 }}>
              in personal cash you can transfer it to company cash to run your country
            </p>
            <p style={{ fontSize: 14, color: T.amber, marginTop: 16, fontStyle: 'italic' }}>
              - Team WORLDr
            </p>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '14px 22px',
          borderTop: `1px solid ${T.border}`,
        }}>
          <button
            onClick={dismiss}
            style={{
              background: `linear-gradient(135deg, ${T.amber}, #E0B85A)`,
              border: 'none', color: '#fff',
              fontSize: 12, fontFamily: 'monospace',
              textTransform: 'uppercase', letterSpacing: '0.15em',
              padding: '10px 24px', borderRadius: 3, cursor: 'pointer',
              boxShadow: `0 2px 12px ${T.amberGlow}`,
            }}
          >
            Claim Bonus
          </button>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY as THREE_MILLION_BONUS_MODAL_KEY };
