'use client';
/**
 * MapScreen.tsx — v2
 *
 * Layout: header stats → [map panel | side panel]
 * Map uses the new hex-grid DrenniaMap via districtData prop.
 * Side panel: instruction card → district action card on click.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { drenniaApi, DrenniaDistrict } from '@/lib/api';
import { T, MONO, HEADING, glassPanelStyle } from './_lib/theme';
import DrenniaMap, { HexDistrictData } from './_components/DrenniaMap';
import {
  Map, Megaphone, TrendingUp, X, Clock,
  AlertCircle, CheckCircle2, Loader2, ChevronRight, MousePointer,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  character: any;
  myAp?: { current_ap: number; ap_cap: number };
  parties?: any[];
  onRefresh?: () => void;
}

// ── Tick Countdown ──────────────────────────────────────────────────────────

function useTickCountdown() {
  const { data } = useSWR('drennia-tick-next', drenniaApi.getNextTick, { refreshInterval: 60_000 });
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!data?.next_tick_at) return;
    const target = new Date(data.next_tick_at).getTime();
    const tick = () => setSecs(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.next_tick_at]);
  return { secs, window: data?.current_tick_window ?? null };
}

function fmtCountdown(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Pill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      minWidth: 70,
    }}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: color ?? T.text, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function SupportBar({ pct, color, name, prev }: { pct: number; color: string; name: string; prev?: number }) {
  const delta = prev !== undefined ? pct - prev : null;
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.text, fontVariantNumeric: 'tabular-nums', display: 'flex', gap: 4 }}>
          {pct.toFixed(1)}%
          {delta !== null && (
            <span style={{ color: delta > 0 ? T.mint : delta < 0 ? T.red : T.faint, fontSize: 9 }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, pct)}%`,
          background: color, borderRadius: 3,
          transition: 'width 0.6s cubic-bezier(0.25,0.8,0.25,1)',
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
    </div>
  );
}

function ActionButton({ label, sublabel, icon, disabled, loading, onClick, color }: {
  label: string; sublabel: string; icon: React.ReactNode;
  disabled?: boolean; loading?: boolean; onClick: () => void; color: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        background: disabled ? 'rgba(255,255,255,0.02)' : hov ? `${color}20` : `${color}0D`,
        border: `1px solid ${disabled ? T.border : hov ? color + '60' : color + '30'}`,
        borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        textAlign: 'left', width: '100%', transition: 'all 0.18s ease',
      }}
    >
      <span style={{ color: disabled ? T.faint : color, flexShrink: 0 }}>
        {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: disabled ? T.faint : T.text }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 2 }}>{sublabel}</div>
      </div>
      {!disabled && <ChevronRight size={12} color={color} style={{ flexShrink: 0, opacity: 0.5 }} />}
    </button>
  );
}

// ── District Action Panel ──────────────────────────────────────────────────

function ActionPanel({ district, parties, myAp, onClose, onRefresh }: {
  district: DrenniaDistrict; parties: any[];
  myAp: { current_ap: number; ap_cap: number };
  onClose: () => void; onRefresh?: () => void;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const partyMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const supportEntries = Object.entries(district.support_json ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number));

  async function act(actionType: 'rally' | 'fundraiser', targetType: 'district' | 'state', key: string) {
    if (submitting) return;
    setSubmitting(key); setToast(null);
    const targetId = targetType === 'district' ? district.id : district.state_id;
    try {
      const r = await drenniaApi.submitAction({ action_type: actionType, target_type: targetType, target_id: targetId });
      setToast({ type: 'ok', msg: `${actionType === 'rally' ? 'Rally' : 'Fundraiser'} queued! AP remaining: ${r.ap_remaining ?? '?'}` });
      onRefresh?.();
    } catch (e: any) {
      setToast({ type: 'err', msg: e?.response?.data?.error || e?.message || 'Action failed' });
    } finally { setSubmitting(null); }
  }

  return (
    <div style={{ ...glassPanelStyle, padding: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '13px 16px', background: 'rgba(0,0,0,0.3)',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 3 }}>
            {district.state_name ?? 'Unknown State'} · #{district.district_number}
          </div>
          <div style={{ fontFamily: HEADING, fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
            {district.name}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, borderRadius: 6 }}>
          <X size={15} />
        </button>
      </div>

      {/* Leading party badge */}
      {district.leading_party_name && (
        <div style={{
          margin: '12px 16px 0',
          padding: '7px 12px',
          background: `${district.leading_party_color || T.gold}18`,
          border: `1px solid ${district.leading_party_color || T.gold}35`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: district.leading_party_color || T.gold, boxShadow: `0 0 6px ${district.leading_party_color || T.gold}80` }} />
          <div>
            <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>Leading: </span>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: T.text }}>{district.leading_party_name}</span>
          </div>
        </div>
      )}

      {/* Support bars */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          District Support
        </div>
        {supportEntries.length === 0
          ? <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>No data</div>
          : supportEntries.slice(0, 6).map(([pid, pct]) => {
            const p = partyMap[pid];
            return (
              <SupportBar
                key={pid}
                pct={pct as number}
                prev={district.prev_support_json?.[pid]}
                color={p?.color_hex || T.blue}
                name={p?.name || pid.slice(0, 8)}
              />
            );
          })
        }
        {supportEntries.length > 6 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 4 }}>
            +{supportEntries.length - 6} more parties…
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Actions
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            color: myAp.current_ap < 2 ? T.red : T.mint,
          }}>
            {myAp.current_ap} / {myAp.ap_cap} AP
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <ActionButton label="Rally District" sublabel="1 AP · +5pp for your party in this district"
            icon={<Megaphone size={13} />} color={T.blue}
            disabled={myAp.current_ap < 1} loading={submitting === 'rally-d'}
            onClick={() => act('rally', 'district', 'rally-d')} />

          <ActionButton label="State-Wide Rally" sublabel={`1 AP · +5pp in ALL districts in ${district.state_name ?? 'this state'}`}
            icon={<Megaphone size={13} />} color={T.blueBright}
            disabled={myAp.current_ap < 1} loading={submitting === 'rally-s'}
            onClick={() => act('rally', 'state', 'rally-s')} />

          <ActionButton label="Fundraiser" sublabel="Free · Adds $200 to your party treasury"
            icon={<TrendingUp size={13} />} color={T.mint}
            disabled={false} loading={submitting === 'fundraiser'}
            onClick={() => act('fundraiser', 'district', 'fundraiser')} />
        </div>

        {toast && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: toast.type === 'ok' ? T.mintDim : T.redDim,
            border: `1px solid ${toast.type === 'ok' ? T.mintGlow : T.redGlow}`,
            borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            {toast.type === 'ok'
              ? <CheckCircle2 size={13} color={T.mint} style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle size={13} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span style={{ fontFamily: MONO, fontSize: 10, color: toast.type === 'ok' ? T.mint : T.red, lineHeight: 1.4 }}>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Instruction card (no district selected) ────────────────────────────────

function InstructionCard() {
  return (
    <div style={{ ...glassPanelStyle, padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MousePointer size={13} color={T.blue} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.14em', textTransform: 'uppercase' }}>How to Play</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {([
          [T.blue,      'Click any hex on the map to open the action panel.'],
          [T.blueBright,'Rally a district to boost your party\'s support by +5pp.'],
          [T.gold,      'State-wide rally hits every district in that state.'],
          [T.mint,      'Fundraisers add $200 to your treasury — and they\'re free.'],
          [T.muted,     'All queued actions resolve together at the next tick (8h).'],
          [T.faint,     'District hex colors update after each tick to show who leads.'],
        ] as [string, string][]).map(([color, text], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

const STATE_DEFAULT_COLORS: Record<string, string> = {
  DRENNPORT: '#3A4E6B',
  IRONVALE:  '#5C4A80',
  GREENMERE: '#3A5E47',
  WESTMARK:  '#6B4A32',
};

export default function MapScreen({
  character,
  myAp = { current_ap: 0, ap_cap: 12 },
  parties = [],
  onRefresh,
}: Props) {
  const [selDn, setSelDn] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  const { data: districtData, mutate, isLoading } = useSWR(
    'drennia-districts', drenniaApi.getDistricts, { refreshInterval: 30_000 },
  );
  const { secs, window: tickWindow } = useTickCountdown();
  const districts = districtData?.districts ?? [];

  const partyMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  // Build hex data for the map
  const hexData = useMemo<Record<number, HexDistrictData>>(() => {
    const m: Record<number, HexDistrictData> = {};
    for (const d of districts) {
      const stateCode = d.state_code ?? 'VALE';
      const baseColor = d.leading_party_color
        ? d.leading_party_color
        : STATE_DEFAULT_COLORS[stateCode] ?? '#3A4E6B';

      // Determine leading pct
      const supportEntries = Object.entries(d.support_json ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number));
      const leadingPct = supportEntries.length > 0 ? (supportEntries[0][1] as number) : 0;

      m[d.district_number] = {
        fill: baseColor,
        stateCode,
        stateName: d.state_name ?? stateCode,
        districtName: d.name,
        leadingParty: d.leading_party_name ?? null,
        leadingPct,
      };
    }
    return m;
  }, [districts]);

  // Seat counts (districts where each party leads)
  const seatCounts = useMemo(() => {
    const m: Record<string, { count: number; color: string; name: string }> = {};
    for (const d of districts) {
      const pid = d.current_leading_party_id;
      if (!pid) continue;
      if (!m[pid]) {
        const p = partyMap[pid];
        m[pid] = { count: 0, color: p?.color_hex ?? d.leading_party_color ?? T.blue, name: p?.name ?? 'Unknown' };
      }
      m[pid].count++;
    }
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [districts, partyMap]);

  const selectedDistrict = useMemo(
    () => districts.find(d => d.district_number === selDn) ?? null,
    [districts, selDn],
  );

  const urgent = secs !== null && secs < 300;

  const handleClick = useCallback((dn: number) => setSelDn(p => p === dn ? null : dn), []);

  const handleRefresh = useCallback(async () => { await mutate(); onRefresh?.(); }, [mutate, onRefresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Map size={17} color={T.blue} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Electoral Map
            </div>
            <div style={{ fontFamily: HEADING, fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
              Drennia — {districts.length} Districts
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Seat pills */}
          <Pill label="Districts" value={districts.length} color={T.muted} />
          <Pill label="Contested" value={seatCounts.length > 0 ? districts.length - districts.filter(d => !d.current_leading_party_id).length : 0} color={T.blue} />

          {/* Tick countdown */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: urgent ? 'rgba(201,162,74,0.08)' : 'rgba(75,99,130,0.07)',
            border: `1px solid ${urgent ? T.goldLine : T.blueLine}`,
            borderRadius: 10,
          }}>
            <Clock size={13} color={urgent ? T.gold : T.blue} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Next Tick {tickWindow !== null ? `· #${tickWindow}` : ''}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: urgent ? T.gold : T.text, lineHeight: 1, letterSpacing: '0.04em' }}>
                {secs !== null ? fmtCountdown(secs) : '--:--:--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Party seat bar (only visible when there are leaders) ── */}
      {seatCounts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 4 }}>Seats</span>
          {seatCounts.map(({ name, color, count }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{name}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: T.text }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Body: map + panel ── */}
      <div style={{ display: 'flex', gap: 16, flex: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Map panel */}
        <div style={{
          ...glassPanelStyle,
          flex: '1 1 500px',
          padding: '16px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          position: 'relative', minWidth: 340,
        }}>
          {/* Controls */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} style={{ accentColor: T.blue }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>Show numbers</span>
            </label>
            {isLoading && <Loader2 size={14} color={T.blue} style={{ animation: 'spin 1s linear infinite' }} />}
          </div>

          {/* Map */}
          <DrenniaMap
            districtData={hexData}
            onDistrictClick={handleClick}
            selectedDistrict={selDn}
            showLabels={showLabels}
            width={Math.min(640, typeof window !== 'undefined' ? window.innerWidth - 400 : 580)}
          />

          {/* State legend */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(STATE_DEFAULT_COLORS).map(([code, color]) => (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>
                  {code === 'DRENNPORT' ? 'Drennport' : code === 'IRONVALE' ? 'Ironvale' : code === 'GREENMERE' ? 'Greenmere' : 'Westmark'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Action or instruction */}
          {selectedDistrict ? (
            <ActionPanel
              district={selectedDistrict}
              parties={parties}
              myAp={myAp}
              onClose={() => setSelDn(null)}
              onRefresh={handleRefresh}
            />
          ) : (
            <InstructionCard />
          )}

          {/* AP card */}
          <div style={{ ...glassPanelStyle, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Action Points</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: myAp.current_ap < 2 ? T.red : T.mint }}>
                {myAp.current_ap} / {myAp.ap_cap}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.min(100, (myAp.current_ap / Math.max(1, myAp.ap_cap)) * 100)}%`,
                background: myAp.current_ap < 2 ? T.red : myAp.current_ap < myAp.ap_cap * 0.5 ? T.gold : T.mint,
                boxShadow: `0 0 8px ${myAp.current_ap < 2 ? T.red : T.mint}60`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 6 }}>
              Regenerates +2 AP per tick
            </div>
          </div>

          {/* Parties legend card */}
          {parties.length > 0 && (
            <div style={{ ...glassPanelStyle, padding: '12px 16px' }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Parties
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parties.slice(0, 8).map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: p.color_hex ?? T.blue,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.abbreviation ?? p.name}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginLeft: 'auto', flexShrink: 0 }}>
                      {seatCounts.find(s => s.name === p.name)?.count ?? 0} seats
                    </span>
                  </div>
                ))}
                {parties.length > 8 && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>+{parties.length - 8} more…</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
