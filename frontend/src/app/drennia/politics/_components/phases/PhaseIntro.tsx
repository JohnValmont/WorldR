import { useState, useEffect } from 'react'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

const LINES = [
  "Every movement begins with a single person",
  "who decides the world cannot stay as it is.",
  "",
  "What you build here will outlast you.",
  "Choose carefully.",
]

export default function PhaseIntro({ party, updateParty: _u, advance }: Props) {
  const [visible, setVisible] = useState<number[]>([])
  const [showInput, setShowInput] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [name, setName] = useState(party.leaderName)

  useEffect(() => {
    if (party.leaderName && !name) {
      setName(party.leaderName)
    }
  }, [party.leaderName, name])

  useEffect(() => {
    let t = 0
    LINES.forEach((_, i) => {
      setTimeout(() => {
        setVisible(v => [...v, i])
        if (i === LINES.length - 1) {
          setTimeout(() => setShowInput(true), 600)
        }
      }, t)
      t += LINES[i] === '' ? 400 : 800
    })
  }, [])

  useEffect(() => {
    setShowButton(name.trim().length >= 2)
  }, [name])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(200,16,46,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Scanlines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Game wordmark */}
      <div style={{
        position: 'absolute',
        top: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.35em',
        color: 'rgba(255,255,255,0.18)',
        textTransform: 'uppercase',
      }}>
        WORLDr
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(56px, 10vw, 96px)',
          fontWeight: 900,
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: '48px',
          textTransform: 'uppercase',
        }}>
          FOUND<br />
          <span style={{ color: '#c8102e' }}>YOUR</span><br />
          MOVEMENT
        </div>

        {/* Animated lines */}
        <div style={{ marginBottom: '48px', minHeight: '120px' }}>
          {LINES.map((line, i) => (
            <div key={i} style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '16px',
              fontWeight: 300,
              lineHeight: 1.7,
              color: line === '' ? 'transparent' : 'rgba(255,255,255,0.6)',
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.6s ease',
              minHeight: line === '' ? '12px' : 'auto',
            }}>
              {line || ' '}
            </div>
          ))}
        </div>

        {/* Name input */}
        {showInput && (
          <div style={{
            opacity: showInput ? 1 : 0,
            transform: showInput ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: '12px',
            }}>
              Who are you?
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2) advance({ leaderName: name.trim() }) }}
              placeholder="Enter your name"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '24px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.05em',
                padding: '14px 20px',
                outline: 'none',
                textAlign: 'center',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#c8102e' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
            />
            <div style={{ marginTop: '32px' }}>
              <button
                onClick={() => { if (name.trim().length >= 2) advance({ leaderName: name.trim() }) }}
                disabled={name.trim().length < 2}
                style={{
                  background: showButton ? '#c8102e' : 'transparent',
                  border: `1px solid ${showButton ? '#c8102e' : 'rgba(255,255,255,0.15)'}`,
                  color: showButton ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '14px 48px',
                  borderRadius: '2px',
                  cursor: showButton ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                }}
              >
                Begin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom quote */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        fontFamily: "'Barlow', sans-serif",
        fontSize: '12px',
        color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.05em',
        fontStyle: 'italic',
      }}>
        "History is made by those who show up."
      </div>
    </div>
  )
}
