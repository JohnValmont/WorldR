'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
  panelSoft: '#17151B',
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

const SECTOR_DEMAND = [
  { sector: 'Shipping & Logistics', demand: 'High',    trend: '▲', avgContract: '₯140–₯220', trendColor: T.mint  },
  { sector: 'Manufacturing',        demand: 'Rising',  trend: '▲', avgContract: '₯180–₯260', trendColor: T.gold  },
  { sector: 'Retail & Consumer',    demand: 'Medium',  trend: '→', avgContract: '₯90–₯140',  trendColor: T.muted },
  { sector: 'Agriculture & Food',   demand: 'Stable',  trend: '→', avgContract: '₯100–₯160', trendColor: T.steel },
  { sector: 'Finance & Services',   demand: 'High',    trend: '▲', avgContract: 'Restricted', trendColor: T.faint },
  { sector: 'Construction',         demand: 'Medium',  trend: '→', avgContract: 'Restricted', trendColor: T.faint },
  { sector: 'Energy',               demand: 'Rising',  trend: '▲', avgContract: 'Restricted', trendColor: T.faint },
];

const STATE_CONDITIONS = [
  { state: 'Drennport State', conditions: ['Finance sector stable.', 'High professional service demand.', 'Operating costs remain elevated.', 'Registry office congestion low.'] },
  { state: 'Westport State',  conditions: ['Trade activity up 8% this quarter.', 'Port throughput at capacity.', 'Logistics contracts in high demand.', 'Shipping competition fierce.'] },
  { state: 'Ironvale State',  conditions: ['Material demand rising.', 'Labour situation stable.', 'Factory output increasing.', 'Parts handling contracts available.'] },
  { state: 'Greenmere State', conditions: ['Harvest season ahead of schedule.', 'Food supply stable and ample.', 'Local reputation economy strong.', 'Slow but steady growth sector.'] },
];

export default function MarketPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>
          ← Back to Chronicle
        </span>
      </div>
      <div style={{ padding: '8px 24px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '4px' }}>Drennia Commerce Division</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>Market Intelligence</h1>
        <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>Sector demand, average contract prices, and state market conditions.</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Sector Demand */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, marginBottom: '16px', fontWeight: 700 }}>Sector Demand Snapshot</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Sector', 'Demand', 'Avg Contract Range'].map(h => (
                  <th key={h} style={{ padding: '6px 0', textAlign: 'left', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTOR_DEMAND.map(s => (
                <tr key={s.sector} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 0', fontSize: '12px', color: T.muted }}>{s.sector}</td>
                  <td style={{ padding: '10px 0', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: s.trendColor }}>
                    {s.trend} {s.demand}
                  </td>
                  <td style={{ padding: '10px 0', fontSize: '11px', fontFamily: 'monospace', color: s.avgContract === 'Restricted' ? T.faint : T.mint }}>
                    {s.avgContract}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* State Conditions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {STATE_CONDITIONS.map(sc => (
            <div key={sc.state} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: T.ivory, marginBottom: '10px' }}>{sc.state}</div>
              {sc.conditions.map((c, i) => (
                <div key={i} style={{ fontSize: '11px', color: T.muted, padding: '4px 0', display: 'flex', gap: '8px' }}>
                  <span style={{ color: T.faint }}>·</span> {c}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Westport Bourse */}
        <div style={{ gridColumn: '1 / -1', background: T.paper, border: `1px solid ${T.burgundy}40`, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Westport Bourse</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: T.faint, marginBottom: '8px' }}>Share Market — Locked</div>
              <p style={{ fontSize: '12px', color: T.faint, lineHeight: 1.7, maxWidth: '480px', margin: 0 }}>
                Public company trading on the Westport Bourse requires a Corporation legal structure. 
                Sole Traders and Private Companies are not eligible for public listing.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '4px' }}>Unlock Requires</div>
              <div style={{ fontSize: '11px', color: T.burgundy, fontFamily: 'monospace' }}>Corporation Structure</div>
              <div style={{ fontSize: '11px', color: T.burgundy, fontFamily: 'monospace' }}>₯50,000 Market Cap Min.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
            {[
              { label: 'DRENNPORT BANK',   ticker: 'DCB',  price: '₯1,240', change: '+0.8%',  up: true  },
              { label: 'KOVATH IRONWORKS', ticker: 'KIW',  price: '₯342',   change: '-1.2%',  up: false },
              { label: 'SALTGATE COUNTING',ticker: 'SGC',  price: '₯88',    change: '+2.1%',  up: true  },
              { label: 'CROWNBRIDGE',      ticker: 'CWB',  price: '₯24',    change: '+0.3%',  up: true  },
            ].map(s => (
              <div key={s.ticker} style={{ opacity: 0.4 }}>
                <div style={{ fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.15em', color: T.faint }}>{s.ticker}</div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.faint }}>{s.price}</div>
                <div style={{ fontSize: '10px', color: T.faint }}>{s.change}</div>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: T.faint, fontFamily: 'monospace', fontStyle: 'italic', alignSelf: 'flex-end' }}>
              🔒 Trading suspended — corporation required
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
