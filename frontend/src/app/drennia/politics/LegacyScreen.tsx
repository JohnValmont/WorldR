'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { Stamp, Meter, Panel, StatTile, HoverData } from './_components/DeskUI';

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

export default function LegacyScreen({ character }: Props) {
  const { data: legacy, error, isLoading } = useSWR(
    character?.id ? ['legacy', character.id] : null,
    () => politicsApi.getLegacy('me')
  );

  if (isLoading) return <div style={{ color: T.ivory, fontFamily: MONO, fontSize: 12 }}>Loading records...</div>;
  if (error) return <div style={{ color: T.red, fontFamily: MONO, fontSize: 12 }}>Error loading legacy records.</div>;
  if (!legacy) return null;

  const { scores, recentEvents } = legacy;
  let unlocked: string[] = [];
  try {
    unlocked = Array.isArray(scores?.unlocked_benefits) 
      ? scores.unlocked_benefits 
      : JSON.parse(scores?.unlocked_benefits || '[]');
  } catch (e) {
    unlocked = [];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${T.borderSoft}`, paddingBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: T.gold, textTransform: 'uppercase', margin: '0 0 4px 0' }}>CONFIDENTIAL RECORD</h2>
          <h1 style={{ fontFamily: HEADING, fontSize: 24, fontWeight: 300, color: T.ivory, margin: 0, letterSpacing: '-0.02em' }}>Career & Legacy</h1>
        </div>
        <StatTile label="TOTAL SCORE" value={scores?.total ?? 0} tone={T.gold} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Panel title="LIFETIME ACHIEVEMENTS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <HoverData tooltip={<div style={{ fontSize: 12, color: T.text, fontFamily: SANS }}>Score derived from arcs spent as an active party leader or head of state.</div>}>
               <Meter label="Longevity" value={scores?.longevity ?? 0} tone={T.blue} />
             </HoverData>
             <HoverData tooltip={<div style={{ fontSize: 12, color: T.text, fontFamily: SANS }}>Score derived from successful elections, expanding vote share, and forming majorities.</div>}>
               <Meter label="Electoral" value={scores?.electoral ?? 0} tone={T.gold} />
             </HoverData>
             <HoverData tooltip={<div style={{ fontSize: 12, color: T.text, fontFamily: SANS }}>Score derived from avoiding crises and resolving scandals smoothly. Drops sharply upon failure.</div>}>
               <Meter label="Scandal" value={scores?.scandal ?? 0} tone={T.red} />
             </HoverData>
             <HoverData tooltip={<div style={{ fontSize: 12, color: T.text, fontFamily: SANS }}>Score derived from GDP growth and economic stability while in power.</div>}>
               <Meter label="Economic" value={scores?.economic ?? 0} tone={T.mint} />
             </HoverData>
          </div>
        </Panel>

        <Panel title="UNLOCKED PERKS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LEGACY_BENEFITS_META.map(b => {
              const has = unlocked.includes(b.key);
              return (
                <div key={b.key} style={{ 
                  padding: 12, 
                  background: has ? T.goldSoft : T.bg, 
                  border: `1px solid ${has ? T.goldLine : T.border}`, 
                  borderRadius: 4 
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: has ? T.gold : T.faint, fontWeight: has ? 700 : 400, marginBottom: 4 }}>
                    {b.name}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: has ? T.ivory : T.muted }}>
                    {b.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="HISTORICAL LOG">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.isArray(recentEvents) && recentEvents.map((ev: any) => (
            <div key={ev.id} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
              <div style={{ width: 80, flexShrink: 0, fontFamily: MONO, fontSize: 11, color: T.faint }}>
                ARC {ev.arc}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: ev.score_delta > 0 ? T.mint : (ev.score_delta < 0 ? T.red : T.blue), marginBottom: 4 }}>
                  {ev.headline} ({ev.score_delta > 0 ? '+' : ''}{ev.score_delta})
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: T.muted }}>
                  {ev.narrative}
                </div>
              </div>
            </div>
          ))}
          {(!Array.isArray(recentEvents) || recentEvents.length === 0) && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>No significant events recorded.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}
