'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { PILLARS } from './_lib/model';
import { formatGameDateShort } from '@/lib/calendar';
import { Shield, Map, Landmark, Crown, Building2, Coins, Activity, Target } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  ledger: any[];
}

// ── Glass Panel Component (Shared visual language with Command Center) ──
function GlassPanel({ title, children, accent, flex }: { title: React.ReactNode, children: React.ReactNode, accent?: string, flex?: number | string }) {
  return (
    <div style={{
      ...glassPanelStyle,
      flex,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(145deg, rgba(18, 20, 26, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
      border: `1px solid rgba(255, 255, 255, 0.08)`,
      borderTop: accent ? `1px solid ${accent}` : `1px solid rgba(255, 255, 255, 0.15)`,
      boxShadow: accent ? `0 4px 24px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.05)` : '0 4px 24px rgba(0,0,0,0.4)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        {title}
      </div>
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── Condition colour scale (0–10) ──────────────────────────────────────────
function condTone(v: number) {
  return v >= 6.5 ? T.mint : v >= 4 ? T.warning : T.red;
}

// ── OLED Meter for Conditions ──────────────────────────────────────────────
function OledMeter({ value, label, tone }: { value: number, label: string, tone: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: tone, textShadow: `0 0 8px ${tone}60` }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: tone, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 8px ${tone}` }} />
      </div>
    </div>
  );
}

// ── Dossier Data Point ──────────────────────────────────────────────────
function DataPoint({ icon: Icon, label, value, highlight }: { icon: any, label: string, value: React.ReactNode, highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: highlight ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)', color: highlight ? T.gold : T.muted }}>
        <Icon size={16} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: T.faint, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: highlight ? T.gold : T.ivory, fontWeight: highlight ? 700 : 500, fontFamily: highlight ? MONO : SANS }}>{value}</div>
      </div>
    </div>
  );
}

export default function NationScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, ledger }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  
  const { data: billsData } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const activePolicy = billsData?.activePolicy;
  const conditions = overview?.conditions;

  const policyPlatform = activePolicy?.policy_platform || {};
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: SANS }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />

      {isLocked ? (
        <GlassPanel title={<><Shield size={14} /> Locked</>}>
          <div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name || 'This state'} is not yet open for political activity.</div>
        </GlassPanel>
      ) : (
        <>
          {/* ── OLED HERO HEADER ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 20,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: 16,
            padding: '32px 36px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Decorative Grid Background */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ ...stampStyle, marginBottom: 8, color: T.gold, borderColor: 'rgba(255,215,0,0.3)', textShadow: `0 0 10px ${T.goldSoft}` }}>Intelligence Dossier</div>
                <h1 style={{ color: T.ivory, fontSize: 36, fontWeight: 800, fontFamily: "'Outfit', 'Lexend', system-ui", margin: '0 0 4px', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                  Drennia Nation
                </h1>
                <div style={{ fontFamily: MONO, fontSize: 12, color: T.blueLine, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Macro-Economic & Political Health Overview
                </div>
              </div>

              {/* OLED Metric Blocks (Demographics) */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, 
                  padding: '16px 20px', minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Population
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: T.ivory, marginTop: 8, textShadow: `0 0 12px rgba(255,255,255,0.2)` }}>
                    {overview?.activeState?.population != null ? (Number(overview.activeState.population) / 1000000).toFixed(1) : '2.4'}<span style={{ fontSize: 14, color: T.muted }}>M</span>
                  </div>
                </div>
                
                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, 
                  padding: '16px 20px', minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Voters
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: T.ivory, marginTop: 8, textShadow: `0 0 12px rgba(255,255,255,0.2)` }}>
                    {overview?.activeState?.registered_voters != null ? (Number(overview.activeState.registered_voters) / 1000000).toFixed(1) : '1.6'}<span style={{ fontSize: 14, color: T.muted }}>M</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── NATIONAL PROFILE GRID ── */}
          <GlassPanel title={<><Map size={14} /> National Profile</>}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <p style={{ color: T.text, fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
                  The <strong>Nation of Drennia</strong> is a constitutional monarchy situated in the northern industrial corridor. Renowned for its deep-water ports, sprawling manufacturing hubs, and rich labor history, Drennia balances heavy industry with a modernizing service economy. While the Monarch serves as the ceremonial head of state, political power is wielded by the elected National Parliament and fiercely independent regional states.
                </p>
              </div>
              <div style={{ flex: '1 1 300px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                <DataPoint icon={Building2} label="Capital" value="Drennport" />
                <DataPoint icon={Crown} label="Government" value="Const. Monarchy" />
                <DataPoint icon={Landmark} label="Legislature" value="National Parliament" />
                <DataPoint icon={Coins} label="Currency" value="Standard Credit (CR)" />
              </div>
            </div>
          </GlassPanel>

          {/* ── 2-COLUMN DASHBOARD ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Conditions Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <GlassPanel title={<><Activity size={14} /> National Conditions</>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <OledMeter label="Prosperity" value={conditions?.prosperity ?? 5} tone={condTone(conditions?.prosperity ?? 5)} />
                  <OledMeter label="Jobs & Employment" value={conditions?.jobs ?? 5} tone={condTone(conditions?.jobs ?? 5)} />
                  <OledMeter label="Public Order" value={conditions?.order ?? 5} tone={condTone(conditions?.order ?? 5)} />
                  <OledMeter label="Social Cohesion" value={conditions?.cohesion ?? 5} tone={condTone(conditions?.cohesion ?? 5)} />
                  <OledMeter label="Budget Health" value={conditions?.budget ?? 5} tone={condTone(conditions?.budget ?? 5)} />
                </div>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.05)`, color: T.muted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
                  These metrics drift over time toward targets defined by the governing coalition's platform and enacted laws.
                </div>
              </GlassPanel>
            </div>

            {/* Governance & Platform Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <GlassPanel title={<><Landmark size={14} /> Active Laws & Governance</>}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <DataPoint 
                    icon={Coins} 
                    label="Corporate Tax Rate" 
                    value={`${(
                      (activePolicy?.active_policies?.taxation === 'tax_haven' ? 0.10 :
                       activePolicy?.active_policies?.taxation === 'flat_tax' ? 0.15 :
                       activePolicy?.active_policies?.taxation === 'progressive' ? 0.25 :
                       0.20) * 100).toFixed(0)}%`} 
                    highlight 
                  />
                  <DataPoint 
                    icon={Building2} 
                    label="Labor Laws" 
                    value={(activePolicy?.active_policies?.labor || 'standard').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} 
                    highlight 
                  />
                </div>
              </GlassPanel>

              <GlassPanel title={<><Target size={14} /> Legislated Platform</>} flex={1}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {PILLARS.map((p) => {
                    const v = policyPlatform[p.axis];
                    if (v === undefined) return null;
                    return (
                      <div key={p.axis}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ color: T.text, fontSize: 13 }}>{p.name}</span>
                          <span style={{ color: T.gold, fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{v}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${v}%`, height: '100%', background: T.gold, boxShadow: `0 0 8px ${T.gold}80` }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(policyPlatform).length === 0 && (
                    <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                      No permanent platform shifts have been legislated. The state follows the governing coalition's baseline platform.
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* ── INTELLIGENCE FEED (Dispatch) ── */}
          <GlassPanel title={<><Activity size={14} /> Live Intelligence Feed</>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '-12px' }}>
              {safeLedger.slice(0, 5).map((l: any, i: number) => (
                <div key={l.id || i} style={{ 
                  display: 'flex', gap: 16, padding: '16px 12px', 
                  borderBottom: i < Math.min(safeLedger.length - 1, 4) ? `1px solid rgba(255,255,255,0.05)` : 'none' 
                }}>
                  <div style={{ color: T.gold, fontFamily: MONO, fontSize: 12, flexShrink: 0, marginTop: 2, fontWeight: 600, opacity: 0.8, width: 60 }}>
                    {formatGameDateShort(l.arc)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14, fontFamily: HEADING }}>{l.headline}</div>
                    <div style={{ color: T.text, fontSize: 13, marginTop: 6, lineHeight: 1.5, opacity: 0.8 }}>{l.body}</div>
                  </div>
                </div>
              ))}
              {safeLedger.length === 0 && (
                <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                  No recent intelligence dispatches intercepted.
                </div>
              )}
            </div>
          </GlassPanel>

        </>
      )}
    </div>
  );
}
