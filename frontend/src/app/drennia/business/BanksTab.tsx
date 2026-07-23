'use client';
import React, { useState, useEffect } from 'react';

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

export default function BanksTab({ company, onRefresh }: { company: any, onRefresh?: () => void }) {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!company) {
    return (
      <div style={{ padding: '40px', color: T.faint, fontSize: '13px', textAlign: 'center', border: `1px dashed ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
        You must register a company to access corporate banking facilities.
      </div>
    );
  }

  useEffect(() => {
    if (selectedBank) {
      setLoading(true);
      import('@/lib/api').then(({ api }) => {
        const token = localStorage.getItem('worldr_token');
        api.get(`/banks/dossier/${company.id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(res => {
          setDossier(res.data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load dossier');
          setLoading(false);
        });
      });
    }
  }, [selectedBank, company.id]);

  const handleTakeLoan = async (facilityType: string, amount: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const token = localStorage.getItem('worldr_token');
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post(`/banks/loan/${company.id}/take`, 
        { facilityType, principalAmount: amount },
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      alert(`Loan Secured! Monthly Payment: $${res.data.monthlyPayment}`);
      // Refresh dossier and parent state
      if (onRefresh) onRefresh();
      setSelectedBank(null); 
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedBank) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1000px' }}>
        <div
          style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '24px', cursor: 'pointer' }}
          onClick={() => setSelectedBank('drennia_national')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.gold, marginBottom: '6px' }}>Government Entity</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Drennia National Bank</div>
              <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, maxWidth: '480px', margin: 0 }}>
                The central monetary authority of Drennia. Offers corporate credit facilities, term loans, and distressed capital with strict covenants based on the 5 C's of credit.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: T.faint, marginBottom: '4px' }}>Base Rate</div>
              <div style={{ fontSize: '14px', color: T.mint, fontFamily: 'monospace', fontWeight: 'bold' }}>5.0%</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: '11px', color: T.muted, fontFamily: 'monospace' }}>
              Senior Term Loans · Working Capital · Bailout Facilities
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: T.mint, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-end' }}>
              Enter Lending Desk →
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: T.ivory }}>Drennia National Bank - Lending Desk</div>
        <button 
          onClick={() => setSelectedBank(null)}
          style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer' }}
        >
          ← Back to Directory
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
        
        {/* Credit Dossier */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
          <div style={{ fontSize: '11px', color: T.gold, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Corporate Credit Dossier</div>
          
          {loading ? (
            <div style={{ color: T.faint, fontSize: '12px' }}>Analyzing financials...</div>
          ) : dossier ? (
            <>
              <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: T.faint }}>Current Rating</div>
                <div style={{ fontSize: '24px', color: dossier.ratingTier === 'D' || dossier.ratingTier === 'CCC' ? T.red : T.mint, fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {dossier.ratingTier} <span style={{ fontSize: '10px', color: T.muted }}>({dossier.riskScore}/100)</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', color: T.muted }}>Character (Reputation)</span> <span style={{ fontSize: '11px', color: T.ivory }}>{dossier.metrics.character.toFixed(1)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', color: T.muted }}>Capacity (Cashflow)</span> <span style={{ fontSize: '11px', color: dossier.metrics.capacity < 0 ? T.red : T.ivory }}>${dossier.metrics.capacity.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', color: T.muted }}>Capital (Book Value)</span> <span style={{ fontSize: '11px', color: T.ivory }}>${dossier.metrics.capital.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', color: T.muted }}>Collateral (Assets)</span> <span style={{ fontSize: '11px', color: T.ivory }}>${dossier.metrics.collateral.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', color: T.muted }}>Conditions (Macro)</span> <span style={{ fontSize: '11px', color: T.ivory }}>{dossier.metrics.conditions}</span></div>
              </div>
            </>
          ) : (
             <div style={{ color: T.red, fontSize: '12px' }}>{error}</div>
          )}
        </div>

        {/* Loan Products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: T.ivory }}>Senior Term Loan A (TLA)</div>
              <div style={{ fontSize: '12px', color: T.mint, fontFamily: 'monospace' }}>{dossier ? ((dossier.baseRate + 0.04)*100).toFixed(1) : '?'}%</div>
            </div>
            <div style={{ fontSize: '11px', color: T.muted, marginTop: '8px', marginBottom: '12px' }}>Fixed monthly amortizing loan over 3-5 years. Requires positive operating profit and minimum B rating. Covenants include dividend block.</div>
            {dossier && (dossier.ratingTier === 'D' || dossier.ratingTier === 'CCC' || dossier.metrics.capacity < 0) ? (
               <button disabled style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: 'not-allowed' }}>Unqualified</button>
            ) : (
               <button onClick={() => handleTakeLoan('tla', 250000)} disabled={!dossier || isSubmitting} style={{ width: '100%', background: (!dossier || isSubmitting) ? T.bg : T.panel, border: `1px solid ${T.mint}`, color: (!dossier || isSubmitting) ? T.muted : T.mint, padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: (!dossier || isSubmitting) ? 'not-allowed' : 'pointer' }}>
                 {isSubmitting ? 'Processing...' : 'Apply for $250k TLA'}
               </button>
            )}
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: T.gold }}>Growth Capital Loan</div>
              <div style={{ fontSize: '12px', color: T.mint, fontFamily: 'monospace' }}>{dossier ? ((dossier.baseRate + 0.07)*100).toFixed(1) : '?'}%</div>
            </div>
            <div style={{ fontSize: '11px', color: T.muted, marginTop: '8px', marginBottom: '12px' }}>For scaling proven brands. Requires minimum 50 Reputation score. Amortizing high yield debt.</div>
            {dossier && dossier.metrics.character < 50 ? (
               <button disabled style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: 'not-allowed' }}>Reputation Too Low</button>
            ) : (
               <button onClick={() => handleTakeLoan('growth', 100000)} disabled={!dossier || isSubmitting} style={{ width: '100%', background: (!dossier || isSubmitting) ? T.bg : T.panel, border: `1px solid ${T.gold}`, color: (!dossier || isSubmitting) ? T.muted : T.gold, padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: (!dossier || isSubmitting) ? 'not-allowed' : 'pointer' }}>
                 {isSubmitting ? 'Processing...' : 'Apply for $100k Growth Capital'}
               </button>
            )}
          </div>

          <div style={{ background: '#1c1111', border: `1px solid ${T.burgundy}`, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff8888' }}>Distressed Bailout Facility</div>
              <div style={{ fontSize: '12px', color: '#ff8888', fontFamily: 'monospace' }}>22.0% Fixed</div>
            </div>
            <div style={{ fontSize: '11px', color: '#cc8888', marginTop: '8px', marginBottom: '12px' }}>Extreme risk mezzanine debt for severely distressed companies. High interest, strict covenants.</div>
            {dossier && dossier.metrics.capacity >= 0 && dossier.ratingTier !== 'D' && dossier.ratingTier !== 'CCC' ? (
              <button disabled style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: 'not-allowed' }}>Not Distressed</button>
            ) : (
              <button onClick={() => handleTakeLoan('distressed', 50000)} disabled={!dossier || isSubmitting} style={{ width: '100%', background: (!dossier || isSubmitting) ? T.bg : 'transparent', border: `1px solid ${T.burgundy}`, color: (!dossier || isSubmitting) ? T.muted : '#ff8888', padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: (!dossier || isSubmitting) ? 'not-allowed' : 'pointer' }}>
                {isSubmitting ? 'Processing...' : 'Apply for $50k Bailout'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
