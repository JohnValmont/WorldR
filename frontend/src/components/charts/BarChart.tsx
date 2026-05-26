'use client';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  formatValue?: (v: number) => string;
  horizontal?: boolean;
}

export default function BarChart({ data, height = 180, formatValue, horizontal = false }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 60 : 0 }}
      >
        <CartesianGrid strokeDasharray="2 4" stroke="#27272a" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={58} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
          </>
        )}
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 10, fontFamily: 'monospace' }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={formatValue ? ((v: any) => formatValue(v)) as any : undefined}
        />
        <Bar dataKey="value" radius={0} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || '#f59e0b'} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
