'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { politicsApi } from '../../lib/api';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:         '#090A0F',
  overlay:    'rgba(9,10,15,0.92)',
  panel:      '#11131A',
  border:     '#2A2630',
  amber:      '#C9A24A',
  amberDim:   'rgba(201,162,74,0.15)',
  amberGlow:  'rgba(201,162,74,0.25)',
  ivory:      '#F4EBD6',
  muted:      '#A79D8C',
  faint:      '#6B6358',
  green:      '#4D8C6A',
  greenDim:   'rgba(77,140,106,0.15)',
  blue:       '#4A6D8C',
  blueDim:    'rgba(74,109,140,0.15)',
};

const STORAGE_KEY = 'worldr_seen_first_day_modal_v1';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Pip({ active }: { active: boolean }) {
  return (
    <div style={{
      width: active ? 20 : 6,
      height: 6,
      borderRadius: 3,
      background: active ? T.amber : T.faint,
      transition: 'all 0.3s ease',
    }} />
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint }}>{label}</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.muted }}>{value}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 2 }}>
        <div style={{ height: 3, width: `${Math.min(100, value)}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── Card 1: World Context ─────────────────────────────────────────────────────

function Card1({ name, polState, polCouncil }: { name: string; polState: any; polCouncil: any }) {
  const phase    = polState?.cyclePhase || 'Governing';
  const stateName = polState?.activeState?.name || 'Ironvale';
  const premier  = polCouncil?.premier?.party_name || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <div>
        <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.28em', color: T.amber, marginBottom: 6 }}>
          Drennia · January, Year 0
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif', color: T.ivory, margin: 0, lineHeight: 1.2 }}>
          Welcome to Drennia,<br />{name}.
        </h2>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
          You are now a citizen of Drennia — a constitutional monarchy in the Varelia continent.
          Ironvale's factories are running. The council is in session. The world already has
          players, NPC operators, and institutions. Your file has just been opened.
        </p>
      </div>

      {/* World snapshot cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Political phase */}
          <div style={{ flex: 1, background: T.amberDim, border: `1px solid ${T.border}`, borderRadius: 4, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.faint, marginBottom: 4 }}>
              {stateName} State Council
            </div>
            <div style={{ fontSize: 13, color: T.ivory, fontWeight: 600 }}>
              {phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
            </div>
            {premier && (
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Premier: {premier}</div>
            )}
          </div>

          {/* Economic phase */}
          <div style={{ flex: 1, background: T.greenDim, border: `1px solid ${T.border}`, borderRadius: 4, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.faint, marginBottom: 4 }}>
              Economy
            </div>
            <div style={{ fontSize: 13, color: T.ivory, fontWeight: 600 }}>Open Market</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Manufacturing active</div>
          </div>
        </div>

        {/* Lore blurb */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, color: T.muted, margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
            "Ironvale's industrial heartland runs round the clock. In Drennport, the ministries
            record everything. The Crown watches. The people decide — eventually."
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Card 2: Two Paths ─────────────────────────────────────────────────────────

function Card2({ onGoToBusiness, onGoToPolitics }: { onGoToBusiness: () => void; onGoToPolitics: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.28em', color: T.amber, marginBottom: 6 }}>
          Your first moves
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif', color: T.ivory, margin: 0, lineHeight: 1.2 }}>
          Two paths. Both open.
        </h2>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
          You can pursue business, politics, or both. They connect — winning power means government tenders,
          industry tax rates, and procurement contracts that change the numbers in the business sim.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Business path */}
        <div style={{ background: T.greenDim, border: `1px solid rgba(77,140,106,0.35)`, borderRadius: 4, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4D8C6A', marginBottom: 6 }}>
            📈 Business Path
          </div>
          <div style={{ fontSize: 14, color: T.ivory, fontWeight: 600, marginBottom: 4 }}>Build a company</div>
          <p style={{ fontSize: 11, color: T.muted, margin: '0 0 12px', lineHeight: 1.6 }}>
            Register a manufacturing or logistics company. Design vehicles, set up factories, compete for
            market share, and bid on government procurement tenders.
          </p>
          <button
            onClick={onGoToBusiness}
            style={{
              background: 'rgba(77,140,106,0.2)', border: '1px solid rgba(77,140,106,0.5)',
              color: '#7EC8A0', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase',
              letterSpacing: '0.15em', padding: '7px 14px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            Open Business Desk →
          </button>
        </div>

        {/* Politics path */}
        <div style={{ background: T.amberDim, border: `1px solid rgba(201,162,74,0.35)`, borderRadius: 4, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.amber, marginBottom: 6 }}>
            🏛️ Politics Path
          </div>
          <div style={{ fontSize: 14, color: T.ivory, fontWeight: 600, marginBottom: 4 }}>Join the political arena</div>
          <p style={{ fontSize: 11, color: T.muted, margin: '0 0 12px', lineHeight: 1.6 }}>
            Found or join a party. Campaign across Ironvale's voter segments. Win a Council seat,
            form a government, and pass bills that directly change the business environment.
          </p>
          <button
            onClick={onGoToPolitics}
            style={{
              background: T.amberDim, border: `1px solid rgba(201,162,74,0.5)`,
              color: T.amber, fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase',
              letterSpacing: '0.15em', padding: '7px 14px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            Open Political Desk →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card 3: Three resources ───────────────────────────────────────────────────

function Card3({ citizenFile }: { citizenFile: any }) {
  const credibility = citizenFile?.credibility ?? 50;
  const charisma    = citizenFile?.charisma    ?? 50;
  const influence   = citizenFile?.influence   ?? 10;
  const cash        = citizenFile?.personalMoney ?? 1000000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.28em', color: T.amber, marginBottom: 6 }}>
          What you manage
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif', color: T.ivory, margin: 0, lineHeight: 1.2 }}>
          Three things to track.
        </h2>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
          Everything in Drennia runs on cash, factors, and time. No separate
          resources for business vs. politics — the same numbers flow everywhere.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Cash */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.ivory }}>Personal Cash</span>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: T.amber }}>
              ${Number(cash).toLocaleString('en-US')}
            </span>
          </div>
          <p style={{ fontSize: 10, color: T.faint, margin: 0, lineHeight: 1.5 }}>
            Spent on company formation, campaign actions, party donations, research, and lobbying.
          </p>
        </div>

        {/* Factors */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ivory, marginBottom: 10 }}>Your Factors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FactorBar label="Credibility" value={credibility} color={T.blue} />
            <FactorBar label="Charisma"    value={charisma}    color={T.amber} />
            <FactorBar label="Influence"   value={influence}   color={T.green} />
          </div>
          <p style={{ fontSize: 10, color: T.faint, margin: '10px 0 0', lineHeight: 1.5 }}>
            Grow through actions. Win office → Influence rises. Pass bills → Credibility rises.
            Campaign actively → Charisma rises. These are your long-term score.
          </p>
        </div>

        {/* Month clock */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.ivory }}>The Month Clock</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: T.muted }}>1 month = 1 month</span>
          </div>
          <p style={{ fontSize: 10, color: T.faint, margin: 0, lineHeight: 1.5 }}>
            Everything resolves monthly: sales, salaries, elections, bills, campaigns.
            The admin button in the Business Desk advances the clock manually in pre-alpha.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface FirstDayModalProps {
  characterName: string;
  citizenFile: any;
  onDismiss: () => void;
}

export default function FirstDayModal({ characterName, citizenFile, onDismiss }: FirstDayModalProps) {
  const router = useRouter();
  const [card, setCard]       = useState(0);
  const [polState, setPolState]     = useState<any>(null);
  const [polCouncil, setPolCouncil] = useState<any>(null);
  const [fadeIn, setFadeIn]   = useState(false);

  const TOTAL_CARDS = 3;

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setFadeIn(true), 40);

    // Load political context for Card 1 (non-blocking)
    Promise.allSettled([
      politicsApi.getState(),
      politicsApi.getCouncil(),
    ]).then(([stateRes, councilRes]) => {
      if (stateRes.status === 'fulfilled') setPolState(stateRes.value);
      if (councilRes.status === 'fulfilled') setPolCouncil(councilRes.value);
    });

    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onDismiss();
  };

  const goToBusiness = () => {
    dismiss();
    router.push('/drennia/business');
  };

  const goToPolitics = () => {
    alert('Political desk will be available Coming soon [ 3 Aug 2026 tentative ].');
  };

  const firstName = characterName.split(' ')[0] || characterName;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
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
          maxHeight: '90vh',
          overflowY: 'auto',
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
            Citizen File · Drennia
          </div>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: 11, fontFamily: 'monospace' }}
          >
            Skip
          </button>
        </div>

        {/* Card body */}
        <div style={{ padding: '22px 22px 16px', flex: 1 }}>
          {card === 0 && <Card1 name={firstName} polState={polState} polCouncil={polCouncil} />}
          {card === 1 && <Card2 onGoToBusiness={goToBusiness} onGoToPolitics={goToPolitics} />}
          {card === 2 && <Card3 citizenFile={citizenFile} />}
        </div>

        {/* Bottom nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px',
          borderTop: `1px solid ${T.border}`,
        }}>
          {/* Pips */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
              <Pip key={i} active={i === card} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {card > 0 && (
              <button
                onClick={() => setCard(c => c - 1)}
                style={{
                  background: 'none', border: `1px solid ${T.border}`,
                  color: T.muted, fontSize: 11, fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            {card < TOTAL_CARDS - 1 ? (
              <button
                onClick={() => setCard(c => c + 1)}
                style={{
                  background: `linear-gradient(135deg, ${T.amber}, #E0B85A)`,
                  border: 'none', color: '#fff',
                  fontSize: 11, fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  padding: '8px 20px', borderRadius: 3, cursor: 'pointer',
                  boxShadow: `0 2px 12px ${T.amberGlow}`,
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={dismiss}
                style={{
                  background: `linear-gradient(135deg, ${T.amber}, #E0B85A)`,
                  border: 'none', color: '#fff',
                  fontSize: 11, fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  padding: '8px 20px', borderRadius: 3, cursor: 'pointer',
                  boxShadow: `0 2px 12px ${T.amberGlow}`,
                }}
              >
                Begin →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export the key so Chronicle can check it ──────────────────────────────────
export { STORAGE_KEY as FIRST_DAY_MODAL_KEY };
