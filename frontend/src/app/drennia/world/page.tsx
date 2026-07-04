'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, BarChart3, Landmark } from 'lucide-react';
import { worldApi, politicsApi, characterApi } from '@/lib/api';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#090A0F',
  panel: '#11131A',
  panelHover: '#14161E',
  border: '#2A2630',
  borderHover: '#3D3645',
  amber: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
  green: '#4D8C6A',
  red: '#B85555',
  blue: '#4A6178',
};

// ── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color = T.amber }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint }}>{label}</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.muted }}>{value}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 2 }}>
        <div style={{ height: 3, width: `${Math.min(100, value)}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── Operator Card ─────────────────────────────────────────────────────────────
function OperatorCard({ op, isMe }: { op: any; isMe: boolean }) {
  return (
    <div style={{
      background: isMe ? '#1A1810' : T.panel,
      border: `1px solid ${isMe ? T.amber : T.border}`,
      borderRadius: 4,
      padding: '14px 16px',
      position: 'relative',
      transition: 'border-color 0.15s',
    }}>
      {isMe && (
        <span style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase',
          letterSpacing: '0.2em', color: T.amber, background: 'rgba(201,162,74,0.12)',
          padding: '2px 6px', borderRadius: 2
        }}>You</span>
      )}

      {/* Name + age */}
      <div style={{ fontSize: 14, fontWeight: 700, color: T.ivory, marginBottom: 2 }}>{op.name}</div>
      <div style={{ fontSize: 10, color: T.faint, marginBottom: 10 }}>Age {op.age}</div>

      {/* Factors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
        <StatBar label="Credibility" value={op.credibility} color={T.blue} />
        <StatBar label="Charisma" value={op.charisma} color={T.amber} />
        <StatBar label="Influence" value={op.influence} color={T.green} />
      </div>

      {/* Company */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginBottom: op.party ? 8 : 0 }}>
        {op.company ? (
          <div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: 2 }}>Company</div>
            <div style={{ fontSize: 12, color: T.ivory }}>{op.company.name}</div>
            {op.company.reputation != null && (
              <div style={{ fontSize: 10, color: T.muted }}>Rep {op.company.reputation} · Reliability {op.company.reliability}</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.faint, fontStyle: 'italic' }}>No company</div>
        )}
      </div>

      {/* Party */}
      {op.party && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 0 }}>
          <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: 2 }}>Party</div>
          <div style={{ fontSize: 12, color: T.ivory }}>{op.party.party_name}</div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'capitalize' }}>{op.party.role}</div>
        </div>
      )}
    </div>
  );
}

// ── Share Bar ─────────────────────────────────────────────────────────────────
function ShareBar({ name, share, rank }: { name: string; share: number; rank: number }) {
  const colors = ['#C9A24A', '#A79D8C', '#6B6358'];
  const barColor = colors[Math.min(rank, 2)];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <div style={{ fontSize: 10, fontFamily: 'monospace', color: T.faint, width: 16, textAlign: 'right' }}>#{rank + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: rank === 0 ? T.ivory : T.muted, fontWeight: rank === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: barColor, flexShrink: 0, marginLeft: 8 }}>{share.toFixed(1)}%</span>
        </div>
        <div style={{ height: 3, background: T.border, borderRadius: 2 }}>
          <div style={{ height: 3, width: `${Math.min(100, share)}%`, background: barColor, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ id, active, label, onClick }: { id: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '10px 0', marginRight: 24,
        fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em',
        color: active ? T.amber : T.faint,
        borderBottom: active ? `2px solid ${T.amber}` : '2px solid transparent',
        transition: 'color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorldPage() {
  const [tab, setTab] = useState<'operators' | 'market' | 'politics'>('operators');
  const [loading, setLoading] = useState(true);
  const [myCharId, setMyCharId] = useState<string | null>(null);

  const [operators, setOperators] = useState<any[]>([]);
  const [market, setMarket] = useState<{ month: any; segments: any[] }>({ month: null, segments: [] });
  const [polData, setPolData] = useState<{ parties: any[]; council: any | null; state: any | null }>({ parties: [], council: null, state: null });

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      characterApi.getMe(),
      worldApi.getOperators(),
      worldApi.getMarketLeaderboard(),
      politicsApi.getParties(),
      politicsApi.getCouncil(),
      politicsApi.getState(),
    ]);

    if (results[0].status === 'fulfilled') {
      const char = (results[0].value as any)?.data || (results[0].value as any);
      setMyCharId(char?.id || null);
    }
    if (results[1].status === 'fulfilled') {
      setOperators((results[1].value as any).operators || []);
    }
    if (results[2].status === 'fulfilled') {
      setMarket(results[2].value as any);
    }
    const parties = results[3].status === 'fulfilled' ? (results[3].value as any) || [] : [];
    const council = results[4].status === 'fulfilled' ? (results[4].value as any) : null;
    const state = results[5].status === 'fulfilled' ? (results[5].value as any) : null;
    setPolData({ parties, council, state });

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, color: T.ivory }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}` }}>
        <Link href="/drennia/chronicle" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: 12, textDecoration: 'none' }} className="hover:text-amber-500 transition-colors">
          <ArrowLeft size={10} /> Back to Chronicle
        </Link>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, serif', color: T.ivory, margin: 0 }}>World Feed</h1>
          {!loading && (
            <div style={{ fontSize: 10, color: T.faint, fontFamily: 'monospace' }}>
              {operators.length} operator{operators.length !== 1 ? 's' : ''} active
            </div>
          )}
        </div>
        <div style={{ display: 'flex' }}>
          <TabBtn id="operators" active={tab === 'operators'} label="Operators" onClick={() => setTab('operators')} />
          <TabBtn id="market" active={tab === 'market'} label="Market Standings" onClick={() => setTab('market')} />
          <TabBtn id="politics" active={tab === 'politics'} label="Political Scene" onClick={() => setTab('politics')} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ color: T.muted, fontFamily: 'monospace', fontSize: 12 }}>Loading world data…</div>
        ) : (
          <>
            {/* ── OPERATORS TAB ── */}
            {tab === 'operators' && (
              <div>
                {operators.length === 0 ? (
                  <div style={{ textAlign: 'center', color: T.faint, padding: '64px 24px', border: `1px dashed ${T.border}`, borderRadius: 8, marginTop: 12 }}>
                    <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>No other operators online yet</div>
                    <div style={{ fontSize: 11 }}>The world is waiting for its first citizens.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {operators.map((op: any) => (
                      <OperatorCard key={op.id} op={op} isMe={op.id === myCharId} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MARKET STANDINGS TAB ── */}
            {tab === 'market' && (
              <div>
                {market.month && (
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: T.faint, marginBottom: 16 }}>
                    Last completed month · Year {market.month.year} / Month {market.month.month}
                  </div>
                )}
                {market.segments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: T.faint, padding: '64px 24px', border: `1px dashed ${T.border}`, borderRadius: 8, marginTop: 12 }}>
                    <BarChart3 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>No market data recorded</div>
                    <div style={{ fontSize: 11, marginBottom: 16 }}>Month 1 results will appear after the first month completes.</div>
                    <Link href="/drennia/business" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#090A0F', background: T.amber, padding: '8px 16px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>
                      Enter the Market
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {market.segments.map((seg: any) => (
                      <div key={seg.segmentId} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '14px 16px' }}>
                        <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.amber, marginBottom: 10 }}>
                          {seg.marketName}
                        </div>
                        {seg.companies.length === 0 ? (
                          <div style={{ fontSize: 11, color: T.faint, fontStyle: 'italic' }}>No sales recorded.</div>
                        ) : (
                          <div>
                            {seg.companies.slice(0, 8).map((co: any, idx: number) => (
                              <ShareBar key={co.companyId} name={co.companyName} share={co.marketShare} rank={idx} />
                            ))}
                            {seg.companies.length > 8 && (
                              <div style={{ fontSize: 10, color: T.faint, marginTop: 6, textAlign: 'right' }}>
                                +{seg.companies.length - 8} more companies
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── POLITICAL SCENE TAB ── */}
            {tab === 'politics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Phase banner */}
                {polData.state && (
                  <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.amber }}>
                      {polData.state.activeState?.name || 'Ironvale'} · Council
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.muted, textTransform: 'uppercase' }}>
                      Phase: {polData.state.cyclePhase || '—'}
                    </span>
                    {polData.state.countdownToNextPhase > 0 && (
                      <span style={{ fontSize: 10, color: T.faint }}>
                        · {polData.state.countdownToNextPhase} month{polData.state.countdownToNextPhase !== 1 ? 's' : ''} to next phase
                      </span>
                    )}
                  </div>
                )}

                {/* Governing info */}
                {polData.council?.premier && (
                  <div style={{ background: '#14181F', border: `1px solid ${T.border}`, borderRadius: 4, padding: '12px 16px' }}>
                    <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.amber, marginBottom: 6 }}>State Premier</div>
                    <div style={{ fontSize: 14, color: T.ivory, fontWeight: 600 }}>{polData.council.premier.party_name || '—'}</div>
                    {polData.council.coalition && (
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                        Coalition · {polData.council.coalition.total_seats} seats
                      </div>
                    )}
                  </div>
                )}

                {/* Parties */}
                <div>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: T.faint, marginBottom: 10 }}>Active Parties</div>
                  {polData.parties.length === 0 ? (
                    <div style={{ color: T.faint, fontSize: 12, textAlign: 'center', padding: 32 }}>No parties registered yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {polData.parties.map((p: any) => {
                        const seats = polData.council?.partySeats?.find((s: any) => s.party_id === p.id);
                        const memberCount = p.members?.length || 0;
                        return (
                          <div key={p.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: T.ivory, fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: T.faint }}>
                                {p.is_npc ? 'NPC Party' : 'Player Party'} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                            {seats && (
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: T.amber, fontFamily: 'monospace', lineHeight: 1 }}>{seats.seat_count}</div>
                                <div style={{ fontSize: 9, color: T.faint }}>seats</div>
                              </div>
                            )}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>₮{Number(p.treasury || 0).toLocaleString()}</div>
                              <div style={{ fontSize: 9, color: T.faint }}>treasury</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
