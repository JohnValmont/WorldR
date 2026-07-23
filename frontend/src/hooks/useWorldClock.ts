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
  const [serverSkew, setServerSkew] = useState<number>(0);
  
  useEffect(() => {
    if (clock?.server_time) {
       setServerSkew(new Date(clock.server_time).getTime() - Date.now());
    }
  }, [clock?.server_time]);

  const [secondsToTick, setSecondsToTick] = useState<number | null>(null);
  useEffect(() => {
    if (!clock?.next_arc_close_at || clock.status !== 'active') {
      setSecondsToTick(null);
      return;
    }
    const target = new Date(clock.next_arc_close_at).getTime();
    if (Number.isNaN(target)) {
      setSecondsToTick(null);
      return;
    }
    let timeoutId: NodeJS.Timeout | null = null;
    
    const update = () => {
      const syncedNow = Date.now() + serverSkew;
      const s = Math.max(0, Math.floor((target - syncedNow) / 1000));
      setSecondsToTick(s);
      
      if (s === 0 && !timeoutId) {
        // Poll backend softly if we reached 0 but next_arc hasn't advanced yet
        timeoutId = setTimeout(() => {
          mutate();
          timeoutId = null;
        }, 5_000);
      }
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => {
      clearInterval(timer);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clock?.next_arc_close_at, clock?.status, mutate, serverSkew]);

  // Live countdown to next politics tick
  const [polSecondsToTick, setPolSecondsToTick] = useState<number | null>(null);
  useEffect(() => {
    if (!clock?.pol_next_arc_close_at || clock.status !== 'active') {
      setPolSecondsToTick(null);
      return;
    }
    const target = new Date(clock.pol_next_arc_close_at).getTime();
    if (Number.isNaN(target)) {
      setPolSecondsToTick(null);
      return;
    }
    let timeoutId: NodeJS.Timeout | null = null;
    
    const update = () => {
      const syncedNow = Date.now() + serverSkew;
      const s = Math.max(0, Math.floor((target - syncedNow) / 1000));
      setPolSecondsToTick(s);
      
      if (s === 0 && !timeoutId) {
        timeoutId = setTimeout(() => {
          mutate();
          timeoutId = null;
        }, 5_000);
      }
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => {
      clearInterval(timer);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clock?.pol_next_arc_close_at, clock?.status, mutate, serverSkew]);

  return { clock, secondsToTick, polSecondsToTick, error, isLoading, refresh: mutate };
}

/** Format a seconds countdown as e.g. "7h 59m 30s" or "45s". */
export function formatCountdown(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return '...';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  
  if (h > 0) return `${h}h ${mStr}m ${sStr}s`;
  if (m > 0) return `${m}m ${sStr}s`;
  return `${s}s`;
}
