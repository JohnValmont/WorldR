'use client';

interface HemicycleParty {
  name: string;
  abbreviation: string;
  seats: number;
  color: string;
  is_governing?: boolean;
}

interface HemicycleChartProps {
  parties: HemicycleParty[];
  totalSeats: number;
  height?: number;
  showLegend?: boolean;
}

export default function HemicycleChart({
  parties,
  totalSeats,
  height = 200,
  showLegend = true,
}: HemicycleChartProps) {
  const sorted = [...parties].sort((a, b) => b.seats - a.seats);
  const W = 400;
  const H = height;
  const CX = W / 2;
  const CY = H - 20;

  // Semicircle from 180° to 0° (left to right)
  const ROWS = 5;
  const OUTER_R = Math.min(CX - 10, CY - 10);
  const INNER_R = OUTER_R * 0.45;

  // Build seat positions
  interface SeatPos { x: number; y: number; color: string; isGov: boolean }
  const seatPositions: SeatPos[] = [];

  // Distribute seats across rows
  const totalAngle = Math.PI; // 180 degrees
  let partyQueue: { color: string; isGov: boolean; seats: number }[] = sorted.map(p => ({
    color: p.color,
    isGov: !!p.is_governing,
    seats: p.seats,
  }));

  // Calculate total seats to render (may be limited)
  const renderedSeats = Math.min(totalSeats, 450);
  const seatsPerRow: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    const fraction = (row + 1) / ROWS;
    const r = INNER_R + (OUTER_R - INNER_R) * fraction;
    const circumference = Math.PI * r;
    const dotSize = 5;
    const maxInRow = Math.floor(circumference / (dotSize + 1.5));
    seatsPerRow.push(maxInRow);
  }
  const totalCapacity = seatsPerRow.reduce((a, b) => a + b, 0);
  const scaleFactor = renderedSeats / totalCapacity;

  // Build party segments
  const assignedColors: string[] = [];
  let partyIdx = 0;
  let partySeatsLeft = partyQueue[0]?.seats || 0;
  for (let i = 0; i < renderedSeats; i++) {
    if (partySeatsLeft <= 0) {
      partyIdx++;
      partySeatsLeft = partyQueue[partyIdx]?.seats || 0;
    }
    const color = partyQueue[partyIdx]?.color || '#3f3f46';
    const isGov = partyQueue[partyIdx]?.isGov || false;
    assignedColors.push(color);
    partySeatsLeft--;
    void isGov;
  }

  // Place seats in hemicycle
  let seatIdx = 0;
  for (let row = 0; row < ROWS && seatIdx < renderedSeats; row++) {
    const fraction = (row + 0.5) / ROWS;
    const r = INNER_R + (OUTER_R - INNER_R) * fraction;
    const circumference = Math.PI * r;
    const dotSize = 5;
    const maxInRow = Math.min(
      Math.floor(circumference / (dotSize + 1.5)),
      renderedSeats - seatIdx
    );
    const angleStep = totalAngle / (maxInRow + 1);
    for (let col = 0; col < maxInRow && seatIdx < renderedSeats; col++) {
      const angle = Math.PI - angleStep * (col + 1);
      const x = CX + r * Math.cos(angle);
      const y = CY - r * Math.sin(angle);
      seatPositions.push({ x, y, color: assignedColors[seatIdx] || '#3f3f46', isGov: false });
      seatIdx++;
    }
  }

  const majority = Math.ceil(totalSeats / 2);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: height }}>
        {/* Majority line */}
        <line
          x1={CX} y1={CY - OUTER_R - 4}
          x2={CX} y2={CY - INNER_R + 4}
          stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" opacity={0.6}
        />
        <text x={CX + 4} y={CY - OUTER_R + 6} fill="#f59e0b" fontSize={8} fontFamily="monospace">
          {majority}
        </text>

        {/* Seats */}
        {seatPositions.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={2.4}
            fill={s.color}
            opacity={0.92}
          />
        ))}

        {/* Center arc guide */}
        <path
          d={`M ${CX - OUTER_R} ${CY} A ${OUTER_R} ${OUTER_R} 0 0 1 ${CX + OUTER_R} ${CY}`}
          fill="none" stroke="#27272a" strokeWidth={0.5}
        />
        <path
          d={`M ${CX - INNER_R} ${CY} A ${INNER_R} ${INNER_R} 0 0 1 ${CX + INNER_R} ${CY}`}
          fill="none" stroke="#27272a" strokeWidth={0.5}
        />

        {/* Center stats */}
        <text x={CX} y={CY - 6} textAnchor="middle" fill="#71717a" fontSize={8} fontFamily="monospace">
          {totalSeats} SEATS
        </text>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {sorted.map((p) => (
            <div key={p.abbreviation} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-[9px] font-mono text-zinc-400">
                {p.abbreviation} <span className="text-zinc-600">{p.seats}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
