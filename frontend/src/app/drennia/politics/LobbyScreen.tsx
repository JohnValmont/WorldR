'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi, companyApi } from '@/lib/api';
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
  const { data: companiesData } = useSWR('myCompanies', () => companyApi.getMy().then(r => r.data).catch(() => []));
  const { data: petitionsData, mutate: mutatePetitions } = useSWR('myPetitions', () => politicsApi.getMyPetitions().catch(() => []));
  
  const [donateParty, setDonateParty] = useState('');
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [petCompany, setPetCompany] = useState('');
  const [petParty, setPetParty] = useState('');
  const [petCategory, setPetCategory] = useState('');
  const [petOption, setPetOption] = useState('');
  const [petFunds, setPetFunds] = useState(10000);

  const partyList: any[] = Array.isArray(parties) ? parties : [];
  const tenders: any[] = Array.isArray(tenderData) ? tenderData : (tenderData?.tenders || []);
  const companies: any[] = Array.isArray(companiesData) ? companiesData : [];
  const petitions: any[] = Array.isArray(petitionsData) ? petitionsData : [];

  async function donate() {
    if (!donateParty || amount < 100) return;
    try { setBusy(true); setErr(null); setMsg(null); await politicsApi.donateToParty(donateParty, amount); setMsg('Donation recorded.'); if (onRefresh) await onRefresh(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Donation failed'); } finally { setBusy(false); }
  }

  async function submitPetition() {
    if (!petCompany || !petParty || !petCategory || !petOption || petFunds < 0) return;
    try { 
      setBusy(true); setErr(null); setMsg(null); 
      await politicsApi.petitionParty({ partyId: petParty, companyId: petCompany, policyCategory: petCategory, desiredOption: petOption, offeredFunds: petFunds });
      setMsg('Petition sent.'); 
      mutatePetitions();
      if (onRefresh) await onRefresh(); 
    }
    catch (e: any) { setErr(e?.response?.data?.error || e?.response?.data?.message || 'Petition failed'); } finally { setBusy(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.ivory, fontSize: 14, outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <JurisdictionSwitcher selected={selectedJurisdictionId} onChange={onJurisdictionChange} meta={jurisdictionMeta} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Stamp style={{ color: T.gold }}>LOBBY & TENDERS</Stamp>
        <h1 style={{ color: T.ivory, fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Lobbying — {jurisdiction?.name}
        </h1>
        <div style={{ color: T.faint, fontSize: 13 }}>
          Where cash, companies, and the Council meet — donate, petition, and bid for state contracts.
        </div>
      </div>

      {isLocked ? (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={T.muted} />
          <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 14 }}>The {jurisdiction?.name} lobby is not yet open.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            <Panel title="CITIZEN DONATION">
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Donate personal cash to a party to build political influence.</div>
              <select value={donateParty} onChange={(e) => setDonateParty(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                <option value="">Select a party—</option>
                {partyList.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.abbreviation ? `[${p.abbreviation}]` : ''}</option>)}
              </select>
              <input type="number" value={amount} min={100} step={100} onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 100))} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={donate} disabled={busy || !donateParty || amount < 100} style={{ width: '100%', padding: '11px', borderRadius: 4, cursor: busy || !donateParty || amount < 100 ? 'not-allowed' : 'pointer', opacity: busy || !donateParty || amount < 100 ? 0.5 : 1, background: T.gold, color: '#1a1408', border: 'none', fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12.5 }}>{busy ? 'Sending\u2026' : 'Make Donation'}</button>
              {msg && <div style={{ color: T.mint, fontSize: 12, marginTop: 8 }}>{msg}</div>}
              {err && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{err}</div>}
            </Panel>

            <Panel title="CORPORATE PETITION">
              {companies.length === 0 ? (
                <div style={{ color: T.faint, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '20px 8px' }}>
                  You must own a manufacturing company headquartered in {jurisdiction?.name} to petition the government.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ color: T.muted, fontSize: 13 }}>Offer lobbying funds to a political party in exchange for a policy commitment.</div>
                  <select value={petCompany} onChange={(e) => setPetCompany(e.target.value)} style={inputStyle}>
                    <option value="">Select Company—</option>
                    {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={petParty} onChange={(e) => setPetParty(e.target.value)} style={inputStyle}>
                    <option value="">Select Target Party—</option>
                    {partyList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <select value={petCategory} onChange={(e) => { setPetCategory(e.target.value); setPetOption(''); }} style={inputStyle}>
                      <option value="">Policy Area—</option>
                      <option value="taxation">Taxation</option>
                      <option value="labour">Labour</option>
                      <option value="trade">Trade</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="environment">Environment</option>
                      <option value="education">Education</option>
                    </select>
                    <select value={petOption} onChange={(e) => setPetOption(e.target.value)} style={inputStyle} disabled={!petCategory}>
                      <option value="">Desired Policy—</option>
                      <option value="low">Low / Deregulated</option>
                      <option value="mid">Moderate / Balanced</option>
                      <option value="high">High / State-led</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Offered Funds (from Company Treasury)</div>
                    <input type="number" value={petFunds} min={0} step={5000} onChange={(e) => setPetFunds(Math.max(0, Number(e.target.value) || 0))} style={inputStyle} />
                  </div>
                  <button onClick={submitPetition} disabled={busy || !petCompany || !petParty || !petCategory || !petOption || petFunds < 0} style={{ width: '100%', padding: '11px', borderRadius: 4, cursor: busy || !petCompany || !petParty || !petCategory || !petOption || petFunds < 0 ? 'not-allowed' : 'pointer', opacity: busy || !petCompany || !petParty || !petCategory || !petOption || petFunds < 0 ? 0.5 : 1, background: T.gold, color: '#1a1408', border: 'none', fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12.5 }}>
                    {busy ? 'Sending\u2026' : 'Submit Petition'}
                  </button>
                  
                  {petitions.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ color: T.ivory, fontSize: 12, fontWeight: 700 }}>ACTIVE PETITIONS</div>
                      {petitions.map((p: any) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: 8 }}>
                          <div>
                            <div style={{ color: T.text, fontSize: 12 }}>{p.company_name} → {p.party_name}</div>
                            <div style={{ color: T.faint, fontSize: 11 }}>{p.policy_category} ({p.desired_option})</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div style={{ color: p.status === 'accepted' ? T.mint : p.status === 'rejected' ? T.red : p.status === 'fulfilled' ? T.blue : p.status === 'failed' ? T.red : T.gold, fontSize: 11, textTransform: 'uppercase' }}>{p.status}</div>
                            <div style={{ color: T.muted, fontSize: 11 }}>${Number(p.offered_funds).toLocaleString('en-US')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
