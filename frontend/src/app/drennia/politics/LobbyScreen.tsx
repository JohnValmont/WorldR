'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
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

export default function LobbyScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const { data: tenderData } = useSWR(isLocked ? null : ['tenders', selectedJurisdictionId], () => politicsApi.getTenders(selectedJurisdictionId).catch(() => null));
  const [donateParty, setDonateParty] = useState('');
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const partyList: any[] = Array.isArray(parties) ? parties : [];
  const tenders: any[] = Array.isArray(tenderData) ? tenderData : (tenderData?.tenders || []);

  async function donate() {
    if (!donateParty || amount <= 0) return;
    try { setBusy(true); setErr(null); setMsg(null); await politicsApi.donateToParty(donateParty, amount); setMsg('Donation recorded.'); if (onRefresh) await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Donation failed'); } finally { setBusy(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.ivory, fontSize: 14, outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Stamp style={{ color: T.gold }}>LOBBY & TENDERS</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
          Lobbying · {jurisdiction?.name}
        </h1>
        <div style={{ color: T.faint, fontSize: 13 }}>
          Where cash, companies, and the Council meet — donate, petition, and bid for state contracts.
        </div>
      </div>

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} lobby is not yet open.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <Panel title="CITIZEN DONATION">
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Donate personal cash to a party to build political influence.</div>
              <select value={donateParty} onChange={(e) => setDonateParty(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                <option value="">Select a party…</option>
                {partyList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" value={amount} min={100} step={100} onChange={(e) => setAmount(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={donate} disabled={busy || !donateParty} style={{ width: '100%', padding: '11px', borderRadius: 4, cursor: busy || !donateParty ? 'not-allowed' : 'pointer', opacity: busy || !donateParty ? 0.5 : 1, background: T.gold, color: '#1a1408', border: 'none', fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12.5 }}>{busy ? 'Sending\u2026' : 'Make Donation'}</button>
              {msg && <div style={{ color: T.mint, fontSize: 12, marginTop: 8 }}>{msg}</div>}
              {err && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{err}</div>}
            </Panel>

            <Panel title="CORPORATE PETITION">
              <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '20px 8px' }}>
                You must own a manufacturing company headquartered in {jurisdiction?.name} to petition the government.
              </div>
            </Panel>
          </div>

          <Panel title="GOVERNMENT PROCUREMENT TENDERS">
            {tenders.length === 0 ? (
              <div style={{ color: T.faint, fontStyle: 'italic' }}>No open tenders at this time.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tenders.map((t: any, i: number) => (
                  <div key={t.id || i} style={{ display: 'flex', justifyContent: 'space-between', background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 12 }}>
                    <span style={{ color: T.text, fontSize: 13 }}>{t.title || t.name || t.good || 'Tender'}</span>
                    <span style={{ color: T.gold, fontFamily: MONO, fontSize: 13 }}>{t.quantity ? `${t.quantity} units` : (t.value ? `$${Number(t.value).toLocaleString('en-US')}` : '')}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
