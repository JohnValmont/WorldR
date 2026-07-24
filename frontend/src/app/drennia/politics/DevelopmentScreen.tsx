'use client';
import React from 'react';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { Activity, Target, Shield, Landmark, Scale, Briefcase, Users, Eye, Globe } from 'lucide-react';
import { formatGameDateShort } from '@/lib/calendar';

interface Props {
  overview: any;
  jurisdictionMeta: any;
}

// ── Glass Panel Component (Shared visual language) ──
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
        padding: '10px 14px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        {title}
      </div>
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── Condition colour scale (0–100) ──────────────────────────────────────────
function condTone(v: number) {
  return v >= 65 ? T.mint : v >= 40 ? T.warning : T.red;
}

function StatMeter({ value, label, icon: Icon }: { value: number, label: string, icon: any }) {
  const tone = condTone(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} color={tone} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: tone }}>{value.toFixed(1)}</span>
      </div>
      
      {/* LED Track */}
      <div style={{ height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: `${value}%`,
          background: tone,
          boxShadow: `0 0 8px ${tone}`,
          transition: 'width 0.4s ease-out'
        }} />
      </div>
    </div>
  );
}

export default function DevelopmentScreen({ overview, jurisdictionMeta }: Props) {
  if (!overview) return null;

  const state = overview.activeState;
  const conditions = overview.conditions;

  if (!conditions) {
    return <div style={{ color: T.faint, padding: 40, textAlign: 'center', fontFamily: MONO }}>No development data available.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid rgba(255,255,255,0.1)`, paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: HEADING, fontSize: 32, margin: '0 0 4px', color: '#FFF' }}>
            National Development
          </h1>
          <p style={{ fontFamily: SANS, fontSize: 15, margin: 0, color: T.faint }}>
            Macro-economy, infrastructure, and institutional capacity for {jurisdictionMeta.name}.
          </p>
        </div>
        <div style={stampStyle}>
          ARC {overview.cycle?.electionArc ?? '?'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <GlassPanel title={<><Briefcase size={14} /> Economy & Prosperity</>} accent={T.blue}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatMeter value={conditions.prosperity} label="Prosperity" icon={Activity} />
            <StatMeter value={conditions.cost_of_living} label="Cost of Living" icon={Landmark} />
            <StatMeter value={conditions.fiscal_health} label="Fiscal Health" icon={Briefcase} />
          </div>
        </GlassPanel>

        <GlassPanel title={<><Users size={14} /> Society & Welfare</>} accent={T.mint}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatMeter value={conditions.equity} label="Equity" icon={Scale} />
            <StatMeter value={conditions.human_development} label="Human Development" icon={Target} />
            <StatMeter value={conditions.order_safety} label="Order & Safety" icon={Shield} />
          </div>
        </GlassPanel>

        <GlassPanel title={<><Landmark size={14} /> State & Governance</>} accent={T.warning}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatMeter value={conditions.freedom_rights} label="Freedom & Rights" icon={Eye} />
            <StatMeter value={conditions.bureaucracy} label="Bureaucratic Capacity" icon={Landmark} />
            <StatMeter value={conditions.global_standing} label="Global Standing" icon={Globe} />
          </div>
        </GlassPanel>
      </div>

      <GlassPanel title="Key Indicators">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginBottom: 4 }}>RAW GDP</div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: T.mint }}>${(Number(state?.raw_gdp || 0)).toLocaleString('en-US')} M</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginBottom: 4 }}>POPULATION</div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: T.blue }}>{(Number(state?.raw_population || 0)).toLocaleString('en-US')}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginBottom: 4 }}>CIVIL SERVICE STANCE</div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: T.warning, textTransform: 'capitalize' }}>{state?.civil_service_stance?.replace('_', ' ') || 'Neglect'}</div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
