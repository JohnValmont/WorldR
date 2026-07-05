'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { worldApi, type WorldClock } from '../lib/api';
import { saveWorldDate } from '../lib/worldTime';

/**
 * useWorldClock — live view of the authoritative server world clock.
 *
 * - Fetches /world/clock via SWR and refreshes every 30s.
 * - Syncs the legacy localStorage clock so all getGameDate() consumers
 *   render the real server date.
 * - Exposes a live countdown (in seconds) to the next month tick.
 * - When the countdown crosses zero, revalidates so the new month appears
 *   shortly after the server processes the tick.
 */
export function useWorldClock() {
  const { data: clock, error, isLoading, mutate } = useSWR<WorldClock>(
    'world-clock',
    () => worldApi.getClock(),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  // Keep the legacy localStorage clock in sync with the server
  useEffect(() => {
    if (clock) {
      saveWorldDate({ year: clock.current_year, month: clock.current_month, day: clock.current_day || 1 });
    }
  }, [clock]);

  // Live countdown to next tick
  const [secondsToTick, setSecondsToTick] = useState<number | null>(null);
  useEffect(() => {
    if (!clock?.next_arc_close_at || clock.status !== 'active') {
      setSecondsToTick(null);
      return;
    }
    const target = new Date(clock.next_arc_close_at).getTime();
    let fired = false;
    const update = () => {
      const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsToTick(s);
      if (s === 0 && !fired) {
        fired = true;
        // Give the server a few seconds to process, then revalidate
        setTimeout(() => mutate(), 5_000);
      }
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [clock?.next_arc_close_at, clock?.status, mutate]);

  return { clock, secondsToTick, error, isLoading, refresh: mutate };
}

/** Format a seconds countdown as e.g. "7h 59m 30s" or "45s". */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
