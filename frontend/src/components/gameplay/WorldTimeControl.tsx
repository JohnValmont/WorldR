'use client';

import React, { useState, useEffect } from 'react';
import { useWorldClock, formatCountdown } from '../../hooks/useWorldClock';
import { formatWorldDate } from '../../lib/calendar';
import { useAuthStore } from '../../store/auth.store';
import { authApi, worldApi } from '../../lib/api';

const T = {
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  border: '#2A2630'
};

/**
 * WorldTimeControl — live world clock HUD.
 *
 * Shows the authoritative server date and a countdown to the next automatic
 * month tick. Admins additionally get a "Force Tick" button that advances the
 * whole world (all countries, players + NPCs) immediately.
 */
export default function WorldTimeControl() {
  const { clock, secondsToTick, refresh } = useWorldClock();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin' || isAdminDynamic;

  useEffect(() => {
    authApi.me().then(res => setIsAdminDynamic(res.data.isAdmin)).catch(() => {});
  }, []);

  const handleForceTick = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    try {
      const res = await worldApi.forceTick();
      const result = res?.data ?? res;

      if (result?.data?.status === 'ticked' || result?.status === 'success') {
        // A month was actually processed — pull in the new world state.
        await refresh();
        window.location.reload();
        return;
      }

      // Skipped — surface WHY instead of silently reloading into the same state.
      if (result?.reason === 'tick_in_progress') {
        const step = result?.step ? ` (current step: ${result.step})` : '';
        alert(`A world tick is already running${step}. Please wait a moment and try again — a stuck tick now recovers automatically within a few minutes.`);
      } else if (result?.reason === 'paused') {
        alert('The world clock is paused. Resume it before forcing a tick.');
      } else if (result?.reason === 'not_due') {
        alert('The next month is not due yet.');
      } else if (result?.reason === 'no_clock') {
        alert('No active world clock was found.');
      } else {
        alert('World tick did not advance the month.');
      }
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to advance world tick');
    } finally {
      setIsAdvancing(false);
    }
  };

  if (!clock) return null;

  const dateStr = formatWorldDate(clock.current_year, clock.current_month);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 8px' }}>
      <div style={{ fontSize: '11px', color: T.gold, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>
        <div style={{ color: T.ivory }}>{dateStr}</div>
        {clock.status === 'paused' ? (
          <div style={{ color: T.muted, fontSize: '9px' }}>WORLD PAUSED</div>
        ) : secondsToTick !== null ? (
          <div style={{ color: T.muted, fontSize: '9px' }} aria-live="polite">
            NEXT MONTH IN <span style={{ textTransform: 'none' }}>{formatCountdown(secondsToTick)}</span>
          </div>
        ) : null}
      </div>
      {isAdmin && (
        <button
          onClick={handleForceTick}
          disabled={isAdvancing}
          style={{
            background: isAdvancing ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${T.gold}, #8A6E2A)`,
            color: isAdvancing ? T.muted : '#0a0709',
            border: `1px solid ${isAdvancing ? T.border : T.gold}`,
            padding: '6px 12px',
            fontSize: '10px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700,
            cursor: isAdvancing ? 'not-allowed' : 'pointer',
            opacity: isAdvancing ? 0.7 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {isAdvancing ? 'PROCESSING WORLD...' : 'FORCE TICK — ADMIN'}
        </button>
      )}
    </div>
  );
}
