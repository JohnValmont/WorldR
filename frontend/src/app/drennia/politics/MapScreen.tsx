'use client';
/**
 * MapScreen.tsx
 *
 * Section 7: Wires the DrenniaMap SVG to the live district API,
 * adds an ActionPanel that opens on district click, and shows
 * a tick countdown from GET /drennia/tick/next.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { drenniaApi, DrenniaDistrict } from '@/lib/api';
import { T, MONO, HEADING, glassPanelStyle } from './_lib/theme';
import DrenniaMap from './_components/DrenniaMap';
import { Map, Megaphone, TrendingUp, X, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  character: any;
  myAp?: { current_ap: number; ap_cap: number };
  parties?: any[];
  onRefresh?: () => void;
}

// ── Countdown Hook ──────────────────────────────────────────────────────────

function useTickCountdown() {
  const { data, error } = useSWR('drennia-tick-next', drenniaApi.getNextTick, {
    refreshInterval: 60_000,  // re-fetch every 60s to stay accurate
  });

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.next_tick_at) return;
    const target = new Date(data.next_tick_at).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.next_tick_at]);

  return { secondsLeft, tickInfo: data, error };
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Tick Countdown Banner ──────────────────────────────────────────────────

function TickCountdown() {
  const { secondsLeft, tickInfo } = useTickCountdown();
  const urgent = secondsLeft !== null && secondsLeft < 300;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: urgent ? 'rgba(201,162,74,0.08)' : 'rgba(75,99,130,0.08)',
      border: `1px solid ${urgent ? T.goldLine : T.blueLine}`,
      borderRadius: 10,
      padding: '8px 16px',
    }}>
      <Clock size={14} color={urgent ? T.gold : T.blue} />
      <div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Next Tick
        </div>
        <div style={{
          fontFamily: MONO,
          fontSize: 18,
          fontWeight: 700,
          color: urgent ? T.gold : T.text,
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          {secondsLeft !== null ? formatCountdown(secondsLeft) : '--:--:--'}
        </div>
      </div>
      {tickInfo && (
        <div style={{ marginLeft: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Tick Window
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: T.muted }}>
            #{tickInfo.current_tick_window}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Support Bar ────────────────────────────────────────────────────────────

function SupportBar({ partyId, pct, color, name, prev }: {
  partyId: string; pct: number; color: string; name: string; prev?: number;
}) {
  const delta = prev !== undefined ? pct - prev : null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || partyId.slice(0, 8)}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {pct.toFixed(1)}%
          {delta !== null && (
            <span style={{ marginLeft: 4, color: delta > 0 ? T.mint : delta < 0 ? T.red : T.faint, fontSize: 9 }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          background: color || T.blue,
          borderRadius: 3,
          transition: 'width 0.6s cubic-bezier(0.25,0.8,0.25,1)',
        }} />
      </div>
    </div>
  );
}

// ── Action Panel (opens on district click) ─────────────────────────────────

function ActionPanel({
  district,
  parties,
  myAp,
  myPartyId,
  onClose,
  onRefresh,
}: {
  district: DrenniaDistrict;
  parties: any[];
  myAp: { current_ap: number; ap_cap: number };
  myPartyId?: string;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const partyMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const supportEntries = Object.entries(district.support_json)
    .sort((a, b) => b[1] - a[1]);

  async function doAction(actionType: 'rally' | 'fundraiser', targetType: 'district' | 'state') {
    if (submitting) return;
    const targetId = targetType === 'district' ? district.id : district.state_id;
    setSubmitting(actionType);
    setToast(null);
    try {
      const result = await drenniaApi.submitAction({ action_type: actionType, target_type: targetType, target_id: targetId });
      setToast({ type: 'ok', msg: `${actionType === 'rally' ? 'Rally' : 'Fundraiser'} queued! AP remaining: ${result.ap_remaining ?? '?'}` });
      onRefresh?.();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Action failed';
      setToast({ type: 'err', msg });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div style={{
      ...glassPanelStyle,
      padding: 0,
      overflow: 'hidden',
      minWidth: 280,
      maxWidth: 320,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.35)',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
            {district.state_name} · District {district.district_number}
          </div>
          <div style={{ fontFamily: HEADING, fontSize: 14, fontWeight: 700, color: T.text }}>
            {district.name}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Support bars */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Current Support
        </div>
        {supportEntries.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>No data yet</div>
        ) : supportEntries.map(([partyId, pct]) => {
          const party = partyMap[partyId];
          const prevPct = district.prev_support_json?.[partyId];
          return (
            <SupportBar
              key={partyId}
              partyId={partyId}
              pct={pct as number}
              prev={prevPct}
              color={party?.color_hex || party?.identity?.color || T.blue}
              name={party?.name || partyId.slice(0, 8)}
            />
          );
        })}
        {district.leading_party_name && (
          <div style={{
            marginTop: 8,
            padding: '5px 10px',
            background: `${district.leading_party_color || T.gold}15`,
            border: `1px solid ${district.leading_party_color || T.gold}40`,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: district.leading_party_color || T.gold }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.08em' }}>
              Leading: <strong style={{ color: T.text }}>{district.leading_party_name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Actions · AP: {myAp.current_ap}/{myAp.ap_cap}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Rally — district */}
          <ActionButton
            label="Rally District"
            sublabel="Costs 1 AP · +5% support in this district"
            icon={<Megaphone size={13} />}
            disabled={myAp.current_ap < 1 || submitting === 'rally'}
            loading={submitting === 'rally'}
            onClick={() => doAction('rally', 'district')}
            color={T.blue}
          />

          {/* Rally — state-wide */}
          <ActionButton
            label="State-Wide Rally"
            sublabel="Costs 1 AP · +5% support in ALL districts in this state"
            icon={<Megaphone size={13} />}
            disabled={myAp.current_ap < 1 || submitting === 'rally-state'}
            loading={submitting === 'rally-state'}
            onClick={async () => {
              setSubmitting('rally-state');
              setToast(null);
              try {
                const r = await drenniaApi.submitAction({ action_type: 'rally', target_type: 'state', target_id: district.state_id });
                setToast({ type: 'ok', msg: `State rally queued! AP remaining: ${r.ap_remaining ?? '?'}` });
                onRefresh?.();
              } catch (e: any) {
                setToast({ type: 'err', msg: e?.response?.data?.error || e?.message || 'Failed' });
              } finally { setSubmitting(null); }
            }}
            color={T.blueBright}
          />

          {/* Fundraiser */}
          <ActionButton
            label="Fundraiser"
            sublabel="Free · Adds $200 to party treasury"
            icon={<TrendingUp size={13} />}
            disabled={submitting === 'fundraiser'}
            loading={submitting === 'fundraiser'}
            onClick={() => doAction('fundraiser', 'district')}
            color={T.mint}
          />
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            background: toast.type === 'ok' ? T.mintDim : T.redDim,
            border: `1px solid ${toast.type === 'ok' ? T.mintGlow : T.redGlow}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            {toast.type === 'ok'
              ? <CheckCircle2 size={13} color={T.mint} style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle size={13} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
            }
            <span style={{ fontFamily: MONO, fontSize: 10, color: toast.type === 'ok' ? T.mint : T.red, lineHeight: 1.4 }}>
              {toast.msg}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, sublabel, icon, disabled, loading, onClick, color }: {
  label: string; sublabel: string; icon: React.ReactNode;
  disabled?: boolean; loading?: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: disabled ? 'rgba(255,255,255,0.03)' : `${color}12`,
        border: `1px solid ${disabled ? T.border : color + '40'}`,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ color: disabled ? T.faint : color, flexShrink: 0 }}>
        {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      </span>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: disabled ? T.faint : T.text }}>
          {label}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 1 }}>
          {sublabel}
        </div>
      </div>
    </button>
  );
}

// ── Main MapScreen ─────────────────────────────────────────────────────────

export default function MapScreen({ character, myAp = { current_ap: 0, ap_cap: 12 }, parties = [], onRefresh }: Props) {
  const [selectedDistrictNumber, setSelectedDistrictNumber] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  const { data: districtData, mutate: mutateDistricts, isLoading } = useSWR(
    'drennia-districts',
    drenniaApi.getDistricts,
    { refreshInterval: 30_000 },
  );

  const districts = districtData?.districts ?? [];

  // Build the color map for the SVG: district_number → hex
  const districtColors = useMemo<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    for (const d of districts) {
      if (d.leading_party_color) {
        m[d.district_number] = d.leading_party_color + 'CC'; // 80% opacity
      }
    }
    return m;
  }, [districts]);

  // Build a lookup for the selected district
  const selectedDistrict = useMemo(
    () => districts.find(d => d.district_number === selectedDistrictNumber) ?? null,
    [districts, selectedDistrictNumber],
  );

  // Find the player's party ID from their character
  const myPartyId: string | undefined = character?.political?.party_id;

  const handleDistrictClick = useCallback((districtNumber: number) => {
    setSelectedDistrictNumber(prev => prev === districtNumber ? null : districtNumber);
  }, []);

  const handleRefresh = useCallback(async () => {
    await mutateDistricts();
    onRefresh?.();
  }, [mutateDistricts, onRefresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
            Electoral Map
          </div>
          <h2 style={{ fontFamily: HEADING, fontSize: 20, fontWeight: 700, color: T.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Map size={18} color={T.blue} />
            Drennia — {districts.length} Districts
          </h2>
          <div style={{ fontFamily: MONO, fontSize: 10, color: T.muted, marginTop: 4 }}>
            Actions resolve at next tick · Submit rally or fundraiser below
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Label toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
              style={{ accentColor: T.blue }}
            />
            <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>Show numbers</span>
          </label>

          {/* Countdown */}
          <TickCountdown />
        </div>
      </div>

      {/* ── Body: map + panel ── */}
      <div style={{ display: 'flex', gap: 20, flex: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Map */}
        <div style={{
          ...glassPanelStyle,
          flex: '1 1 340px',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          minWidth: 340,
          position: 'relative',
        }}>
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(9,10,15,0.6)', borderRadius: 16, zIndex: 5,
            }}>
              <Loader2 size={24} color={T.blue} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          <DrenniaMap
            districtColors={districtColors}
            onDistrictClick={handleDistrictClick}
            selectedDistrict={selectedDistrictNumber}
            showLabels={showLabels}
            scale={1}
          />
          {selectedDistrictNumber === null && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, textAlign: 'center' }}>
              Click a district to take action
            </div>
          )}
        </div>

        {/* Right panel: Action panel or instruction card */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedDistrict ? (
            <ActionPanel
              district={selectedDistrict}
              parties={parties}
              myAp={myAp}
              myPartyId={myPartyId}
              onClose={() => setSelectedDistrictNumber(null)}
              onRefresh={handleRefresh}
            />
          ) : (
            <div style={{ ...glassPanelStyle, padding: '20px 18px' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                How to Play
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['🗺️', 'Click any district on the map to open the action panel.'],
                  ['📣', 'Rally a district to gain +5% support for your party.'],
                  ['🏳️', 'State-wide rally hits every district in that state.'],
                  ['💰', 'Fundraiser adds $200 to your party treasury (free).'],
                  ['⏱️', 'All queued actions resolve together at the next tick.'],
                  ['📊', 'Districts recolor after each tick to show the leading party.'],
                ].map(([emoji, text]) => (
                  <li key={emoji as string} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{emoji}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AP status card */}
          <div style={{ ...glassPanelStyle, padding: '12px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Action Points
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (myAp.current_ap / Math.max(1, myAp.ap_cap)) * 100)}%`,
                  background: myAp.current_ap < 2 ? T.red : T.mint,
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: myAp.current_ap < 2 ? T.red : T.mint }}>
                {myAp.current_ap} / {myAp.ap_cap}
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 6 }}>
              Regenerates 2 AP per tick
            </div>
          </div>
        </div>
      </div>

      {/* Spin keyframe (inline) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
