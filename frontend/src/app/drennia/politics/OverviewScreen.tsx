'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, stampStyle } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';

interface Props {
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  selectedJurisdictionId: string;
  onNavigate: (s: PoliticsSection) => void;
  onRefresh: () => void;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={stampStyle}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Gauge({ pct }: { pct: number | null }) {
  const r = 54, C = 2 * Math.PI * r, arc = C * 0.75;
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const fg = arc * (v / 100);
  return (
    <div style={{ position: 'relative', width: 150, height: 150 }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} fill="none" stroke={T.border} strokeWidth="10" strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 75 75)" />
        <circle cx="75" cy="75" r={r} fill="none" stroke={T.gold} strokeWidth="10" strokeDasharray={`${fg} ${C}`} strokeLinecap="round" transform="rotate(135 75 75)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...stampStyle, color: T.muted }}>Support</div>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: T.ivory }}>{pct == null ? '\u2014' : `${pct.toFixed(1)}%`}</div>
      </div>
    </div>
  );
}

function NavButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
        fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase',
        background: primary ? T.gold : T.panel2,
        color: primary ? '#1a1408' : T.text,
        border: `1px solid ${primary ? T.gold : T.border}`,
      }}
    >
      {label}
    </button>
  );
}

export default function OverviewScreen({ overview, character, parties, myAp, selectedJurisdictionId, onNavigate, onRefresh }: Props) {
  const jid = selectedJurisdictionId;
  const { data: bills = [] } = useSWR(['ov-bills', jid], () => politicsApi.getBills(jid).catch(() => []));
  const { data: ledger = [] } = useSWR(['ov-ledger', jid], () => politicsApi.getLedger(8, jid).catch(() => []));
  const [busy, setBusy] = useState<string | null>(null);

  const jMeta = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.ironvale;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;
  const support: number | null = myParty
    ? (myParty.popularity ?? myParty.approval ?? myParty.projected_share ?? null)
    : null;

  const billList = Array.isArray(bills) ? bills : [];
  const floorBill = billList.find((b: any) => {
    const s = String(b?.status || '').toLowerCase();
    return s.includes('floor') || s.includes('open') || s.includes('voting');
  }) || billList[0];

  const ayes = floorBill?.ayes ?? floorBill?.votes_for ?? floorBill?.aye_count;
  const nays = floorBill?.nays ?? floorBill?.votes_against ?? floorBill?.nay_count;

  async function vote(id: string, v: 'aye' | 'nay') {
    try { setBusy(v); await politicsApi.voteBill(id, v); await onRefresh(); } catch { /* surfaced elsewhere */ } finally { setBusy(null); }
  }

  const events = Array.isArray(ledger) ? ledger : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={stampStyle}>This Month · {jMeta.name}</div>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0', letterSpacing: '-0.01em' }}>
          {myParty ? myParty.name : 'Found a party to begin'}
        </h1>
      </div>

      {!myParty && (
        <Panel title="Get Started">
          <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
            You have no active party. Found a movement, choose your Creed, and stand for {jMeta.name}.
          </div>
          <NavButton label="Found a Party" primary onClick={() => onNavigate('party')} />
        </Panel>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <Panel title="Standing">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Gauge pct={support} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ ...stampStyle, color: T.faint }}>Action Points</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: T.gold }}>{myAp?.current_ap ?? 0}</div>
              </div>
              <div>
                <div style={{ ...stampStyle, color: T.faint }}>Seats (target)</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: T.ivory }}>{jMeta.seats}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="On The Floor" action={<NavButton label="Legislature" onClick={() => onNavigate('legislature')} />}>
          {floorBill ? (
            <div>
              <div style={{ color: T.ivory, fontSize: 16, fontWeight: 600 }}>{floorBill.title || floorBill.name || 'Bill on the floor'}</div>
              <div style={{ display: 'flex', gap: 16, margin: '10px 0 14px', fontFamily: MONO, fontSize: 12 }}>
                <span style={{ color: T.mint }}>Aye {ayes ?? '\u2014'}</span>
                <span style={{ color: T.red }}>Nay {nays ?? '\u2014'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <NavButton label={busy === 'aye' ? '\u2026' : 'Vote Aye'} primary onClick={() => floorBill?.id && vote(floorBill.id, 'aye')} />
                <NavButton label={busy === 'nay' ? '\u2026' : 'Vote Nay'} onClick={() => floorBill?.id && vote(floorBill.id, 'nay')} />
              </div>
            </div>
          ) : (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>No bills on the floor this cycle.</div>
          )}
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <Panel title="Chronicle">
          {events.length === 0 ? (
            <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>No recent activity.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.slice(0, 6).map((e: any, i: number) => (
                <div key={e.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: T.gold, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ color: T.text, fontSize: 13, lineHeight: 1.5 }}>{e.summary || e.message || e.description || e.kind || 'Event'}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recommended Move">
          <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
            {myParty
              ? 'Read the electorate, then campaign where no rival stands — owning open ground beats crowding a popular bloc.'
              : 'Your first move: found a party and pick the Creed that matches how you want to govern.'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <NavButton label={myParty ? 'View Electorate' : 'Found a Party'} primary onClick={() => onNavigate(myParty ? 'elections' : 'party')} />
            <NavButton label="Party" onClick={() => onNavigate('party')} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
