'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { Shield, Medal, Trophy, Star, History, ArrowUpRight, ArrowDownRight, CircleDot } from 'lucide-react';

interface Props {
  character: any;
}

const LEGACY_BENEFITS_META = [
  { key: 'elder_statesman', name: 'Elder Statesman', desc: 'Outreach & Rally costs 1 less AP/PC' },
  { key: 'party_institution', name: 'Party Institution', desc: 'Party gains +5 base popularity' },
  { key: 'coalition_architect', name: 'Coalition Architect', desc: 'Coalitions need 3% less majority' },
  { key: 'untouchable', name: 'Untouchable', desc: 'Scandals 25% less likely' },
  { key: 'media_legend', name: 'Media Legend', desc: 'New media relations seed 10 pts higher' },
];

// ── Glass Panel Component ──
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
      {title && (
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── OLED Progress Meter ──
function OledMeter({ label, value, tone, max = 100 }: { label: string; value: number; tone: string; max?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: isHovered ? T.ivory : T.text, fontSize: 13, fontWeight: 600, transition: 'color 0.2s ease' }}>{label}</span>
        <span style={{ color: tone, fontFamily: MONO, fontSize: 14, fontWeight: 700, textShadow: isHovered ? `0 0 12px ${tone}60` : 'none', transition: 'all 0.2s ease' }}>
          {value.toLocaleString()} <span style={{ color: T.muted, fontSize: 10, fontWeight: 400 }}>PTS</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.5)' }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          background: tone, 
          boxShadow: `0 0 12px ${tone}80`,
          borderRadius: 3,
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
        }} />
      </div>
    </div>
  );
}

export default function LegacyScreen({ character }: Props) {
  const { data: legacy, error, isLoading } = useSWR(
    character?.id ? ['legacy', character.id] : null,
    () => politicsApi.getLegacy(character.id)
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: T.muted, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em' }}>
        <CircleDot size={20} className="animate-spin" style={{ marginRight: 12 }} /> 
        DECRYPTING RECORDS...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: '24px', background: `${T.red}15`, border: `1px solid ${T.red}40`, color: T.red, borderRadius: 8, fontSize: 13, fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={16} /> ERROR RETRIEVING LEGACY FILE.
      </div>
    );
  }
  if (!legacy) return null;

  const { scores, rank, benefits, records } = legacy;
  
  // Safe JSON Parsing for unlocked benefits
  let unlocked: string[] = [];
  try {
    if (Array.isArray(scores?.unlocked_benefits)) {
      unlocked = scores.unlocked_benefits;
    } else if (typeof scores?.unlocked_benefits === 'string' && scores.unlocked_benefits !== 'undefined') {
      unlocked = JSON.parse(scores.unlocked_benefits);
      if (!Array.isArray(unlocked)) unlocked = [];
    }
  } catch (e) {
    unlocked = [];
  }

  // Calculate highest sub-score to set the max for the meters dynamically
  const maxScore = Math.max(100, scores?.longevity ?? 0, scores?.electoral ?? 0, scores?.scandal ?? 0, scores?.economic ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, fontFamily: SANS }}>
      
      {/* ── OLED HERO HEADER ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 24,
        background: 'linear-gradient(135deg, rgba(30,20,0,0.8) 0%, rgba(10,12,16,0.95) 100%)',
        border: `1px solid rgba(255,215,0,0.1)`,
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${T.gold} 1px, transparent 1px), linear-gradient(90deg, ${T.gold} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...stampStyle, color: T.gold, fontSize: 11, letterSpacing: '0.15em', borderColor: 'rgba(255,215,0,0.3)' }}>CONFIDENTIAL DOSSIER</div>
            <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: HEADING, margin: 0, letterSpacing: '-0.02em', textShadow: `0 0 20px ${T.gold}40` }}>
              Career <span style={{ color: T.muted, fontWeight: 400 }}>&amp; Legacy</span>
            </h1>
            <div style={{ color: T.faint, fontSize: 14, marginTop: 4 }}>
              The permanent historical record of your achievements, perks, and monumental events.
            </div>
          </div>

          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: 4, 
            background: 'rgba(0,0,0,0.4)', padding: '16px 24px', 
            borderRadius: 12, border: `1px solid rgba(255,215,0,0.15)`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 2px 20px rgba(255,215,0,0.05)`
          }}>
            <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lifetime Score</span>
            <span style={{ color: T.gold, fontSize: 32, fontWeight: 800, fontFamily: MONO, textShadow: `0 0 16px ${T.gold}80` }}>
              {(scores?.total ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* LIFETIME ACHIEVEMENTS */}
        <GlassPanel title={<><Trophy size={14} /> Lifetime Achievements</>} accent={T.blueLine}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div title="Score derived from arcs spent as an active party leader or head of state.">
              <OledMeter label="Longevity" value={scores?.longevity ?? 0} tone={T.blueBright} max={maxScore} />
            </div>
            <div title="Score derived from successful elections, expanding vote share, and forming majorities.">
              <OledMeter label="Electoral Success" value={scores?.electoral ?? 0} tone={T.gold} max={maxScore} />
            </div>
            <div title="Score derived from avoiding crises and resolving scandals smoothly. Drops sharply upon failure.">
              <OledMeter label="Crisis & Scandal Management" value={scores?.scandal ?? 0} tone={T.red} max={maxScore} />
            </div>
            <div title="Score derived from GDP growth and economic stability while in power.">
              <OledMeter label="Economic Stewardship" value={scores?.economic ?? 0} tone={T.mint} max={maxScore} />
            </div>
          </div>
        </GlassPanel>

        {/* UNLOCKED PERKS */}
        <GlassPanel title={<><Star size={14} /> Unlocked Perks</>} accent={T.gold}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LEGACY_BENEFITS_META.map(b => {
              const has = unlocked.includes(b.key);
              return (
                <div key={b.key} style={{ 
                  padding: '16px 20px', 
                  background: has ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${has ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.05)'}`, 
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column', gap: 6,
                  transition: 'all 0.2s ease',
                  boxShadow: has ? `inset 0 0 20px rgba(255,215,0,0.02)` : 'none'
                }}>
                  <div style={{ 
                    fontFamily: HEADING, fontSize: 14, 
                    color: has ? T.gold : T.faint, 
                    fontWeight: has ? 700 : 500,
                    textShadow: has ? `0 0 12px ${T.gold}40` : 'none',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    {has ? <Medal size={14} color={T.gold} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1px dashed ${T.border}` }} />}
                    {b.name}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 13, color: has ? T.ivory : T.muted, lineHeight: 1.4, paddingLeft: 22 }}>
                    {b.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* HISTORICAL LOG */}
      <GlassPanel title={<><History size={14} /> Historical Timeline</>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(!Array.isArray(records) || records.length === 0) ? (
            <div style={{ padding: '40px', textAlign: 'center', color: T.faint, fontStyle: 'italic', background: glassPanelStyle.background, border: glassPanelStyle.border, borderRadius: 12 }}>
              No significant historical events recorded yet.
            </div>
          ) : (
            records.map((ev: any, i: number) => {
              const isPositive = ev.score_delta > 0;
              const isNegative = ev.score_delta < 0;
              const tone = isPositive ? T.mint : isNegative ? T.red : T.blueBright;
              const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : CircleDot;

              return (
                <div key={ev.id} style={{ 
                  display: 'flex', 
                  gap: 20, 
                  padding: '20px 0', 
                  borderTop: i > 0 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                  position: 'relative'
                }}>
                  {/* Timeline node */}
                  <div style={{ 
                    width: 80, flexShrink: 0, 
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
                    borderRight: `2px solid rgba(255,255,255,0.1)`, paddingRight: 20,
                    position: 'relative'
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ARC</span>
                    <span style={{ color: T.ivory, fontSize: 16, fontWeight: 700, fontFamily: MONO }}>{ev.arc}</span>
                    
                    {/* Node Dot */}
                    <div style={{ 
                      position: 'absolute', right: -6, top: 12, 
                      width: 10, height: 10, borderRadius: 5, 
                      background: tone, boxShadow: `0 0 10px ${tone}` 
                    }} />
                  </div>

                  {/* Event Content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: T.ivory, fontSize: 16, fontWeight: 700, fontFamily: HEADING }}>
                        {ev.headline}
                      </div>
                      <div style={{ 
                        fontFamily: MONO, fontSize: 12, fontWeight: 700, color: tone,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: `${tone}15`, padding: '4px 8px', borderRadius: 4, border: `1px solid ${tone}40`
                      }}>
                        <Icon size={12} />
                        {isPositive ? '+' : ''}{ev.score_delta} PTS
                      </div>
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
                      {ev.narrative}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
