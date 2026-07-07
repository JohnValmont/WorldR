'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, stampStyle } from './_lib/theme';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';

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

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={stampStyle}>{title}</div>{action}
      </div>
      {children}
    </div>
  );
}
function Btn({ label, onClick, primary, disabled }: { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '8px 14px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 12, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase', background: primary ? T.gold : T.panel2, color: primary ? '#1a1408' : T.text, border: `1px solid ${primary ? T.gold : T.border}` }}>{label}</button>
  );
}

export default function LegislatureScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data, mutate } = useSWR(isLocked ? null : ['bills', selectedJurisdictionId], () => politicsApi.getBills(selectedJurisdictionId).catch(() => null));
  const [rate, setRate] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const bills: any[] = Array.isArray(data?.bills) ? data.bills : [];
  const activePolicy = data?.activePolicy;
  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  async function refresh() { await mutate(); if (onRefresh) await onRefresh(); }
  async function propose() {
    try { setBusy('propose'); setErr(null); await politicsApi.proposeBill('industry_tax', { rate: rate / 100 }, selectedJurisdictionId); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to propose'); } finally { setBusy(null); }
  }
  async function vote(id: string, v: 'aye' | 'nay') {
    try { setBusy(id + v); setErr(null); await politicsApi.voteBill(id, v); await refresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Failed to vote'); } finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      <div>
        <div style={stampStyle}>Legislature · {jurisdiction?.name}</div>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 700, margin: '6px 0 0' }}>The Chamber</h1>
      </div>

      {isLocked ? (
        <Panel title="Locked"><div style={{ color: T.faint, fontStyle: 'italic' }}>{jurisdiction?.name} is not yet open.</div></Panel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Panel title="Active Policies">
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...stampStyle, color: T.faint }}>Industry Tax Rate</div>
                <div style={{ color: T.ivory, fontSize: 26, fontWeight: 700, fontFamily: MONO }}>{activePolicy ? (Number(activePolicy.industry_tax_rate) * 100).toFixed(1) : '0.0'}%</div>
                <div style={{ color: T.faint, fontSize: 11, marginTop: 2 }}>Deducted from manufacturing net profits at month-end.</div>
              </div>
              <div style={{ opacity: 0.5 }}>
                <div style={{ ...stampStyle, color: T.faint }}>Infrastructure Level</div>
                <div style={{ color: T.ivory, fontSize: 18, fontWeight: 700 }}>Level {activePolicy?.infrastructure_level ?? 1}</div>
              </div>
            </Panel>

            {myParty && (
              <Panel title="Propose · Tax & Spending">
                <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Set the industry tax rate. Sends to committee, then the floor.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <input type="range" min={0} max={60} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ flex: 1, accentColor: T.gold }} />
                  <span style={{ color: T.gold, fontFamily: MONO, fontSize: 16, fontWeight: 700, minWidth: 52, textAlign: 'right' }}>{rate}%</span>
                </div>
                <Btn label={busy === 'propose' ? 'Proposing\u2026' : 'Propose Bill'} primary onClick={propose} disabled={busy === 'propose'} />
              </Panel>
            )}
          </div>

          <Panel title="On The Floor">
            {bills.length === 0 ? (
              <div style={{ color: T.faint, fontStyle: 'italic' }}>No bills have been proposed this cycle.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bills.map((b: any) => (
                  <div key={b.id} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 14 }}>
                    <div style={{ color: T.ivory, fontWeight: 600, fontSize: 14 }}>{b.title || b.name || 'Bill'}</div>
                    <div style={{ display: 'flex', gap: 14, margin: '8px 0 12px', fontFamily: MONO, fontSize: 12 }}>
                      <span style={{ color: T.mint }}>Aye {b.ayes ?? b.votes_for ?? 0}</span>
                      <span style={{ color: T.red }}>Nay {b.nays ?? b.votes_against ?? 0}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn label={busy === b.id + 'aye' ? '\u2026' : 'Aye'} primary onClick={() => vote(b.id, 'aye')} disabled={!!busy} />
                      <Btn label={busy === b.id + 'nay' ? '\u2026' : 'Nay'} onClick={() => vote(b.id, 'nay')} disabled={!!busy} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
      {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
    </div>
  );
}
