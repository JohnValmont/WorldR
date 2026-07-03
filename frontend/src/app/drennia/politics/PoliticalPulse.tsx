import React from 'react';

/**
 * PoliticalPulse — the addictive feedback layer for the Ironvale race.
 * Pure presentational: it renders the `pulse` object the /politics/polls
 * endpoint now returns (near-miss tension, momentum, rival, loss-aversion,
 * and the single sharpest next action). No data fetching, no engine logic.
 */

const TONE: Record<string, { bar: string; bg: string; title: string }> = {
  triumph: { bar: '#36D399', bg: 'rgba(54,211,153,0.08)', title: '#36D399' },
  tension: { bar: '#C9A24A', bg: 'rgba(201,162,74,0.08)', title: '#E6D5B8' },
  danger:  { bar: '#B85555', bg: 'rgba(184,85,85,0.10)',  title: '#E39A9A' },
  neutral: { bar: '#2A2630', bg: 'rgba(42,38,48,0.30)',   title: '#F4EBD6' }
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function MomentumArrow({ delta }: { delta: number }) {
  if (!delta) return <span className="text-[#6B6558]">—</span>;
  const up = delta > 0;
  return (
    <span className={up ? 'text-[#36D399]' : 'text-[#B85555]'}>
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
        style={{ borderColor: tone.bar, background: tone.bg, borderTop: '1px solid #2A2630', borderRight: '1px solid #2A2630', borderBottom: '1px solid #2A2630' }}
      >
        <div className="font-serif tracking-wide text-2xl mb-1" style={{ color: tone.title }}>
          {pulse.banner?.title}
        </div>
        <div className="text-[#A79D8C] text-sm">{pulse.banner?.detail}</div>
      </div>

      {pulse.hasCandidacy && (
        <>
          {/* ── Stat strip: seats + momentum, majority bar, rival ──────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#17151B] border border-[#2A2630]">
              <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Projected Seats</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-[#F4EBD6] font-mono">{mySeats}</span>
                <span className="text-[#6B6558] text-sm">/ {total}</span>
                {pulse.momentum && (
                  <span className="text-xs ml-1">
                    {pulse.momentum.direction === 'up' && <span className="text-[#36D399]">▲ +{pulse.momentum.deltaSeats}</span>}
                    {pulse.momentum.direction === 'down' && <span className="text-[#B85555]">▼ {pulse.momentum.deltaSeats}</span>}
                    {pulse.momentum.direction === 'flat' && <span className="text-[#6B6558]">no change</span>}
                    <span className="text-[#6B6558]"> this arc</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#17151B] border border-[#2A2630]">
              <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-2">
                {pulse.seatsFromMajority === 0 ? 'Majority Secured' : `${pulse.seatsFromMajority} From Majority`}
              </div>
              <div className="h-2 w-full bg-[#0C0D12] border border-[#2A2630] overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${majorityPct}%`, background: majorityPct >= 100 ? '#36D399' : '#C9A24A' }}
                />
              </div>
              <div className="text-[#6B6558] text-xs mt-1">{mySeats} of {majority} needed to govern</div>
            </div>

            <div className="p-4 bg-[#17151B] border border-[#2A2630]">
              <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Chief Rival</div>
              {pulse.rival ? (
                <div>
                  <div className="text-[#F4EBD6] text-sm font-serif truncate">{pulse.rival.name}</div>
                  <div className={`text-xs mt-1 ${pulse.rival.ahead ? 'text-[#B85555]' : 'text-[#36D399]'}`}>
                    {pulse.rival.ahead ? 'ahead by' : 'behind by'} {pulse.rival.seatGap} · {pulse.rival.seats} seats
                  </div>
                </div>
              ) : (
                <div className="text-[#6B6558] text-sm">No close challenger</div>
              )}
            </div>
          </div>

          {/* ── Defend-your-seat warning (loss aversion) ───────────────── */}
          {pulse.defense && pulse.defense.atRisk > 0 && (
            <div className="p-3 border border-[#B85555]/40 bg-[#B85555]/10 text-[#E39A9A] text-sm">
              ⚠ {pulse.defense.message}
            </div>
          )}

          {/* ── Sharpest next move ─────────────────────────────────────── */}
          {pulse.callToAction && (
            <div className="p-3 border border-[#C9A24A]/40 bg-[#C9A24A]/10 text-[#E6D5B8] text-sm">
              → {pulse.callToAction}
            </div>
          )}

          {/* ── Segment momentum board ─────────────────────────────────── */}
          <div className="border border-[#2A2630] bg-[#11131A]">
            <div className="px-4 py-2 border-b border-[#2A2630] text-[#A79D8C] text-xs uppercase tracking-wider">
              Ground you're gaining / losing
            </div>
            <div className="divide-y divide-[#2A2630]">
              {pulse.segments?.map((s: any) => {
                const dot = s.status === 'winning' ? '#36D399'
                  : s.status === 'contested' ? '#C9A24A'
                  : s.status === 'losing' ? '#B85555' : '#6B6558';
                return (
                  <div key={s.key} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                      <span className="text-[#E6D5B8] truncate">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[#A79D8C] font-mono">{pct(s.myShare)}</span>
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
