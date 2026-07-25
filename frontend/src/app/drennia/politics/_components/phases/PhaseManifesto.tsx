import { useState } from 'react'
import { POLICY_PILLARS } from '../../_lib/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

export default function PhaseManifesto({ party, updateParty: _u, advance }: Props) {
  const [policies, setPolicies] = useState<Record<string, string>>(party.policies || {})
  const [activePillar, setActivePillar] = useState(POLICY_PILLARS[0].id)

  const setPillarPolicy = (pillarId: string, stanceId: string) => {
    setPolicies(p => ({ ...p, [pillarId]: stanceId }))
    const idx = POLICY_PILLARS.findIndex(p => p.id === pillarId)
    const next = POLICY_PILLARS[idx + 1]
    if (next) setTimeout(() => setActivePillar(next.id), 300)
  }

  const allSelected = POLICY_PILLARS.every(p => policies[p.id])
  const currentPillar = POLICY_PILLARS.find(p => p.id === activePillar)!

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)',
      maxWidth: '1000px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: party.colorHex || '#c8102e',
          marginBottom: '16px',
        }}>
          Phase 05 — The Manifesto
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(36px, 6vw, 60px)',
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: '#fff',
          marginBottom: '16px',
        }}>
          What Will Your<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Party Stand For?</span>
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 300,
          lineHeight: 1.6,
          maxWidth: '480px',
        }}>
          Three pillars. Nine positions. Every choice signals something to voters,
          donors, and rivals. There are no neutral answers.
        </div>
      </div>

      {/* Pillar tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {POLICY_PILLARS.map((p, i) => {
          const done = !!policies[p.id]
          const active = activePillar === p.id
          return (
            <button
              key={p.id}
              onClick={() => setActivePillar(p.id)}
              style={{
                flex: 1,
                padding: '14px 12px',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? (party.colorHex || '#c8102e') : done ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: done ? '#4ade80' : 'rgba(255,255,255,0.25)',
                marginBottom: '4px',
              }}>
                {done ? '✓ Done' : `Pillar ${i + 1}`}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '15px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'color 0.2s',
              }}>
                {p.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Stances */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        marginBottom: '40px',
      }}>
        {currentPillar.stances.map(stance => {
          const isSelected = policies[activePillar] === stance.id
          return (
            <button
              key={stance.id}
              onClick={() => setPillarPolicy(activePillar, stance.id)}
              style={{
                background: isSelected
                  ? `rgba(${hexToRgb(party.colorHex || '#c8102e')},0.1)`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? (party.colorHex || '#c8102e') : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '2px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '3px',
                  height: '100%',
                  backgroundColor: party.colorHex || '#c8102e',
                  borderRadius: '2px 0 0 2px',
                }} />
              )}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                marginBottom: '8px',
              }}>
                {stance.label}
              </div>
              <div style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
                marginBottom: '12px',
              }}>
                {stance.desc}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: isSelected ? (party.colorHex || '#c8102e') : 'rgba(255,255,255,0.25)',
                lineHeight: 1.6,
                letterSpacing: '0.02em',
              }}>
                {stance.tradeoff}
              </div>
            </button>
          )
        })}
      </div>

      {/* Manifesto preview */}
      {allSelected && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '2px',
          padding: '28px',
          marginBottom: '40px',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
            marginBottom: '16px',
          }}>
            Founding Manifesto Preview
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '20px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: party.colorHex || '#c8102e',
            marginBottom: '16px',
          }}>
            {party.name || 'Our Movement'} — Founding Principles
          </div>
          {POLICY_PILLARS.map(pillar => {
            const stance = pillar.stances.find(s => s.id === policies[pillar.id])
            return stance ? (
              <div key={pillar.id} style={{ marginBottom: '12px', paddingLeft: '16px', borderLeft: `2px solid ${party.colorHex || '#c8102e'}30` }}>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{pillar.label}</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '15px', fontWeight: 500, color: '#fff' }}>{stance.label}</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{stance.desc}</div>
              </div>
            ) : null
          })}
        </div>
      )}

      <button
        onClick={() => { if (allSelected) advance({ policies }) }}
        disabled={!allSelected}
        style={{
          background: allSelected ? (party.colorHex || '#c8102e') : 'transparent',
          border: `1px solid ${allSelected ? (party.colorHex || '#c8102e') : 'rgba(255,255,255,0.12)'}`,
          color: allSelected ? '#080810' : 'rgba(255,255,255,0.25)',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          padding: '14px 40px',
          borderRadius: '2px',
          cursor: allSelected ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s',
        }}
      >
        {allSelected ? 'Publish Our Manifesto →' : `${POLICY_PILLARS.filter(p => policies[p.id]).length} / ${POLICY_PILLARS.length} Pillars Defined`}
      </button>
    </div>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
