'use client';
import React from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Panel, Stamp } from './_components/DeskUI';
import { Shield } from 'lucide-react';

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

const PALETTE = ['#d4a24a', '#5f8fbf', '#5fbf8f', '#c8624f', '#9b7fbf', '#c9a24a', '#7fbfb0'];

export default function AssemblyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, parties }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.ironvale;
  const { data } = useSWR(isLocked ? null : ['council', selectedJurisdictionId], () => politicsApi.getCouncil(selectedJurisdictionId).catch(() => null));

  const partySeats: any[] = Array.isArray(data?.partySeats) ? data.partySeats.filter((p: any) => p.seats > 0) : [];
  const totalSeats = partySeats.reduce((s: number, p: any) => s + Number(p.seats || 0), 0);
  const premier = data?.premier;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Stamp style={{ color: T.gold }}>THE ASSEMBLY</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
          {jModel.tier === 'state' ? 'State Assembly' : 'National Parliament'} of {jModel.name}
        </h1>
        <div style={{ color: T.faint, fontSize: 13 }}>
          {jModel.seats} seats · {jModel.majority} for a majority
        </div>
      </div>

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} assembly is not yet open.</div>
        </div>
      ) : partySeats.length === 0 ? (
        <Panel title="THE CHAMBER"><div style={{ color: T.faint, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>The chamber is empty. Seats are filled at the next election.</div></Panel>
      ) : (
        <Panel title={`COMPOSITION — ${totalSeats} SEATS`} accent>
          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {partySeats.map((p: any, i: number) => (
              <div key={p.partyId || i} title={`${p.name}: ${p.seats}`} style={{ width: `${(p.seats / totalSeats) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {partySeats.map((p: any, i: number) => (
              <div key={p.partyId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                  <span style={{ color: T.text, fontSize: 13 }}>{p.name} {p.abbreviation ? <span style={{ color: T.faint, fontSize: 11, fontFamily: MONO, textTransform: 'uppercase', marginLeft: 4 }}>[{p.abbreviation}]</span> : null}</span>
                </div>
                <span style={{ color: T.ivory, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{p.seats}</span>
              </div>
            ))}
          </div>
          {premier && <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}`, color: T.muted, fontSize: 13 }}>Premier: <span style={{ color: T.gold, fontWeight: 600 }}>{premier.name || premier}</span></div>}
        </Panel>
      )}
    </div>
  );
}
