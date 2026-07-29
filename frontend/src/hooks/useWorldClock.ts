'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { worldApi, type WorldClock } from '../lib/api';
import { saveWorldDate } from '../lib/worldTime';

// How long (ms) to wait for the server to confirm a new month before
// declaring the biz tick stalled. Keeps "PROCESSING" from hanging forever.
const BIZ_TICK_STALL_MS = 90_000; // 90 seconds

/**
 * useWorldClock — live view of the authoritative server world clock.
 *
 * - Fetches /world/clock via SWR and refreshes every 30s.
 * - Syncs the legacy localStorage clock so all getGameDate() consumers
 *   render the real server date.
 * - Exposes a live countdown (in seconds) to the next month tick.
 * - When the countdown crosses zero, revalidates so the new month appears
 *   shortly after the server processes the tick.
 * - Exposes isBizTickStalled: true if the server hasn't confirmed the new
 *   month within BIZ_TICK_STALL_MS after the countdown hit zero.
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
  // Track when the countdown first hit zero so we can detect a stall
  const bizZeroAt = useRef<number | null>(null);
  const [isBizTickStalled, setIsBizTickStalled] = useState(false);

  useEffect(() => {
    if (!clock?.next_arc_close_at || clock.status !== 'active') {
      setSecondsToTick(null);
      setIsBizTickStalled(false);
      bizZeroAt.current = null;
      return;
    }
    const target = new Date(clock.next_arc_close_at).getTime();
    if (Number.isNaN(target)) {
      setSecondsToTick(null);
      return;
    }

    // When next_arc_close_at changes to a future time the tick completed —
    // clear the stall flag and the zero-anchor.
    const syncedNow = Date.now() + serverSkew;
    if (target > syncedNow) {
      setIsBizTickStalled(false);
      bizZeroAt.current = null;
    }

    let pollId: NodeJS.Timeout | null = null;

    const update = () => {
      const now = Date.now() + serverSkew;
      const s = Math.max(0, Math.floor((target - now) / 1000));
      setSecondsToTick(s);

      if (s === 0) {
        // Record the first moment we hit zero
        if (bizZeroAt.current === null) bizZeroAt.current = Date.now();

        // Stall detection: if we've been at zero longer than BIZ_TICK_STALL_MS,
        // flag it so the UI can surface a helpful message.
        const waitedMs = Date.now() - bizZeroAt.current;
        setIsBizTickStalled(waitedMs >= BIZ_TICK_STALL_MS);

        // Poll every 5s until the server confirms the new month
        if (!pollId) {
          pollId = setTimeout(function poll() {
            mutate();
            pollId = setTimeout(poll, 5_000);
          }, 5_000);
        }
      }
    };

    update();
    const timer = setInterval(update, 1_000);
    return () => {
      clearInterval(timer);
      if (pollId) clearTimeout(pollId);
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

  return { clock, secondsToTick, polSecondsToTick, isBizTickStalled, error, isLoading, refresh: mutate };
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
