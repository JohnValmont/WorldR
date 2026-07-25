import { useState } from 'react'
import { PARTY_COLORS } from '../../_lib/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

const SYMBOLS = ['⚡', '✊', '🌿', '🔥', '⚙', '🦅', '🌊', '⭐', '🕊', '🔑', '⚔', '🌍']

export default function PhaseIdentity({ party, updateParty: _u, advance }: Props) {
  const [name, setName] = useState(party.name)
  const [abbreviation, setAbbreviation] = useState(party.abbreviation || '')
  const [slogan, setSlogan] = useState(party.slogan)
  const [colorId, setColorId] = useState(party.color || 'crimson')
  const [symbol, setSymbol] = useState('⚡')

  const selectedColor = PARTY_COLORS.find(c => c.id === colorId) || PARTY_COLORS[0]
  const canContinue = name.trim().length >= 3 && slogan.trim().length >= 5 && abbreviation.trim().length >= 2

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)',
      maxWidth: '960px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '60px',
      alignItems: 'start',
    }}>
      {/* Left: inputs */}
      <div>
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: selectedColor.hex,
            marginBottom: '16px',
            transition: 'color 0.3s',
          }}>
            Phase 04 — The Movement
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 900,
            lineHeight: 0.95,
            textTransform: 'uppercase',
            color: '#fff',
            marginBottom: '16px',
          }}>
            Give Your<br />
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Movement a Face</span>
          </div>
          <div style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: '15px',
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 300,
            lineHeight: 1.6,
          }}>
            This is how history will remember you.
            The name, the color, the words on every placard.
          </div>
        </div>

        {/* Party name */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '10px',
          }}>
            Party Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. New Democratic Alliance"
            maxLength={40}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2px',
              color: '#fff',
              fontSize: '20px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.02em',
              padding: '12px 16px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = selectedColor.hex }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Abbreviation */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '10px',
          }}>
            Abbreviation
          </label>
          <input
            value={abbreviation}
            onChange={e => setAbbreviation(e.target.value.toUpperCase())}
            placeholder="e.g. NDA"
            maxLength={6}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2px',
              color: '#fff',
              fontSize: '20px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.05em',
              padding: '12px 16px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = selectedColor.hex }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Slogan */}
        <div style={{ marginBottom: '36px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '10px',
          }}>
            Founding Slogan
          </label>
          <input
            value={slogan}
            onChange={e => setSlogan(e.target.value)}
            placeholder="e.g. A Country for Everyone"
            maxLength={60}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2px',
              color: '#fff',
              fontSize: '16px',
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.01em',
              padding: '12px 16px',
              outline: 'none',
              fontStyle: 'italic',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = selectedColor.hex }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '12px',
          }}>
            Party Color
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {PARTY_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColorId(c.id)}
                title={`${c.name} — ${c.meaning}`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '2px',
                  backgroundColor: c.hex,
                  border: colorId === c.id ? `3px solid #fff` : '3px solid transparent',
                  cursor: 'pointer',
                  boxShadow: colorId === c.id ? `0 0 16px ${c.hex}80` : 'none',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{
            marginTop: '10px',
            fontFamily: "'Barlow', sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.35)',
            fontStyle: 'italic',
          }}>
            {selectedColor.name} — {selectedColor.meaning}
          </div>
        </div>

        {/* Symbol picker */}
        <div style={{ marginBottom: '48px' }}>
          <label style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '12px',
          }}>
            Movement Symbol
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '2px',
                  background: symbol === s ? `${selectedColor.hex}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${symbol === s ? selectedColor.hex : 'rgba(255,255,255,0.08)'}`,
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              if (canContinue) advance({
                name: name.trim(),
                abbreviation: abbreviation.trim(),
                slogan: slogan.trim(),
                color: colorId,
                colorHex: selectedColor.hex,
                colorName: selectedColor.name,
              })
            }}
            disabled={!canContinue}
            style={{
              background: canContinue ? selectedColor.hex : 'transparent',
              border: `1px solid ${canContinue ? selectedColor.hex : 'rgba(255,255,255,0.12)'}`,
              color: canContinue ? '#080810' : 'rgba(255,255,255,0.25)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '14px 40px',
              borderRadius: '2px',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
            }}
          >
            Claim This Identity →
          </button>
          {!canContinue && (
            <div style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '12px', 
              fontFamily: "'Barlow', sans-serif",
              textAlign: 'center'
            }}>
              {name.trim().length < 3 ? 'Name must be at least 3 characters.' :
               abbreviation.trim().length < 2 ? 'Abbreviation must be at least 2 characters.' :
               slogan.trim().length < 5 ? 'Slogan must be at least 5 characters.' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Right: live preview */}
      <div style={{ position: 'sticky', top: '80px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)',
          marginBottom: '16px',
        }}>
          Live Preview
        </div>

        {/* Party card mockup */}
        <div style={{
          background: '#0d0d1a',
          border: `1px solid ${selectedColor.hex}30`,
          borderRadius: '2px',
          overflow: 'hidden',
          transition: 'border-color 0.3s',
        }}>
          {/* Color banner */}
          <div style={{
            height: '6px',
            backgroundColor: selectedColor.hex,
            transition: 'background-color 0.3s',
          }} />

          <div style={{ padding: '28px' }}>
            {/* Symbol + name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                backgroundColor: `${selectedColor.hex}15`,
                border: `1px solid ${selectedColor.hex}30`,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}>
                {symbol}
              </div>
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '22px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: name ? '#fff' : 'rgba(255,255,255,0.15)',
                  lineHeight: 1.1,
                  transition: 'color 0.2s',
                }}>
                  {name || 'Your Party Name'}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: selectedColor.hex,
                  marginTop: '4px',
                  transition: 'color 0.3s',
                }}>
                  Est. {new Date().getFullYear()}
                </div>
              </div>
            </div>

            {/* Slogan */}
            <div style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '14px',
              fontStyle: 'italic',
              color: slogan ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
              lineHeight: 1.5,
              marginBottom: '20px',
              transition: 'color 0.2s',
            }}>
              "{slogan || 'Your founding slogan'}"
            </div>

            {/* Leader */}
            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '3px' }}>
                  Party Leader
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {party.leaderName}
                </div>
              </div>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: selectedColor.hex,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '10px',
                fontWeight: 700,
                color: '#080810',
              }}>
                {party.leaderName.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Ballot appearance */}
        <div style={{
          marginTop: '12px',
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '2px',
            flexShrink: 0,
          }} />
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '1px',
            backgroundColor: selectedColor.hex,
            flexShrink: 0,
            transition: 'background-color 0.3s',
          }} />
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            {name || 'Your Party'} — {party.leaderName}
          </div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.18)',
          marginTop: '8px',
          textAlign: 'center',
        }}>
          Ballot representation
        </div>
      </div>
    </div>
  )
}
