import { useState, useEffect } from 'react'
import PhaseIntro from './phases/PhaseIntro'
import PhaseCrisis from './phases/PhaseCrisis'
import PhaseIdeology from './phases/PhaseIdeology'
import PhaseFounders from './phases/PhaseFounders'
import PhaseIdentity from './phases/PhaseIdentity'
import PhaseManifesto from './phases/PhaseManifesto'
import PhaseLaunch from './phases/PhaseLaunch'

export type PartyState = {
  name: string
  abbreviation: string
  slogan: string
  color: string
  colorHex: string
  colorName: string
  crisis: string
  ideologyAxes: Record<string, number>
  founders: string[]
  policies: Record<string, string>
  leaderName: string
}

const PHASES = ['intro', 'crisis', 'ideology', 'founders', 'identity', 'manifesto', 'launch'] as const
type Phase = typeof PHASES[number]


export default function PartyCreation({ 
  onComplete,
  initialLeaderName = '',
  onCancel
}: { 
  onComplete?: (party: PartyState) => void,
  initialLeaderName?: string,
  onCancel?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [party, setParty] = useState<PartyState>({
    name: '',
    abbreviation: '',
    slogan: '',
    color: 'crimson',
    colorHex: '#c8102e',
    colorName: 'Crimson',
    crisis: '',
    ideologyAxes: { economy: 0, authority: 0, governance: 0 },
    founders: [],
    policies: {},
    leaderName: initialLeaderName,
  })

  useEffect(() => {
    if (initialLeaderName && !party.leaderName) {
      setParty(p => ({ ...p, leaderName: initialLeaderName }))
    }
  }, [initialLeaderName, party.leaderName])

  const phaseIndex = PHASES.indexOf(phase)

  const advance = (updates?: Partial<PartyState>) => {
    if (updates) setParty(p => ({ ...p, ...updates }))
    const next = PHASES[phaseIndex + 1]
    if (next) setPhase(next)
  }

  const updateParty = (updates: Partial<PartyState>) => {
    setParty(p => ({ ...p, ...updates }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto', minHeight: '100vh', backgroundColor: '#080810', fontFamily: "'Barlow', sans-serif" }}>
      {/* Back button */}
      <button
        onClick={() => {
          if (onCancel) onCancel();
          else window.location.href = '/drennia/politics';
        }}
        style={{
          position: 'absolute', top: 32, left: 32, zIndex: 150,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 4,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Cancel
      </button>

      {/* Progress rail */}
      {phase !== 'intro' && phase !== 'launch' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '0 32px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(8,8,16,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Party name if set */}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {party.name || 'WORLDr'} · Party Creation
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {PHASES.filter(p => p !== 'intro').map((p, i) => {
              const idx = PHASES.indexOf(p)
              const done = phaseIndex > idx
              const active = phase === p
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {i > 0 && <div style={{ width: 20, height: 1, backgroundColor: done ? party.colorHex : 'rgba(255,255,255,0.12)' }} />}
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: active ? party.colorHex : done ? party.colorHex : 'rgba(255,255,255,0.15)',
                    opacity: active ? 1 : done ? 0.6 : 0.4,
                    boxShadow: active ? `0 0 8px ${party.colorHex}` : 'none',
                    transition: 'all 0.3s',
                  }} />
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
            {phaseIndex}/{PHASES.length - 1}
          </div>
        </div>
      )}

      {/* Phase content */}
      <div style={{ paddingTop: phase !== 'intro' && phase !== 'launch' ? '48px' : '0' }}>
        {phase === 'intro' && <PhaseIntro party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'crisis' && <PhaseCrisis party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'ideology' && <PhaseIdeology party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'founders' && <PhaseFounders party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'identity' && <PhaseIdentity party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'manifesto' && <PhaseManifesto party={party} updateParty={updateParty} advance={advance} />}
        {phase === 'launch' && <PhaseLaunch party={party} onComplete={() => onComplete?.(party)} />}
      </div>
    </div>
  )
}
