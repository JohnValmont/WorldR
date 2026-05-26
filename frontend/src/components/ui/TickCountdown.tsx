'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface TickStatus {
  lastTickAt: number | null;
  nextTickAt: number | null;
  tickIntervalMs: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
}

export default function TickCountdown() {
  const [status, setStatus] = useState<TickStatus | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch tick status from server
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get('/world/tick-status');
        setStatus(data);
      } catch {
        // Silently fail — not critical
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    // Refresh every 5 minutes to stay in sync
    const refresh = setInterval(fetchStatus, 300000);
    return () => clearInterval(refresh);
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (!status) return;
    const tick = () => {
      if (!status.nextTickAt) {
        setCountdown('Pending...');
        return;
      }
      const remaining = status.nextTickAt - Date.now();
      if (remaining <= 0) {
        setCountdown('Ticking...');
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
        Loading...
      </div>
    );
  }

  const isProcessing = status?.nextTickAt !== null && Date.now() > (status?.nextTickAt ?? Infinity);

  return (
    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] px-3 py-1.5 rounded-sm">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isProcessing
          ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse'
          : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
      }`} />
      <div>
        <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest leading-none mb-0.5">
          {isProcessing ? 'Processing Tick' : 'Next Tick'}
        </div>
        <div className={`text-[11px] font-mono font-bold leading-none ${
          isProcessing ? 'text-amber-400' : 'text-zinc-300'
        }`}>
          {isProcessing ? '⟳ Processing...' : countdown || '--:--:--'}
        </div>
      </div>
      <div className="hidden sm:block border-l border-white/5 pl-2 ml-1">
        <div className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest leading-none mb-0.5">
          Interval
        </div>
        <div className="text-[10px] text-zinc-600 font-mono leading-none">
          {status ? `${(status.tickIntervalMs / 3600000).toFixed(0)}h` : '8h'}
        </div>
      </div>
    </div>
  );
}
