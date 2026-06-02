'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCompanies, getContracts } from '../../../lib/businessCore';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
  paper: '#1E1A15',
  border: '#2A2630',
  borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
  mint: '#36D399',
  steel: '#4B6382',
  burgundy: '#8F3D3D',
  red: '#B85555',
};

const SECTOR_DEMAND: { sector: string; demand: string; color: string }[] = [
  { sector: 'Shipping & Logistics', demand: 'High',    color: T.mint  },
  { sector: 'Manufacturing',        demand: 'Rising',  color: T.gold  },
  { sector: 'Retail & Consumer',    demand: 'Medium',  color: T.muted },
  { sector: 'Agriculture & Food',   demand: 'Stable',  color: T.steel },
];

const LEDGER_HEADLINES = [
  'Drennport Commercial Bank reports stable liquidity for Q2.',
  'Ironvale suppliers warn of material cost increases.',
  'Westport Bourse volume up — Trade activity strengthens.',
  'Greenmere harvest season expected ahead of schedule.',
  'New registry filings up 12% — Business formation accelerating.',
];

export default function ChroniclePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);
  const [characterName, setCharacterName] = useState('');
  const [playerCash, setPlayerCash] = useState(0);
  const [hasCompany, setHasCompany] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [activeContracts, setActiveContracts] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }

    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      setCitizenFile(cf);
      const cName = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
      setCharacterName(cName);
      setPlayerCash(cf.wealth || 0);

      const companies = getCompanies();
      const myCompany = companies.find(c => c.ownerCharacterId === cName);
      setCompany(myCompany || null);
      setHasCompany(!!myCompany);

      if (myCompany) {
        const contracts = getContracts();
        setActiveContracts(contracts.filter(c => c.status === 'awarded' && c.awardedToCompanyId === myCompany.id).length);
      }
    }

    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    setRecentRecords(recs.slice(0, 6));
    setAuthorized(true);
  }, [router]);

  const handleRestartLife = () => {
    if (typeof window !== 'undefined') {
      const keys = [
        'worldr_citizen_file_v1', 'worldr_character_origin_v1', 'worldr_living_world_entry_v1',
        'worldr_records_v1', 'worldr_life_records_v1', 'worldr_letters_v1',
        'worldr_business_rooms_v1', 'worldr_room_history_v1', 'worldr_room_participation_v1',
        'worldr_companies_v1', 'worldr_reserved_business_names_v1', 'worldr_business_filings_v1',
        'worldr_contracts_v1', 'worldr_contract_bids_v1', 'worldr_business_offers_v1', 'worldr_recent_world_events_v1',
        'worldr_career_v1',
      ];
      keys.forEach(k => localStorage.removeItem(k));
      window.location.href = '/start';
    }
  };

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>

      {/* Top Player Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.2em', color: T.gold }}>WORLDr</span>
          <span style={{ width: '1px', height: '16px', background: T.border }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{characterName}</span>
          <span style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace' }}>Age 18 · {citizenFile?.motherland || 'Drennia'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {[
            { label: 'Credibility', val: citizenFile?.credibility || 50, color: T.ivory },
            { label: 'Charisma',    val: citizenFile?.charisma || 50,    color: T.ivory },
            { label: 'Influence',   val: citizenFile?.influence || 10,   color: T.ivory },
            { label: 'Cash ₯',     val: Number(playerCash || 0).toLocaleString('en-US'),                     color: T.mint  },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint }}>{s.label}</span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.gold, background: 'none', border: 'none', cursor: 'pointer' }}>Letters</button>
          <button onClick={handleRestartLife} style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.red, background: 'none', border: 'none', cursor: 'pointer' }}>Restart Life</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Personal Status */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Personal Status</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: T.ivory, margin: '0 0 16px' }}>Chronicle</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Name', value: characterName },
                { label: 'Age', value: '18' },
                { label: 'Motherland', value: citizenFile?.motherland || 'Drennia' },
                { label: 'Citizen Since', value: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '3px' }}>{f.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: T.muted }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Desks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Business Desk */}
            {!hasCompany ? (
              <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '10px' }}>Business Desk</div>
                <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.6, flex: 1, margin: '0 0 16px' }}>
                  Open your company file, register a business, manage contracts, and build market power.
                </p>
                <Link href="/drennia/business" style={{ display: 'inline-block', textAlign: 'center', padding: '10px 16px', background: `linear-gradient(135deg, ${T.gold}, #8A6E2A)`, color: '#0a0709', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, textDecoration: 'none' }}>
                  Open Business Desk
                </Link>
              </div>
            ) : (
              <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Business Desk</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{company.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>Cash</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>₯{Number(company.companyCash || 0).toLocaleString('en-US')}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', flex: 1 }}>{company.legalStructure} · {company.sector} · {company.state}</div>
                <Link href="/drennia/business" style={{ display: 'inline-block', textAlign: 'center', padding: '10px 16px', border: `1px solid ${T.gold}`, color: T.gold, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                  Open Business Desk
                </Link>
              </div>
            )}

            {/* Politics Desk */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px', display: 'flex', flexDirection: 'column', opacity: 0.8 }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.faint, marginBottom: '10px' }}>Politics Desk</div>
              <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.6, flex: 1, margin: '0 0 16px' }}>
                Political life is not open in pre-alpha yet. Parties, elections, offices, campaigns, and public power will unlock after the business foundation is stable.
              </p>
              <button disabled style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, color: T.faint, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, cursor: 'not-allowed' }}>
                Locked
              </button>
            </div>
          </div>

          {/* Career Summary */}
          {hasCompany && (
            <div style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Career: Business Founder</div>
                <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.5 }}>
                  {characterName} started {company.name}, a {company.sector} business in {company.state}.
                </div>
              </div>
              <Link href="/drennia/career" style={{ marginLeft: '16px', padding: '8px 16px', border: `1px solid ${T.borderGold}`, color: T.gold, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                View Career →
              </Link>
            </div>
          )}

          {/* Recent Records */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold }}>Recent Records</div>
              <Link href="/drennia/records" style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, textDecoration: 'none' }}>View All →</Link>
            </div>
            {recentRecords.length === 0 ? (
              <p style={{ fontSize: '12px', color: T.faint, fontStyle: 'italic' }}>No records yet. Your filings, contracts, and actions will appear here.</p>
            ) : (
              recentRecords.map(r => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: '12px', color: T.muted, lineHeight: 1.6 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', color: T.faint, marginRight: '8px' }}>{r.type}</span>
                  {r.summary}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Drennian Ledger Headlines */}
          <div style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '20px' }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '14px' }}>Drennian Ledger</div>
            {LEDGER_HEADLINES.map((h, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < LEDGER_HEADLINES.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>
                {h}
              </div>
            ))}
          </div>

          {/* Market Snapshot */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold }}>Market Snapshot</div>
              <Link href="/drennia/market" style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, textDecoration: 'none' }}>Full Market →</Link>
            </div>
            {SECTOR_DEMAND.map(s => (
              <div key={s.sector} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: '11px', color: T.muted }}>{s.sector}</span>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.demand}</span>
              </div>
            ))}
          </div>

          {/* Letters placeholder */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '10px' }}>Letters & Correspondence</div>
            <p style={{ fontSize: '11px', color: T.faint, fontStyle: 'italic', lineHeight: 1.6 }}>
              No letters received yet. Business correspondence and official notices will arrive here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
