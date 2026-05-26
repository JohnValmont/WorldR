'use client';
import StatusBadge from './StatusBadge';

interface CoalitionParty {
  id?: string;
  name: string;
  abbreviation: string;
  color: string;
  seats: number;
  ideology: string;
}

interface CoalitionPanelProps {
  parties: CoalitionParty[];
  totalSeats: number;
  coalitionThreshold?: number; // default 0.501
  chancellorParty?: string;
}

export default function CoalitionPanel({
  parties,
  totalSeats,
  coalitionThreshold = 0.501,
  chancellorParty,
}: CoalitionPanelProps) {
  const governing = parties.filter(p => p.seats > 0);
  const coalitionSeats = governing.reduce((a, p) => a + p.seats, 0);
  const threshold = Math.ceil(totalSeats * coalitionThreshold);
  const hasMajority = coalitionSeats >= threshold;
  const majorityPct = (coalitionSeats / totalSeats) * 100;

  if (governing.length === 0) {
    return (
      <div className="terminal-card p-3 text-center text-zinc-600 text-xs py-6">
        No coalition formed
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Coalition header */}
      <div className="flex items-center justify-between">
        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Coalition Government</div>
        <StatusBadge
          label={hasMajority ? `MAJORITY ${coalitionSeats}/${totalSeats}` : `MINORITY ${coalitionSeats}/${totalSeats}`}
          variant={hasMajority ? 'success' : 'warning'}
        />
      </div>

      {/* Majority bar */}
      <div>
        <div className="w-full bg-zinc-900 h-2 border border-zinc-800 relative">
          <div
            className="h-2 transition-all duration-700"
            style={{
              width: `${Math.min(majorityPct, 100)}%`,
              background: `linear-gradient(90deg, ${governing[0]?.color || '#f59e0b'}, ${governing[governing.length - 1]?.color || '#f59e0b'})`,
            }}
          />
          {/* Majority threshold line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-amber-400 opacity-80"
            style={{ left: `${coalitionThreshold * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-zinc-600 mt-0.5">
          <span>{coalitionSeats} seats</span>
          <span className="text-amber-500/70">← {threshold} majority</span>
          <span>{totalSeats} total</span>
        </div>
      </div>

      {/* Coalition partners */}
      <div className="space-y-1.5">
        {governing.map((p) => (
          <div key={p.abbreviation} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 shrink-0 border border-zinc-700" style={{ background: p.color }} />
            <span className="text-zinc-300 text-xs font-bold flex-1">{p.name}</span>
            <span className="text-zinc-500 text-[9px] font-mono">[{p.abbreviation}]</span>
            <span className="text-zinc-400 text-[9px] font-mono">{p.seats} seats</span>
            {chancellorParty === p.abbreviation && (
              <span className="text-amber-400 text-[8px] font-mono">★ CHANCELLOR</span>
            )}
          </div>
        ))}
      </div>

      {/* Coalition trust indicator */}
      <div className="pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Governing Since</span>
          <span className="text-[9px] text-zinc-400 font-mono">Month 0</span>
        </div>
      </div>
    </div>
  );
}
