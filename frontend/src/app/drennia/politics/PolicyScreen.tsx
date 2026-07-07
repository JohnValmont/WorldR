'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Scroll, Gavel, Shield } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  onRefresh?: () => void;
}

function DarkPanel({ title, children, icon: Icon }: { title: React.ReactNode; children: React.ReactNode; icon?: any }) {
  return (
    <div style={{
      background: T.panel,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '20px 24px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        {Icon && <Icon size={18} color={T.muted} />}
        <div style={{ ...stampStyle, fontSize: 13, letterSpacing: '0.1em', color: T.faint }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function FlatBtn({ label, onClick, primary, disabled, icon: Icon, color, fullWidth }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean; icon?: any; color?: string; fullWidth?: boolean }) {
  const baseColor = color || (primary ? T.gold : T.ivory);
  const bgColor = primary ? `${baseColor}20` : 'transparent';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 18px',
      borderRadius: 4,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontSize: 12,
      fontWeight: 700,
      fontFamily: MONO,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: bgColor,
      color: baseColor,
      border: `1px solid ${primary ? baseColor : T.border}`,
      transition: 'background 0.15s ease',
      width: fullWidth ? '100%' : 'auto'
    }}
    onMouseEnter={(e) => { if(!disabled) e.currentTarget.style.background = `${baseColor}30`; }}
    onMouseLeave={(e) => { if(!disabled) e.currentTarget.style.background = bgColor; }}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

export default function PolicyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [rate, setRate] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const activePolicy = data?.activePolicy;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  
  async function propose() {
    try { setBusy('propose'); setErr(null); await politicsApi.proposeBill('industry_tax', { rate: rate / 100 }, selectedJurisdictionId); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to propose'); } finally { setBusy(null); }
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingLeft: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 8, border: `1px solid ${T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,180,0,0.05)' }}>
          <Scroll size={32} color={T.gold} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ ...stampStyle, color: T.gold, marginBottom: 8, fontSize: 11, letterSpacing: '0.15em' }}>POLICY DESK · {jurisdiction?.name.toUpperCase()}</div>
          <h1 style={{ color: T.ivory, fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>Jurisdiction Policy</h1>
        </div>
      </div>

      {isLocked ? (
        <DarkPanel title="POLICY LOCKED" icon={Shield}>
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} policy desk is not currently accessible.</div>
        </DarkPanel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
          
          <DarkPanel title="ACTIVE POLICIES" icon={Scroll}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#171717', padding: 20, borderRadius: 6, borderLeft: `2px solid ${T.gold}` }}>
                <div style={{ ...stampStyle, color: T.faint, fontSize: 11, marginBottom: 8 }}>INDUSTRY TAX RATE</div>
                <div style={{ color: T.ivory, fontSize: 28, fontWeight: 800, fontFamily: MONO }}>
                  {activePolicy ? (Number(activePolicy.industry_tax_rate) * 100).toFixed(1) : '0.0'}%
                </div>
                <div style={{ color: T.faint, fontSize: 12, marginTop: 8 }}>Deducted from manufacturing net profits at month-end.</div>
              </div>

              <div style={{ background: '#171717', padding: 20, borderRadius: 6, borderLeft: `2px solid #333` }}>
                <div style={{ ...stampStyle, color: T.faint, fontSize: 11, marginBottom: 8 }}>INFRASTRUCTURE LEVEL</div>
                <div style={{ color: T.ivory, fontSize: 20, fontWeight: 700 }}>Level {activePolicy?.infrastructure_level ?? 1}</div>
              </div>
            </div>
          </DarkPanel>

          {myParty && (
            <DarkPanel title="DRAFT PROPOSAL" icon={Gavel}>
              <div style={{ color: T.faint, fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                Set the industry tax rate for the jurisdiction. Proposals require a simple majority to pass and become active at the start of the next arc.
              </div>
              
              <div style={{ background: '#171717', padding: '24px 20px', borderRadius: 6, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ color: T.faint, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Proposed Rate</span>
                  <span style={{ color: T.gold, fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{rate}%</span>
                </div>
                <input 
                  type="range" min={0} max={60} value={rate} 
                  onChange={(e) => setRate(Number(e.target.value))} 
                  style={{ width: '100%', accentColor: T.gold, cursor: 'pointer', height: 4 }} 
                />
              </div>

              <FlatBtn 
                fullWidth
                label={busy === 'propose' ? 'Drafting...' : 'Submit to Floor'} 
                primary 
                icon={Scroll}
                onClick={propose} 
                disabled={busy === 'propose'} 
              />
              
              {err && (
                <div style={{ marginTop: 16, color: T.red, fontSize: 13, fontStyle: 'italic' }}>
                  {err}
                </div>
              )}
            </DarkPanel>
          )}

        </div>
      )}
    </div>
  );
}
