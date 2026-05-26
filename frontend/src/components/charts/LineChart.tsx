'use client';
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface LineChartProps {
  data: any[];
  lines: Array<{ key: string; color: string; label?: string }>;
  xKey?: string;
  height?: number;
  yDomain?: [number | 'auto', number | 'auto'];
  formatY?: (v: any) => string;
  formatTooltip?: (v: any, name: string) => string;
}

const CustomTooltip = ({ active, payload, label, formatTooltip }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 p-2 text-xs font-mono">
      <p className="text-zinc-400 mb-1">Tick {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatTooltip ? formatTooltip(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function LineChart({
  data, lines, xKey = 'tick', height = 180, yDomain, formatY, formatTooltip
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
          axisLine={{ stroke: '#3f3f46' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          domain={yDomain}
          tickFormatter={formatY}
          width={50}
        />
        <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label || l.key}
            stroke={l.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: l.color }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
