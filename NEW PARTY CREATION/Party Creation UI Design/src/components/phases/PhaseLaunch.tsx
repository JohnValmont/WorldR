import { useState, useEffect } from 'react'
import { MEDIA_REACTIONS, POLICY_PILLARS, CO_FOUNDERS, CRISES } from '../../data/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
}

const LAUNCH_EVENTS = [
  { delay: 200, text: "Party registration filed with the Electoral Commission..." },
  { delay: 1200, text: "Press release distributed to 847 journalists..." },
  { delay: 2400, text: "Social media accounts activated..." },
  { delay: 3600, text: "First supporters arriving at founding rally..." },
  { delay: 4800, text: "Opposition parties monitoring the situation..." },
  { delay: 5800, text: "Breaking news coverage begins..." },
]

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function PhaseLaunch({ party }: Props) {
  const [visibleEvents, setVisibleEvents] = useState<number[]>([])
  const [showReaction, setShowReaction] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [pulseAnim, setPulseAnim] = useState(false)

  const colorHex = party.colorHex || '#c8102e'
  const rgb = hexToRgb(colorHex)
  const crisis = CRISES.find(c => c.id === party.crisis)

  const selectedFounders = CO_FOUNDERS.filter(f => party.founders.includes(f.id))

  useEffect(() => {
    LAUNCH_EVENTS.forEach((ev, i) => {
      setTimeout(() => {
        setVisibleEvents(v => [...v, i])
      }, ev.delay)
    })
    setTimeout(() => setShowReaction(true), 7000)
    setTimeout(() => setShowStats(true), 8000)
    setTimeout(() => setPulseAnim(true), 500)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated color radial */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, rgba(${rgb},0.12) 0%, transparent 70%)`,
        transition: 'opacity 2s',
        opacity: pulseAnim ? 1 : 0,
        pointerEvents: 'none',
      }} />

      {/* Scanlines */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)',
      }}>
        {/* Top label */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: colorHex,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colorHex,
            boxShadow: `0 0 10px ${colorHex}`,
            animation: 'pulse 1.5s infinite',
          }} />
          LIVE — Movement Launch Initiated
        </div>

        {/* Party name */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(48px, 10vw, 100px)',
          fontWeight: 900,
          lineHeight: 0.88,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: '#fff',
          marginBottom: '20px',
        }}>
          {party.name || 'Your Movement'}
        </div>

        {/* Slogan */}
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 'clamp(16px, 3vw, 24px)',
          color: 'rgba(255,255,255,0.45)',
          fontStyle: 'italic',
          fontWeight: 300,
          marginBottom: '60px',
          borderLeft: `3px solid ${colorHex}`,
          paddingLeft: '20px',
        }}>
          "{party.slogan || 'A country for everyone'}"
        </div>

        {/* Two column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '40px',
          alignItems: 'start',
        }}>
          {/* Left: live event log */}
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: '16px',
            }}>
              Launch Feed
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '2px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              {LAUNCH_EVENTS.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '14px',
                    opacity: visibleEvents.includes(i) ? 1 : 0,
                    transform: visibleEvents.includes(i) ? 'translateX(0)' : 'translateX(-12px)',
                    transition: 'all 0.5s ease',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: colorHex,
                    marginTop: '5px',
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${colorHex}60`,
                  }} />
                  <div style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.5,
                  }}>
                    {ev.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Media reactions */}
            {showReaction && (
              <div style={{
                opacity: showReaction ? 1 : 0,
                transition: 'opacity 0.8s ease',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                  marginBottom: '12px',
                }}>
                  Media Reaction
                </div>
                {MEDIA_REACTIONS.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '2px',
                      marginBottom: '8px',
                      opacity: showReaction ? 1 : 0,
                      transform: showReaction ? 'translateY(0)' : 'translateY(8px)',
                      transition: `all 0.4s ease ${i * 0.15}s`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '14px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        color: '#fff',
                      }}>
                        {r.outlet}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)',
                        alignSelf: 'center',
                      }}>
                        {r.bias}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.5)',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}>
                      "{r.reaction}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Party dossier */}
          {showStats && (
            <div style={{
              opacity: showStats ? 1 : 0,
              transform: showStats ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s ease',
            }}>
              <div style={{
                background: '#0d0d1a',
                border: `1px solid ${colorHex}30`,
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  height: '4px',
                  backgroundColor: colorHex,
                }} />
                <div style={{ padding: '20px' }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                    marginBottom: '12px',
                  }}>
                    Party Dossier · Day 1
                  </div>

                  {/* Starting poll */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                        Polling
                      </span>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '20px',
                        fontWeight: 700,
                        color: colorHex,
                      }}>
                        2.4%
                      </span>
                    </div>
                    <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '2.4%', backgroundColor: colorHex, borderRadius: '2px', transition: 'width 1s ease 0.5s' }} />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                      Every movement starts here.
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />

                  {/* Founding crisis */}
                  {crisis && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '4px' }}>Founding Cause</div>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{crisis.headline}</div>
                    </div>
                  )}

                  {/* Co-founders */}
                  {selectedFounders.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }}>Inner Circle</div>
                      {selectedFounders.map(f => (
                        <div key={f.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '2px',
                            backgroundColor: `${f.accent}20`,
                            border: `1px solid ${f.accent}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: '9px',
                            fontWeight: 700,
                            color: f.accent,
                            flexShrink: 0,
                          }}>
                            {f.portrait}
                          </div>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{f.name}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manifesto pills */}
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }}>Core Positions</div>
                    {POLICY_PILLARS.map(pillar => {
                      const stance = pillar.stances.find(s => s.id === party.policies[pillar.id])
                      return stance ? (
                        <div key={pillar.id} style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          marginRight: '4px',
                          marginBottom: '4px',
                          background: `rgba(${rgb},0.12)`,
                          border: `1px solid rgba(${rgb},0.25)`,
                          borderRadius: '2px',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: colorHex,
                        }}>
                          {stance.label}
                        </div>
                      ) : null
                    })}
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />

                  {/* Leader */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: colorHex,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#080810',
                      flexShrink: 0,
                    }}>
                      {party.leaderName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>{party.leaderName}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>PARTY FOUNDER & LEADER</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next steps teaser */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '2px',
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' }}>
                  First 30 Days
                </div>
                {[
                  'First rally — build early momentum',
                  'Donor outreach begins',
                  'First internal disagreement brewing',
                  'Opposition already researching your history',
                ].map((t, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '7px',
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    <span style={{ color: colorHex, flexShrink: 0 }}>→</span>
                    {t}
                  </div>
                ))}
              </div>

              <button
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: colorHex,
                  border: 'none',
                  color: '#080810',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '13px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '16px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Enter WORLDr →
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
