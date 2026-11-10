'use client';
/**
 * "Drennia this month" — a Chronicle panel built ONLY from real simulation data
 * (GET /world/snapshot). Replaces the old hard-coded "Market Snapshot".
 * If something isn't known it is simply not shown.
 */
import useSWR from 'swr';
import { BarChart2 } from 'lucide-react';
import { Card, DataRow } from '../ui';
import { worldApi, type WorldSnapshot } from '../../lib/api';

function money(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

function change(current: number, previous: number | null): { text: string; variant: 'green' | 'red' | 'muted' } | null {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { text: '±0%', variant: 'muted' };
  return { text: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`, variant: pct > 0 ? 'green' : 'red' };
}

function timeUntil(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'processing…';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WorldThisMonth() {
  const { data, error } = useSWR<WorldSnapshot>('world-snapshot', worldApi.getSnapshot, {
    refreshInterval: 120_000,
  });

  if (error) {
    return (
      <Card kicker="Drennia This Month" icon={BarChart2}>
        <p className="text-[11px] text-zinc-500 italic py-2">World data is unavailable right now.</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card kicker="Drennia This Month" icon={BarChart2}>
        <div className="space-y-2 py-1">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-4 rounded bg-zinc-800/60 animate-pulse" />)}
        </div>
      </Card>
    );
  }

  const { market, companies, players, politics, clock } = data;
  const unitsChange = change(market.units_sold, market.previous_units_sold);
  const revenueChange = change(market.revenue, market.previous_revenue);
  const nextTick = timeUntil(clock?.business.next_tick_at ?? null);

  const rows: { label: string; value: React.ReactNode; variant?: 'default' | 'green' | 'red' | 'amber' | 'muted' }[] = [];

  if (market.period) {
    rows.push({
      label: 'Cars sold',
      value: (
        <span>
          {market.units_sold.toLocaleString('en-US')}
          {unitsChange && <span className={`ml-2 text-[10px] ${unitsChange.variant === 'green' ? 'text-emerald-400' : unitsChange.variant === 'red' ? 'text-red-400' : 'text-zinc-500'}`}>{unitsChange.text}</span>}
        </span>
      ),
    });
    rows.push({
      label: 'Car sales revenue',
      value: (
        <span>
          {money(market.revenue)}
          {revenueChange && <span className={`ml-2 text-[10px] ${revenueChange.variant === 'green' ? 'text-emerald-400' : revenueChange.variant === 'red' ? 'text-red-400' : 'text-zinc-500'}`}>{revenueChange.text}</span>}
        </span>
      ),
    });
    rows.push({ label: 'Models on sale', value: market.models_selling.toLocaleString('en-US') });
  }

  rows.push({ label: 'Active companies', value: `${companies.active} (${companies.player_owned} player-run)` });
  rows.push({ label: 'Political parties', value: `${politics.parties} (${politics.player_led_parties} player-led)` });
  rows.push({
    label: players.active_recently !== null ? `Players active (${players.active_window_days}d)` : 'Citizens',
    value: players.active_recently !== null ? players.active_recently.toLocaleString('en-US') : players.citizens.toLocaleString('en-US'),
  });
  if (nextTick) rows.push({ label: 'Next month in', value: nextTick, variant: 'amber' });

  return (
    <Card kicker="Drennia This Month" icon={BarChart2}>
      {market.period ? (
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600 mb-2">
          Sales results · Month {market.period.month}, Year {market.period.year}
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500 italic mb-2">No car sales recorded yet this era.</p>
      )}
      {rows.map((r, i) => (
        <DataRow key={r.label} label={r.label} value={r.value} valueVariant={r.variant ?? 'default'} border={i < rows.length - 1} />
      ))}
    </Card>
  );
}
