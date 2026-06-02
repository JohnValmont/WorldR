'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DRENNIA_STATES,
  DRENNIA_POWER_ROOMS,
  getRoomsForState,
  type PowerRoom,
  type RoomRole,
  type DrenniaState,
  type StateInfo,
} from '../../../data/livingWorld/drenniaPowerRooms';
import { resolveRoom, type ResolutionResult } from '../../../lib/roomResolution';
import DrenniaMapSvg from '../../../components/maps/DrenniaMapSvg';
import { drenniaRoomPins } from '../../../components/living-world/drenniaMapData';

const GOLD = '#D6B35F';
const KEYS_TO_CLEAR_ON_DELETE = [
  'worldr_citizen_file_v1','worldr_character_origin_v1','worldr_living_world_entry_v1',
  'worldr_life_records_v1','worldr_opportunity_history_v1','worldr_active_opportunities_v1',
  'worldr_power_rooms_v1','worldr_room_participation_v1','worldr_room_history_v1',
  'worldr_recent_world_events_v1',
];

// ─── Dot types ────────────────────────────────────────────────────────────────
const DOT_COLORS: Record<string, string> = {
  gold: '#D6B35F', green: '#34d399', blue: '#60a5fa', amber: '#fb923c',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  public_debate: 'Public Debate',
  work_contract: 'Work Contract',
  local_organizer: 'Organizer',
  business_circle: 'Business Circle',
  community_issue: 'Community Issue',
  political_observation: 'Civic Observation',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  public_debate: '#818cf8',
  work_contract: '#34d399',
  local_organizer: '#f59e0b',
  business_circle: '#60a5fa',
  community_issue: '#86efac',
  political_observation: '#c4b5fd',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#06100D' }}>
      <div className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: GOLD }}>
        Verifying clearance…
      </div>
    </div>
  );
}

function FactorPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#7E8378' }}>{label}</span>
      <span className="text-base font-bold" style={{ color: '#F4EBD6' }}>{value}</span>
    </div>
  );
}


function RoomDockCard({ room, onClick }: { room: PowerRoom; onClick: () => void }) {
  const typeColor = ROOM_TYPE_COLORS[room.type] || GOLD;
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 text-left transition-all duration-200 group"
      style={{
        width: '280px',
        height: '148px',
        borderRadius: '16px',
        padding: '14px 16px',
        background: 'rgba(12,22,18,0.88)',
        border: '1px solid rgba(139,164,155,0.14)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={e => { e.currentTarget.style.border = `1px solid rgba(214,179,95,0.34)`; }}
      onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(139,164,155,0.14)'; }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40` }}>
            {ROOM_TYPE_LABELS[room.type]}
          </span>
          <span className="text-[8px] font-mono" style={{ color: '#3f4b47' }}>{room.visibility}</span>
        </div>
        <div className="text-[13px] font-semibold leading-snug mb-1" style={{ color: '#F4EBD6' }}>{room.title}</div>
        <div className="text-[10px]" style={{ color: '#7E8378' }}>{room.state}</div>
      </div>
      <div>
        <div className="text-[9px] font-mono mb-1" style={{ color: '#3f4b47' }}>
          {room.simulatedPlayers.length + 1} present · {room.npcPresence[0]?.name} watching
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{room.roles.length} roles open</span>
          <span className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>{room.timeRemainingLabel}</span>
        </div>
      </div>
    </button>
  );
}

function RoleCard({ role, selected, onClick }: { role: RoomRole; selected: boolean; onClick: () => void }) {
  const riskColor = { Low: '#34d399', Medium: '#f59e0b', High: '#f87171' }[role.riskLevel];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200"
      style={{
        padding: '14px 16px',
        background: selected ? 'rgba(214,179,95,0.07)' : 'rgba(255,255,255,0.02)',
        border: selected ? `1.5px solid rgba(214,179,95,0.5)` : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start gap-2.5 mb-1.5">
        <div className="w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all"
          style={{ borderColor: selected ? GOLD : 'rgba(255,255,255,0.2)', background: selected ? GOLD : 'transparent' }}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#06100D]" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: selected ? '#F4EBD6' : '#B9B09B' }}>{role.label}</div>
          <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: '#7E8378' }}>{role.description}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-6">
        <span className="text-[9px] font-mono" style={{ color: riskColor }}>Risk: {role.riskLevel}</span>
        <span className="text-[9px] font-mono" style={{ color: '#7E8378' }}>·</span>
        <span className="text-[9px] font-mono" style={{ color: '#7E8378' }}>
          {role.publicRecordPossible ? '📋 Public record possible' : '🔒 Private'}
        </span>
        {role.limitedSlots && (
          <>
            <span className="text-[9px] font-mono" style={{ color: '#7E8378' }}>·</span>
            <span className="text-[9px] font-mono" style={{ color: '#fb923c' }}>Slots: {role.limitedSlots}</span>
          </>
        )}
      </div>
      <div className="text-[9px] mt-1.5 pl-6" style={{ color: '#34d399' }}>↑ {role.potentialGain}</div>
      <div className="text-[9px] pl-6" style={{ color: '#f87171' }}>⚠ {role.possibleRisk}</div>
    </button>
  );
}

function OutcomeModal({ result, onClose, onOpenRecords }: {
  result: ResolutionResult; onClose: () => void; onOpenRecords: () => void;
}) {
  const colors: Record<string, string> = { success: '#34d399', mixed: '#f59e0b', failure: '#f87171' };
  const color = colors[result.resultType];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(10,18,15,0.98)', border: `1px solid ${color}40`, boxShadow: `0 0 40px ${color}12, 0 20px 60px rgba(0,0,0,0.8)` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color }}>
            {result.resultType.toUpperCase()} · Score {Math.round(result.score)}
          </span>
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#F4EBD6' }}>{result.narrativeTitle}</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#B9B09B' }}>{result.narrative}</p>

        {result.npcReaction && (
          <p className="text-xs italic" style={{ color: `${GOLD}80`, borderLeft: `2px solid rgba(214,179,95,0.3)`, paddingLeft: '10px' }}>
            {result.npcReaction}
          </p>
        )}

        <div className="rounded-sm p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>Effects</div>
          {Object.entries(result.factorChanges).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span style={{ color: '#B9B09B' }}>{k}</span>
              <span style={{ color: '#34d399' }}>+{v}</span>
            </div>
          ))}
          {result.moneyChange > 0 && (
            <div className="flex justify-between text-xs mt-1">
              <span style={{ color: '#B9B09B' }}>Money</span>
              <span style={{ color: '#34d399' }}>+${result.moneyChange}</span>
            </div>
          )}
          {Object.keys(result.factorChanges).length === 0 && result.moneyChange === 0 && (
            <div className="text-xs" style={{ color: '#3f4b47' }}>No immediate factor changes.</div>
          )}
        </div>

        {result.recordSummary && (
          <div className="text-[10px] leading-relaxed" style={{ color: '#7E8378' }}>
            <span className="font-mono uppercase tracking-widest text-[8px] block mb-1" style={{ color: '#3f4b47' }}>Record Created</span>
            {result.recordSummary}
          </div>
        )}

        <div className="text-[10px] leading-relaxed italic" style={{ color: '#3f4b47' }}>
          {result.nextSuggestion}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onOpenRecords}
            className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            Open Records
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8944a)`, color: '#06100D' }}>
            Return to Map
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ onClose, onRestartCharacter, onRestartMotherland }: {
  onClose: () => void; onRestartCharacter: () => void; onRestartMotherland: () => void;
}) {
  const [input, setInput] = useState('');
  const confirmed = input.trim().toUpperCase() === 'RESTART';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(12,12,24,0.98)', border: '1px solid rgba(239,68,68,0.28)', boxShadow: '0 0 40px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.8)' }}>
        <div className="text-white font-bold text-sm">Delete Character?</div>
        <div className="text-[10px] font-mono leading-relaxed" style={{ color: '#3f4b47' }}>
          Type <strong style={{ color: '#f87171' }}>RESTART</strong> to confirm. This clears your citizen file, room history, life records, and world events. Login and pre-alpha access are kept.
        </div>
        <input type="text" placeholder="RESTART" value={input} onChange={e => setInput(e.target.value)}
          className="w-full rounded-sm px-4 py-2.5 text-sm font-sans outline-none bg-black/30 border border-white/[0.07] text-white focus:border-red-500/70 uppercase placeholder:normal-case"
        />
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!confirmed} onClick={onRestartCharacter}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40 transition-all"
            style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.40)', color: '#fbbf24' }}>
            Restart Character Only
          </button>
          <button type="button" disabled={!confirmed} onClick={onRestartMotherland}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40 transition-all"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.40)', color: '#f87171' }}>
            Restart From Motherland
          </button>
          <button type="button" onClick={onClose}
            className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-widest rounded-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DrenniaHomePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);

  const [selectedState, setSelectedState] = useState<DrenniaState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<PowerRoom | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoomRole | null>(null);
  const [resolving, setResolving] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<ResolutionResult | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [ticker, setTicker] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    const motherland = localStorage.getItem('worldr_selected_motherland');
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    const entered = localStorage.getItem('worldr_living_world_entry_v1') === 'true';

    if (!granted)    { router.replace('/pre-alpha-access'); return; }
    if (!motherland) { router.replace('/world-entry'); return; }
    if (!fileStr || !entered) { router.replace('/start/character'); return; }

    const cf = JSON.parse(fileStr);
    setCitizenFile(cf);
    setAuthorized(true);

    // Load ticker
    const events = JSON.parse(localStorage.getItem('worldr_recent_world_events_v1') || '[]');
    const defaults = [
      'Drennport Youth Debate gathered 6 young citizens.',
      'Westport Business Circle opened one sponsor slot.',
      'Workers\' Renewal Forum saw strong attendance in Ironvale.',
      'Greenmere Water Dispute mediation is ongoing.',
      'Port Ledger Apprenticeship has 3 placements remaining.',
    ];
    setTicker([...events.slice(0, 3).map((e: any) => e.text || ''), ...defaults].filter(Boolean).slice(0, 5));
  }, [router]);

  const factors = citizenFile?.factors || { Credibility: 0, Charisma: 0, Influence: 0, Resources: 0 };
  const money = citizenFile?.personalMoney ?? citizenFile?.money ?? 0;
  const fullName = citizenFile ? [citizenFile.name?.first, citizenFile.name?.last].filter(Boolean).join(' ') : '—';
  const homeState = citizenFile?.homeState || '—';

  const stateRooms = selectedState ? getRoomsForState(selectedState) : DRENNIA_POWER_ROOMS;
  const dockRooms = selectedState ? getRoomsForState(selectedState) : DRENNIA_POWER_ROOMS.slice(0, 6);

  const handleResolve = useCallback(() => {
    if (!selectedRoom || !selectedRole || !citizenFile) return;
    setResolving(true);
    const result = resolveRoom({ room: selectedRoom, role: selectedRole, citizenFile });

    // Apply factor changes
    const updated = { ...citizenFile };
    updated.factors = { ...updated.factors };
    for (const [k, v] of Object.entries(result.factorChanges)) {
      updated.factors[k] = Math.max(0, (updated.factors[k] || 0) + (v as number));
    }
    updated.personalMoney = Math.max(0, (updated.personalMoney || updated.money || 0) + result.moneyChange);
    updated.money = updated.personalMoney;
    updated.updatedAt = new Date().toISOString();

    if (result.newObligation && !updated.obligation) {
      updated.obligation = { type: 'room_obligation', description: result.newObligation, severity: 'minor' };
    }
    if (result.newVulnerability && !updated.vulnerability?.additionalVulnerability) {
      updated.vulnerability = { ...updated.vulnerability, additionalVulnerability: result.newVulnerability };
    }

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
    setCitizenFile(updated);

    // Life record
    const record = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      type: 'power_room',
      roomId: selectedRoom.id,
      roomTitle: selectedRoom.title,
      roomType: selectedRoom.type,
      roleId: selectedRole.id,
      roleLabel: selectedRole.label,
      result: result.resultType,
      visibility: result.publicRecord ? 'public' : 'private',
      state: selectedRoom.state,
      summary: result.recordSummary,
      effectsSummary: Object.entries(result.factorChanges).map(([k,v])=>`${k} +${v}`).join(', '),
      npcWitnesses: selectedRoom.npcPresence.map(n => n.name),
      participantsSnapshot: selectedRoom.simulatedPlayers.map(p => p.name),
      createdAt: new Date().toISOString(),
    };
    const records = JSON.parse(localStorage.getItem('worldr_life_records_v1') || '[]');
    localStorage.setItem('worldr_life_records_v1', JSON.stringify([record, ...records]));

    // Room history
    const histEntry = {
      roomId: selectedRoom.id, roomTitle: selectedRoom.title,
      roleId: selectedRole.id, roleLabel: selectedRole.label,
      result: result.resultType, createdAt: new Date().toISOString(),
    };
    const hist = JSON.parse(localStorage.getItem('worldr_room_history_v1') || '[]');
    localStorage.setItem('worldr_room_history_v1', JSON.stringify([histEntry, ...hist]));

    // World event
    const evText = result.resultType === 'success'
      ? `${citizenFile.name?.first || 'A citizen'} ${selectedRole.label.toLowerCase()}d at ${selectedRoom.title} and gained notice.`
      : `${citizenFile.name?.first || 'A citizen'} attended ${selectedRoom.title}.`;
    const events = JSON.parse(localStorage.getItem('worldr_recent_world_events_v1') || '[]');
    localStorage.setItem('worldr_recent_world_events_v1', JSON.stringify([{ text: evText, at: new Date().toISOString() }, ...events].slice(0, 20)));
    setTicker(prev => [evText, ...prev].slice(0, 5));

    setResolving(false);
    setOutcomeResult(result);
  }, [selectedRoom, selectedRole, citizenFile]);

  const handleRestartCharacter = () => {
    KEYS_TO_CLEAR_ON_DELETE.forEach(k => localStorage.removeItem(k));
    router.push('/start/character');
  };
  const handleRestartMotherland = () => {
    KEYS_TO_CLEAR_ON_DELETE.forEach(k => localStorage.removeItem(k));
    ['worldr_selected_continent','worldr_selected_motherland'].forEach(k => localStorage.removeItem(k));
    router.push('/world-entry');
  };

  if (!authorized) return <Spinner />;

  return (
    <div className="w-full flex flex-col gap-4 pb-6">

      {/* Modals */}
      {outcomeResult && (
        <OutcomeModal
          result={outcomeResult}
          onClose={() => { setOutcomeResult(null); setSelectedRoom(null); setSelectedRole(null); }}
          onOpenRecords={() => { setOutcomeResult(null); router.push('/drennia/records'); }}
        />
      )}
      {showDeleteModal && (
        <DeleteModal
          onClose={() => setShowDeleteModal(false)}
          onRestartCharacter={handleRestartCharacter}
          onRestartMotherland={handleRestartMotherland}
        />
      )}

      {/* ── TOP IDENTITY BAR ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-1"
        style={{ background: 'rgba(16,28,23,0.88)', border: '1px solid rgba(214,179,95,0.16)', borderRadius: '18px', padding: '12px 18px', minHeight: '72px' }}>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-0.5" style={{ color: `${GOLD}60` }}>WORLDr</div>
            <div className="text-base font-bold leading-none" style={{ color: '#F4EBD6' }}>{fullName}</div>
            <div className="text-[10px] font-mono mt-0.5" style={{ color: '#7E8378' }}>Age 18 · {homeState} · Drennia</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: '#34d399' }}>New Citizen</span>
          </div>
        </div>

        {/* Factor strip */}
        <div className="flex items-center gap-2">
          <FactorPill label="Credibility" value={factors.Credibility} />
          <FactorPill label="Charisma"    value={factors.Charisma} />
          <FactorPill label="Influence"   value={factors.Influence} />
          <FactorPill label="Resources"   value={factors.Resources} />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>Funds</div>
            <div className="text-sm font-bold font-mono" style={{ color: '#34d399' }}>${money.toLocaleString()}</div>
          </div>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-sm transition-all"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            Delete
          </button>
        </div>
      </div>

      {/* ── WORLD TICKER ── */}
      <div className="overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="shrink-0 text-[8px] font-mono uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>Live</span>
          {ticker.map((t, i) => (
            <span key={i} className="shrink-0 text-[10px]" style={{ color: '#7E8378' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── DRENNIA INTERACTIVE MAP ── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.25em] mb-3" style={{ color: '#7E8378' }}>
          Drennia Live Map
        </div>
        <div className="w-full relative rounded-[20px] overflow-hidden" style={{ background: 'rgba(12,22,18,0.92)', border: '1px solid rgba(214,179,95,0.14)' }}>
          <DrenniaMapSvg 
            selectedState={selectedState}
            selectedRoomId={selectedRoom?.id}
            roomPins={drenniaRoomPins}
            onStateSelect={(state) => {
              setSelectedState(prev => prev === state ? null : state);
              setSelectedRoom(null);
              setSelectedRole(null);
            }}
            onRoomSelect={(roomId) => {
              const room = DRENNIA_POWER_ROOMS.find(r => r.id === roomId);
              if (room) {
                setSelectedRoom(room);
                setSelectedRole(null);
                setSelectedState(room.state);
              }
            }}
          />
        </div>
      </div>

      {/* ── SELECTED STATE INFO BAR ── */}
      {selectedState && (
        <div className="rounded-sm px-5 py-4" style={{ background: 'rgba(12,22,18,0.7)', border: '1px solid rgba(214,179,95,0.12)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.22em] mb-1" style={{ color: `${GOLD}60` }}>Selected State</div>
              <div className="text-base font-bold mb-1" style={{ color: '#F4EBD6' }}>{selectedState}</div>
              <div className="text-[11px]" style={{ color: '#7E8378' }}>
                {DRENNIA_STATES.find(s => s.id === selectedState)?.identity}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>Active Rooms</div>
              <div className="text-xl font-bold" style={{ color: GOLD }}>{getRoomsForState(selectedState).length}</div>
            </div>
          </div>
          <div className="text-[9px] mt-2 font-mono" style={{ color: '#3f4b47' }}>
            {DRENNIA_STATES.find(s => s.id === selectedState)?.npcPresence}
          </div>
        </div>
      )}

      {/* ── LIVE ROOMS DOCK ── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.25em] mb-3" style={{ color: '#7E8378' }}>
          {selectedState ? `Live Rooms · ${selectedState}` : 'Live Rooms Near You'}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {dockRooms.map(room => (
            <RoomDockCard key={room.id} room={room} onClick={() => { setSelectedRoom(room); setSelectedRole(null); }} />
          ))}
        </div>
      </div>

      {/* ── ROOM DETAIL SLIDE-OVER ── */}
      {selectedRoom && (
        <div className="fixed inset-y-0 right-0 z-40 flex flex-col overflow-y-auto"
          style={{ width: '420px', background: 'rgba(9,19,15,0.98)', borderLeft: '1px solid rgba(214,179,95,0.18)', boxShadow: '-20px 0 60px rgba(0,0,0,0.42)', padding: '22px', paddingTop: '80px' }}>
          <button onClick={() => { setSelectedRoom(null); setSelectedRole(null); }}
            className="absolute top-5 right-5 text-[10px] font-mono uppercase tracking-widest transition-colors"
            style={{ color: '#7E8378' }}>
            ✕ Close
          </button>

          {/* Room header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm"
                style={{ background: `${ROOM_TYPE_COLORS[selectedRoom.type]}18`, color: ROOM_TYPE_COLORS[selectedRoom.type], border: `1px solid ${ROOM_TYPE_COLORS[selectedRoom.type]}40` }}>
                {ROOM_TYPE_LABELS[selectedRoom.type]}
              </span>
              <span className="text-[8px] font-mono" style={{ color: '#3f4b47' }}>
                {selectedRoom.visibility} · {selectedRoom.timeRemainingLabel}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: '#F4EBD6' }}>{selectedRoom.title}</h2>
            <div className="text-[10px] font-mono mb-3" style={{ color: '#7E8378' }}>{selectedRoom.state} · {selectedRoom.durationLabel}</div>
            <p className="text-[11px] leading-relaxed" style={{ color: '#B9B09B' }}>{selectedRoom.story}</p>
          </div>

          {/* NPCs */}
          <div className="mb-4">
            <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>NPCs Present</div>
            {selectedRoom.npcPresence.map(npc => (
              <div key={npc.name} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold font-mono shrink-0"
                  style={{ background: 'rgba(214,179,95,0.1)', color: GOLD, border: `1px solid rgba(214,179,95,0.2)` }}>
                  {npc.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[11px] font-semibold" style={{ color: '#F4EBD6' }}>{npc.name}</div>
                  <div className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>{npc.role} · {npc.institution}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Simulated players */}
          <div className="mb-4">
            <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>
              Simulated Citizens Present
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRoom.simulatedPlayers.map(p => (
                <div key={p.name} className="text-[9px] px-2 py-0.5 rounded-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#7E8378' }}>
                  {p.name} · {p.roleHint}
                </div>
              ))}
            </div>
            <div className="text-[8px] mt-1 font-mono italic" style={{ color: '#3f4b47' }}>
              Simulated citizens — not real players in pre-alpha v1.
            </div>
          </div>

          {/* Stakes */}
          <div className="mb-5 p-3 rounded-sm" style={{ background: 'rgba(214,179,95,0.05)', border: '1px solid rgba(214,179,95,0.12)' }}>
            <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: `${GOLD}70` }}>Stakes</div>
            <div className="text-[11px]" style={{ color: '#B9B09B' }}>{selectedRoom.stakes}</div>
          </div>

          {/* Role selection */}
          <div className="mb-5">
            <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: '#7E8378' }}>Select Your Role</div>
            <div className="flex flex-col gap-2.5">
              {selectedRoom.roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={selectedRole?.id === role.id}
                  onClick={() => setSelectedRole(role)}
                />
              ))}
            </div>
          </div>

          {/* Pre-alpha note */}
          <div className="mb-5 p-3 rounded-sm text-[9px] leading-relaxed font-mono" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#3f4b47' }}>
            Pre-alpha v1: rooms resolve immediately. Later versions will include timers, real players, NPC competition, and public deadlines.
          </div>

          {/* Resolve button */}
          <button
            type="button"
            onClick={handleResolve}
            disabled={!selectedRole || resolving}
            className="w-full py-3 text-[11px] font-bold uppercase tracking-[0.18em] rounded-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: selectedRole ? `linear-gradient(135deg, ${GOLD}, #b8944a)` : 'rgba(214,179,95,0.06)',
              color: selectedRole ? '#06100D' : '#7E8378',
              boxShadow: selectedRole ? `0 4px 20px rgba(214,179,95,0.18)` : 'none',
            }}>
            {resolving ? 'Resolving…' : selectedRole ? `Enter Room · ${selectedRole.label}` : 'Select a Role'}
          </button>
        </div>
      )}
    </div>
  );
}
