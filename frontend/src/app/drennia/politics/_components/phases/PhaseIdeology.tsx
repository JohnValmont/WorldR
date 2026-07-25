import { useState } from 'react'
import { IDEOLOGY_AXES } from '../../_lib/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

function IdeologySlider({ axis, value, onChange }: {
  axis: typeof IDEOLOGY_AXES[0]
  value: number
  onChange: (v: number) => void
}) {
  const pct = ((value + 100) / 200) * 100

  return (
    <div style={{ marginBottom: '40px' }}>
      {/* Axis label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)',
        marginBottom: '20px',
      }}>
        {axis.label}
      </div>

      {/* Pole labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '22px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: value < -20 ? '#fff' : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.03em',
            transition: 'color 0.2s',
          }}>{axis.left}</div>
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 300,
            maxWidth: '160px',
            lineHeight: 1.4,
            marginTop: '4px',
          }}>{axis.leftDesc}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '22px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: value > 20 ? '#fff' : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.03em',
            transition: 'color 0.2s',
          }}>{axis.right}</div>
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 300,
            maxWidth: '160px',
            textAlign: 'right',
            lineHeight: 1.4,
            marginTop: '4px',
          }}>{axis.rightDesc}</div>
        </div>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
        {/* Track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '1px',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: '50%',
          width: `${Math.abs(value) / 2}%`,
          height: '2px',
          backgroundColor: axis.color,
          transform: value < 0 ? 'translateX(-100%)' : 'none',
          transition: 'width 0.1s',
        }} />
        {/* Center tick */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1px',
          height: '12px',
          backgroundColor: 'rgba(255,255,255,0.15)',
        }} />
        {/* Input */}
        <input
          type="range"
          min={-100}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            width: '100%',
            height: '32px',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        {/* Thumb visual */}
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: axis.color,
          border: '2px solid #080810',
          boxShadow: `0 0 12px ${axis.color}80`,
          transition: 'left 0.05s',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Current value label */}
      {Math.abs(value) > 10 && (
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: axis.color,
          letterSpacing: '0.1em',
        }}>
          {value < -60 ? 'Strong ' : value < -20 ? 'Moderate ' : value < 20 ? '' : value < 60 ? 'Moderate ' : 'Strong '}
          {value < 0 ? axis.left : axis.right}
        </div>
      )}
      {Math.abs(value) <= 10 && (
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: 'rgba(255,255,255,0.2)',
        }}>
          Centrist
        </div>
      )}

      {/* Separator */}
      <div style={{ marginTop: '32px', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

export default function PhaseIdeology({ party, updateParty: _u, advance }: Props) {
  const [axes, setAxes] = useState(party.ideologyAxes)

  const setAxis = (id: string, v: number) => {
    setAxes(prev => ({ ...prev, [id]: v }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)',
      maxWidth: '860px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '56px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#c9a84c',
          marginBottom: '16px',
        }}>
          Phase 02 — The Vision
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
          Where Do You<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Stand?</span>
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 300,
          lineHeight: 1.6,
          maxWidth: '500px',
        }}>
          These positions will define your party for decades.
          Voters, donors, and co-founders will judge you by where you stand.
          There are no safe answers.
        </div>
      </div>

      {/* Sliders */}
      {IDEOLOGY_AXES.map(axis => (
        <IdeologySlider
          key={axis.id}
          axis={axis}
          value={axes[axis.id] ?? 0}
          onChange={v => setAxis(axis.id, v)}
        />
      ))}

      {/* Consequence preview */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '2px',
        padding: '20px 24px',
        marginBottom: '40px',
        marginTop: '8px',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: '12px',
        }}>
          Strategic Assessment
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '14px',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
        }}>
          {(() => {
            const e = axes.economy ?? 0
            const a = axes.authority ?? 0
            const g = axes.governance ?? 0
            const labels = []
            if (e < -30) labels.push("left-wing economic programme")
            else if (e > 30) labels.push("market-oriented economic programme")
            else labels.push("centrist economic approach")
            if (a < -30) labels.push("progressive social agenda")
            else if (a > 30) labels.push("traditionalist social platform")
            if (g < -30) labels.push("decentralist governance model")
            else if (g > 30) labels.push("strong-state governance model")
            return `Your positions map to a ${labels.join(', ')}. This combination will attract certain voter groups and permanently alienate others.`
          })()}
        </div>
      </div>

      {/* Continue */}
      <button
        onClick={() => advance({ ideologyAxes: axes })}
        style={{
          background: '#c9a84c',
          border: '1px solid #c9a84c',
          color: '#080810',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          padding: '14px 40px',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        These Are My Positions →
      </button>
    </div>
  )
}
