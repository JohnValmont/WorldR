'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Landmark, CheckCircle, XCircle, MinusCircle, Scroll, Shield } from 'lucide-react';

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

export default function LegislatureScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const bills: any[] = Array.isArray(data?.bills) ? data.bills : [];

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  
  async function vote(id: string, v: 'yea' | 'nay') {
    try { setBusy(id + v); setErr(null); await politicsApi.voteBill(id, v); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to vote'); } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingLeft: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 8, border: `1px solid ${T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,180,0,0.05)' }}>
          <Landmark size={32} color={T.gold} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ ...stampStyle, color: T.gold, marginBottom: 8, fontSize: 11, letterSpacing: '0.15em' }}>LEGISLATURE · {jurisdiction?.name.toUpperCase()}</div>
          <h1 style={{ color: T.ivory, fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>The Chamber</h1>
        </div>
      </div>

      {isLocked ? (
        <DarkPanel title="CHAMBER LOCKED" icon={Shield}>
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} legislature is not currently in session.</div>
        </DarkPanel>
      ) : (
        <DarkPanel title="ON THE FLOOR" icon={Landmark}>
          {bills.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', background: T.panel2, borderRadius: 6, border: `1px dashed ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Scroll size={32} color={T.muted} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>No bills are currently on the floor.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bills.map((b: any) => {
                const total = (b.tally?.yea || 0) + (b.tally?.nay || 0) + (b.tally?.abstain || 0);
                const pYea = total > 0 ? ((b.tally?.yea || 0) / total) * 100 : 0;
                const pNay = total > 0 ? ((b.tally?.nay || 0) / total) * 100 : 0;
                const pAbstain = total > 0 ? ((b.tally?.abstain || 0) / total) * 100 : 100;
                
                return (
                  <div key={b.id} style={{ 
                    background: T.panel2, 
                    border: `1px solid ${b.projectedPass ? T.mint : T.red}40`, 
                    borderRadius: 6, 
                    padding: 24,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      position: 'absolute', top: 0, right: 0, 
                      background: b.projectedPass ? `${T.mint}15` : `${T.red}15`,
                      color: b.projectedPass ? T.mint : T.red,
                      padding: '4px 12px',
                      borderBottomLeftRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: MONO
                    }}>
                      {b.projectedPass ? 'Projected: Pass' : 'Projected: Fail'}
                    </div>

                    <div style={{ color: T.ivory, fontWeight: 700, fontSize: 18, marginBottom: 6, paddingRight: 100 }}>
                      {b.title || b.name || 'Legislative Bill'}
                    </div>
                    <div style={{ color: T.faint, fontSize: 13, marginBottom: 20 }}>
                      Proposed Arc: {b.proposed_arc}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: MONO, marginBottom: 8, fontWeight: 600 }}>
                        <span style={{ color: T.mint, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14}/> Yea {b.tally?.yea || 0}</span>
                        <span style={{ color: T.faint, display: 'flex', alignItems: 'center', gap: 6 }}><MinusCircle size={14}/> Abstain {b.tally?.abstain || 0}</span>
                        <span style={{ color: T.red, display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14}/> Nay {b.tally?.nay || 0}</span>
                      </div>
                      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#2a2a2a', gap: 2 }}>
                        <div style={{ width: `${pYea}%`, background: T.mint }} />
                        <div style={{ width: `${pAbstain}%`, background: T.muted }} />
                        <div style={{ width: `${pNay}%`, background: T.red }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <FlatBtn 
                          fullWidth
                          label={busy === b.id + 'yea' ? '...' : 'Vote Yea'} 
                          primary color={T.mint} icon={CheckCircle}
                          onClick={() => vote(b.id, 'yea')} 
                          disabled={!!busy} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FlatBtn 
                          fullWidth
                          label={busy === b.id + 'nay' ? '...' : 'Vote Nay'} 
                          primary color={T.red} icon={XCircle}
                          onClick={() => vote(b.id, 'nay')} 
                          disabled={!!busy} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DarkPanel>
      )}
      {err && (
        <div style={{ padding: 16, background: `${T.red}15`, border: `1px solid ${T.red}40`, color: T.red, borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={16} /> {err}
        </div>
      )}
    </div>
  );
}
