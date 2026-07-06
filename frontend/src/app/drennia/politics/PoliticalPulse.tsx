import React from 'react';

/**
 * PoliticalPulse — the addictive feedback layer for the Ironvale race.
 * Pure presentational: it renders the `pulse` object the /politics/polls
 * endpoint now returns (near-miss tension, momentum, rival, loss-aversion,
 * and the single sharpest next action). No data fetching, no engine logic.
 */

const TONE: Record<string, { bar: string; bg: string; title: string }> = {
  triumph: { bar: '#4ade80', bg: 'rgba(74,222,128,0.08)', title: '#4ade80' },
  tension: { bar: '#e8752a', bg: 'rgba(232,117,42,0.08)', title: '#e8752a' },
  danger:  { bar: '#f87171', bg: 'rgba(248,113,113,0.10)',  title: '#fca5a5' },
  neutral: { bar: '#252637', bg: 'rgba(37,38,55,0.30)',   title: '#ffffff' }
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function MomentumArrow({ delta }: { delta: number }) {
  if (!delta) return <span className="text-[#6b6d8a]">—</span>;
  const up = delta > 0;
  return (
    <span className={up ? 'text-green-400' : 'text-red-400'}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{pct(delta)}
    </span>
  );
}

export default function PoliticalPulse({ pulse }: { pulse: any }) {
  if (!pulse) return null;

  const tone = TONE[pulse.banner?.tone] || TONE.neutral;
  const majority = pulse.majoritySeats || 31;
  const total = pulse.totalSeats || 61;
  const mySeats = pulse.myParty?.seats ?? 0;
  const majorityPct = Math.min(100, Math.round((mySeats / majority) * 100));

  return (
    <div className="space-y-4 mb-6">
      {/* ── Headline banner ─────────────────────────────────────────── */}
      <div
        className="p-5 border-l-4"
        style={{ borderColor: tone.bar, background: tone.bg, borderTop: '1px solid #252637', borderRight: '1px solid #252637', borderBottom: '1px solid #252637' }}
      >
        <div className="font-serif tracking-wide text-2xl mb-1" style={{ color: tone.title }}>
          {pulse.banner?.title}
        </div>
        <div className="text-[#8b8da8] text-sm">{pulse.banner?.detail}</div>
      </div>

      {pulse.hasCandidacy && (
        <>
          {/* ── Stat strip: seats + momentum, majority bar, rival ──────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#1c1d2e] border border-[#252637]">
              <div className="text-[#8b8da8] text-xs uppercase tracking-wider mb-1">Projected Seats</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-white font-mono">{mySeats}</span>
                <span className="text-[#6b6d8a] text-sm">/ {total}</span>
                {pulse.momentum && (
                  <span className="text-xs ml-1">
                    {pulse.momentum.direction === 'up' && <span className="text-green-400">▲ +{pulse.momentum.deltaSeats}</span>}
                    {pulse.momentum.direction === 'down' && <span className="text-red-400">▼ {pulse.momentum.deltaSeats}</span>}
                    {pulse.momentum.direction === 'flat' && <span className="text-[#6b6d8a]">no change</span>}
                    <span className="text-[#6b6d8a]"> this month</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#1c1d2e] border border-[#252637]">
              <div className="text-[#8b8da8] text-xs uppercase tracking-wider mb-2">
                {pulse.seatsFromMajority === 0 ? 'Majority Secured' : `${pulse.seatsFromMajority} From Majority`}
              </div>
              <div className="h-2 w-full bg-[#13141f] border border-[#252637] overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${majorityPct}%`, background: majorityPct >= 100 ? '#4ade80' : '#e8752a' }}
                />
              </div>
              <div className="text-[#6b6d8a] text-xs mt-1">{mySeats} of {majority} needed to govern</div>
            </div>

            <div className="p-4 bg-[#1c1d2e] border border-[#252637]">
              <div className="text-[#8b8da8] text-xs uppercase tracking-wider mb-1">Chief Rival</div>
              {pulse.rival ? (
                <div>
                  <div className="text-white text-sm font-serif truncate">{pulse.rival.name}</div>
                  <div className={`text-xs mt-1 ${pulse.rival.ahead ? 'text-red-400' : 'text-green-400'}`}>
                    {pulse.rival.ahead ? 'ahead by' : 'behind by'} {pulse.rival.seatGap} · {pulse.rival.seats} seats
                  </div>
                </div>
              ) : (
                <div className="text-[#6b6d8a] text-sm">No close challenger</div>
              )}
            </div>
          </div>

          {/* ── Defend-your-seat warning (loss aversion) ───────────────── */}
          {pulse.defense && pulse.defense.atRisk > 0 && (
            <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
              ⚠ {pulse.defense.message}
            </div>
          )}

          {/* ── Sharpest next move ─────────────────────────────────────── */}
          {pulse.callToAction && (
            <div className="p-3 border border-[#e8752a]/40 bg-[#e8752a]/10 text-[#e8752a] text-sm">
              → {pulse.callToAction}
            </div>
          )}

          {/* ── Segment momentum board ─────────────────────────────────── */}
          <div className="border border-[#252637] bg-[#1c1d2e]">
            <div className="px-4 py-2 border-b border-[#252637] text-[#8b8da8] text-xs uppercase tracking-wider">
              Ground you're gaining / losing
            </div>
            <div className="divide-y divide-[#252637]">
              {pulse.segments?.map((s: any) => {
                const dot = s.status === 'winning' ? '#4ade80'
                  : s.status === 'contested' ? '#e8752a'
                  : s.status === 'losing' ? '#f87171' : '#6b6d8a';
                return (
                  <div key={s.key} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                      <span className="text-white truncate">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[#8b8da8] font-mono">{pct(s.myShare)}</span>
                      <span className="w-20 text-right font-mono"><MomentumArrow delta={s.delta} /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
