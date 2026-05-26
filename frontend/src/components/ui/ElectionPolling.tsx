'use client';

interface ElectionPollingProps {
  parties: Array<{
    name: string;
    abbreviation: string;
    color: string;
    support_share: number;
    seats: number;
    is_governing?: boolean;
  }>;
  totalSeats?: number;
  showSeats?: boolean;
}

export default function ElectionPolling({
  parties,
  totalSeats = 450,
  showSeats = true,
}: ElectionPollingProps) {
  const sorted = [...parties].sort((a, b) => b.support_share - a.support_share);
  const maxShare = Math.max(...sorted.map(p => Number(p.support_share)), 0.01);

  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const pct = (Number(p.support_share) * 100).toFixed(1);
        const projectedSeats = Math.round(Number(p.support_share) * totalSeats);
        const barWidth = (Number(p.support_share) / maxShare) * 100;

        return (
          <div key={p.abbreviation} className="group">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-zinc-300 text-xs font-mono w-8 shrink-0">{p.abbreviation}</span>
              <div className="flex-1 bg-zinc-900 h-4 border border-zinc-800 relative overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${barWidth}%`, background: p.color, opacity: 0.85 }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-white/80">
                  {pct}%
                </span>
              </div>
              {showSeats && (
                <span className="text-zinc-500 text-[9px] font-mono w-10 text-right shrink-0">
                  ~{projectedSeats}
                </span>
              )}
              {p.is_governing && (
                <span className="text-emerald-500 text-[8px]">★</span>
              )}
            </div>
          </div>
        );
      })}
      {showSeats && (
        <div className="flex justify-end text-[8px] text-zinc-600 mt-1">
          <span>Projected seats (of {totalSeats})</span>
        </div>
      )}
    </div>
  );
}
