'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DRENNIA_BUSINESS_ROOMS, getBusinessRoomsForState, getBusinessRoomById, type BusinessRoom, type BusinessRole, type DrenniaState } from '../../../data/livingWorld/drenniaBusinessRooms';
import { resolveBusinessRoom, type BusinessResolutionResult } from '../../../lib/businessRoomResolution';
import { getLetters, addLetter, markLetterRead, getUnreadCount, createWelcomeLetter, hasWelcomeLetter, type Letter } from '../../../data/livingWorld/letterSystem';
import DrenniaMapSvg from '../../../components/maps/DrenniaMapSvg';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = '#c9a84c';
const BG = '#0a0b0f';
const PANEL = '#0f1714';

const KEYS_TO_CLEAR = [
  'worldr_citizen_file_v1', 'worldr_character_origin_v1', 'worldr_living_world_entry_v1',
  'worldr_records_v1', 'worldr_letters_v1', 'worldr_business_rooms_v1',
  'worldr_room_history_v1', 'worldr_companies_v1', 'worldr_recent_world_events_v1',
  'worldr_life_records_v1', 'worldr_opportunity_history_v1', 'worldr_active_opportunities_v1',
  'worldr_power_rooms_v1', 'worldr_room_participation_v1',
];

const ROOM_TYPE_LABELS: Record<string, string> = {
  trade_morning: 'Trade Morning',
  ledger_shift: 'Ledger Shift',
  business_circle: 'Business Circle',
  market_day: 'Market Day',
  supplier_dispute: 'Supplier Dispute',
  finance_reception: 'Finance Reception',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  trade_morning: '#2AC58B',
  ledger_shift: '#60a5fa',
  business_circle: '#c9a84c',
  market_day: '#86efac',
  supplier_dispute: '#f59e0b',
  finance_reception: '#a78bfa',
};

const RISK_COLORS: Record<string, string> = {
  Low: '#34d399', Medium: '#f59e0b', High: '#f87171',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: GOLD }}>
        Opening The Chronicle…
      </div>
    </div>
  );
}

function FactorChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <span className="text-[7px] font-mono uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

function RoleCard({ role, selected, onClick }: { role: BusinessRole; selected: boolean; onClick: () => void }) {
  const riskColor = RISK_COLORS[role.riskLevel];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-sm transition-all duration-200"
      style={{
        padding: '12px 14px',
        background: selected ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.02)',
        border: selected ? `1.5px solid rgba(201,168,76,0.5)` : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start gap-2.5 mb-1">
        <div className="w-3 h-3 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center transition-all"
          style={{ borderColor: selected ? GOLD : 'rgba(255,255,255,0.2)', background: selected ? GOLD : 'transparent' }}>
          {selected && <div className="w-1.5 h-1.5 rounded-full" style={{ background: BG }} />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold mb-0.5" style={{ color: selected ? '#F4EBD6' : '#B9B09B' }}>{role.label}</div>
          <div className="text-[10px] leading-relaxed" style={{ color: '#7E8378' }}>{role.description}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-5 mt-1">
        <span className="text-[9px] font-mono" style={{ color: riskColor }}>Risk: {role.riskLevel}</span>
        <span className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>·</span>
        {role.cashGainRange[1] > 0 && (
          <span className="text-[9px] font-mono" style={{ color: '#34d399' }}>₯{role.cashGainRange[0]}–₯{role.cashGainRange[1]}</span>
        )}
        {role.publicRecordPossible && (
          <>
            <span className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>·</span>
            <span className="text-[9px] font-mono" style={{ color: '#7E8378' }}>📋 Public record possible</span>
          </>
        )}
      </div>
    </button>
  );
}

function OutcomeModal({ result, onClose, onOpenRecords, firstName }: {
  result: BusinessResolutionResult; onClose: () => void; onOpenRecords: () => void; firstName: string;
}) {
  const colors: Record<string, string> = { success: '#34d399', mixed: '#f59e0b', failure: '#f87171' };
  const color = colors[result.resultType];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(10,11,15,0.99)', border: `1px solid ${color}40`, boxShadow: `0 0 50px ${color}14, 0 20px 60px rgba(0,0,0,0.8)` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color }}>
            {result.resultType.toUpperCase()} · {result.narrativeTitle}
          </span>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: '#B9B09B', fontStyle: 'italic', borderLeft: `2px solid ${color}40`, paddingLeft: '12px' }}>
          {result.narrative}
        </p>

        {result.npcReaction && (
          <p className="text-xs" style={{ color: `${GOLD}90` }}>{result.npcReaction}</p>
        )}

        {/* Effects */}
        <div className="rounded-sm p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: '#3f4b47' }}>Changes to your file</div>
          {Object.entries(result.factorChanges).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs mb-0.5">
              <span style={{ color: '#B9B09B' }}>{k}</span>
              <span style={{ color: '#34d399' }}>+{v}</span>
            </div>
          ))}
          {result.cashChange > 0 && (
            <div className="flex justify-between text-xs mb-0.5">
              <span style={{ color: '#B9B09B' }}>Cash</span>
              <span style={{ color: '#34d399' }}>+₯{result.cashChange.toLocaleString()}</span>
            </div>
          )}
          {Object.keys(result.factorChanges).length === 0 && result.cashChange === 0 && (
            <div className="text-xs" style={{ color: '#3f4b47' }}>No changes to your file.</div>
          )}
        </div>

        {result.recordSummary && (
          <div className="text-[10px] leading-relaxed" style={{ color: '#7E8378', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '10px' }}>
            <span className="font-mono uppercase text-[8px] block mb-1" style={{ color: '#3f4b47' }}>Record Created</span>
            {result.recordSummary}
          </div>
        )}

        <div className="text-[10px] italic" style={{ color: '#3f4b47' }}>{result.nextSuggestion}</div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onOpenRecords}
            className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            Open Records
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: BG }}>
            Return to Chronicle
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(10,10,16,0.99)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="text-white font-bold text-sm">Restart Life?</div>
        <div className="text-[10px] font-mono leading-relaxed" style={{ color: '#3f4b47' }}>
          Type <strong style={{ color: '#f87171' }}>RESTART</strong> to confirm. This clears your citizen file, records, letters, companies, and room history. Login and pre-alpha access are kept.
        </div>
        <input type="text" placeholder="RESTART" value={input} onChange={e => setInput(e.target.value)}
          className="w-full rounded-sm px-4 py-2.5 text-sm outline-none bg-black/30 border border-white/[0.07] text-white uppercase focus:border-red-500/70 placeholder:normal-case"
        />
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!confirmed} onClick={onRestartCharacter}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40"
            style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }}>
            Restart Character Only
          </button>
          <button type="button" disabled={!confirmed} onClick={onRestartMotherland}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
            Restart From Motherland
          </button>
          <button type="button" onClick={onClose}
            className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-widest rounded-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Letter Panel ─────────────────────────────────────────────────────────────

function LetterPanel({ letters, onClose, onMarkRead }: {
  letters: Letter[]; onClose: () => void; onMarkRead: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Letter | null>(letters[0] ?? null);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: GOLD }}>Letters</div>
        <button onClick={onClose} className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>✕ Close</button>
      </div>
      {letters.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 opacity-40 text-center">
          <div className="text-2xl mb-2">✉</div>
          <div className="text-[11px]" style={{ color: '#7E8378' }}>No letters yet. Complete a room to receive correspondence.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {/* Letter list */}
          <div className="flex flex-col gap-2">
            {letters.map(l => (
              <button key={l.id} onClick={() => { setSelected(l); if (!l.read) onMarkRead(l.id); }}
                className="w-full text-left p-3 rounded-sm transition-all"
                style={{
                  background: selected?.id === l.id ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selected?.id === l.id ? `1px solid rgba(201,168,76,0.3)` : '1px solid rgba(255,255,255,0.05)',
                }}>
                <div className="flex items-center gap-2 mb-0.5">
                  {!l.read && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />}
                  <div className="text-[11px] font-semibold" style={{ color: '#F4EBD6' }}>{l.fromName}</div>
                </div>
                <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{l.subject}</div>
              </button>
            ))}
          </div>

          {/* Selected letter body */}
          {selected && (
            <div className="mt-3 p-4 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: `${GOLD}70` }}>From</div>
              <div className="text-sm font-bold mb-0.5" style={{ color: '#F4EBD6' }}>{selected.fromName}</div>
              <div className="text-[10px] font-mono mb-4" style={{ color: '#7E8378' }}>{selected.fromRole} · {selected.state}</div>
              <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: '#B9B09B', fontStyle: 'italic' }}>{selected.body}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Company Registration Panel ───────────────────────────────────────────────

interface CompanyForm {
  name: string;
  state: string;
  sector: string;
  startingCapital: number;
}

function CompanyRegistrationPanel({ cash, onRegister, onClose }: {
  cash: number; onRegister: (form: CompanyForm) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<CompanyForm>({ name: '', state: 'Westport State', sector: 'Shipping & Logistics', startingCapital: 500 });
  const canRegister = form.name.trim().length >= 3 && form.startingCapital >= 500 && form.startingCapital <= cash;

  const SECTORS = ['Retail & Consumer', 'Shipping & Logistics', 'Agriculture & Food', 'Manufacturing'];
  const STATES = ['Westport State', 'Drennport State', 'Greenmere State', 'Ironvale State'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}70` }}>Drennia Business Registry</div>
          <div className="text-lg font-bold" style={{ color: '#F4EBD6' }}>Register a Company</div>
        </div>
        <button onClick={onClose} className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>✕</button>
      </div>

      <div className="text-[10px] mb-4 leading-relaxed" style={{ color: '#7E8378' }}>
        Sole Trader registration. Minimum starting capital: ₯500. You will be the sole owner and operator.
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div>
          <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>Company Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Arras & Partners"
            className="w-full rounded-sm px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}
          />
        </div>

        <div>
          <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>State of Incorporation</label>
          <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            className="w-full rounded-sm px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
            {STATES.map(s => <option key={s} value={s} style={{ background: '#0a0b0f' }}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>Sector</label>
          <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
            className="w-full rounded-sm px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
            {SECTORS.map(s => <option key={s} value={s} style={{ background: '#0a0b0f' }}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>Starting Capital (₯)</label>
          <input
            type="number"
            min={500}
            max={cash}
            value={form.startingCapital}
            onChange={e => setForm(f => ({ ...f, startingCapital: Number(e.target.value) }))}
            className="w-full rounded-sm px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399' }}
          />
          <div className="text-[9px] mt-1 font-mono" style={{ color: '#3f4b47' }}>Available: ₯{cash.toLocaleString()}</div>
        </div>

        <button type="button" disabled={!canRegister} onClick={() => onRegister(form)}
          className="w-full py-3 mt-2 text-[11px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-30"
          style={{
            background: canRegister ? `linear-gradient(135deg, ${GOLD}, #a8882e)` : 'rgba(201,168,76,0.06)',
            color: canRegister ? BG : '#7E8378',
          }}>
          File Registration — ₯{form.startingCapital.toLocaleString()}
        </button>

        <div className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>Legal structure: Sole Trader · Drennia Business Registry</div>
      </div>
    </div>
  );
}

// ─── Main Chronicle Page ──────────────────────────────────────────────────────

export default function ChroniclePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);

  const [selectedState, setSelectedState] = useState<DrenniaState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<BusinessRoom | null>(null);
  const [selectedRole, setSelectedRole] = useState<BusinessRole | null>(null);
  const [resolving, setResolving] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<BusinessResolutionResult | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLetters, setShowLetters] = useState(false);
  const [showCompanyReg, setShowCompanyReg] = useState(false);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ledgerEvents, setLedgerEvents] = useState<string[]>([]);

  const [companies, setCompanies] = useState<any[]>([]);

  // Company registration unlock conditions
  const factors = citizenFile?.factors || { Credibility: 0, Charisma: 0, Influence: 0 };
  const cash = citizenFile?.personalMoney ?? citizenFile?.money ?? 0;
  const records: any[] = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('worldr_records_v1') || '[]')
    : [];
  const businessRecords = records.filter((r: any) => r.type === 'business');
  const businessContacts = records.filter((r: any) => r.type === 'contact');
  const companyUnlocked = cash >= 500 && businessRecords.length >= 1 && businessContacts.length >= 1;
  const hasCompany = companies.length > 0;

  const firstName = citizenFile
    ? (typeof citizenFile.name === 'object' ? citizenFile.name.first : citizenFile.name.split(' ')[0])
    : '';
  const fullName = citizenFile
    ? (typeof citizenFile.name === 'object'
        ? [citizenFile.name.first, citizenFile.name.last].filter(Boolean).join(' ')
        : citizenFile.name)
    : '—';

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

    // Load companies
    const comps = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
    setCompanies(comps);

    // Load letters + maybe create welcome letter
    const allLetters = getLetters();
    if (!hasWelcomeLetter()) {
      const welcome = createWelcomeLetter(cf);
      addLetter(welcome);
      setLetters([welcome, ...allLetters]);
      setUnreadCount(getUnreadCount());
    } else {
      setLetters(allLetters);
      setUnreadCount(getUnreadCount());
    }

    // Load ledger events
    const events = JSON.parse(localStorage.getItem('worldr_recent_world_events_v1') || '[]');
    const defaults = [
      'Saltgate Trade Morning opens before the tide.',
      'Westport Business Circle has one junior slot remaining.',
      'Greenmere Market Day is underway at the parish square.',
      'Ironvale Supplier Dispute remains unresolved.',
      'Drennport Finance Reception invitations are open.',
    ];
    setLedgerEvents([...events.slice(0, 2).map((e: any) => e.text || ''), ...defaults].filter(Boolean).slice(0, 5));
  }, [router]);

  const refreshCitizenFile = () => {
    const s = localStorage.getItem('worldr_citizen_file_v1');
    if (s) setCitizenFile(JSON.parse(s));
  };

  const handleMarkRead = useCallback((id: string) => {
    markLetterRead(id);
    setLetters(getLetters());
    setUnreadCount(getUnreadCount());
  }, []);

  const handleResolve = useCallback(() => {
    if (!selectedRoom || !selectedRole || !citizenFile) return;
    setResolving(true);
    const result = resolveBusinessRoom({ room: selectedRoom, role: selectedRole, citizenFile });

    // Apply factor changes
    const updated = { ...citizenFile, factors: { ...citizenFile.factors } };
    for (const [k, v] of Object.entries(result.factorChanges)) {
      updated.factors[k] = Math.max(0, (updated.factors[k] || 0) + (v as number));
    }
    updated.personalMoney = Math.max(0, (updated.personalMoney || updated.money || 0) + result.cashChange);
    updated.money = updated.personalMoney;
    updated.updatedAt = new Date().toISOString();

    if (result.newObligation && !updated.obligation) {
      updated.obligation = { type: 'business', description: result.newObligation, severity: 'minor' };
    }
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
    setCitizenFile(updated);

    // Save business record (prose)
    const recType = result.publicRecord ? 'business' : 'business';
    const newRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: recType,
      roomId: selectedRoom.id,
      roomTitle: selectedRoom.title,
      roomType: selectedRoom.type,
      roleId: selectedRole.id,
      roleLabel: selectedRole.label,
      result: result.resultType,
      visibility: result.publicRecord ? 'public' : 'private',
      state: selectedRoom.state,
      summary: result.recordSummary,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    localStorage.setItem('worldr_records_v1', JSON.stringify([newRecord, ...existing]));

    // Contact record if NPC interaction
    if (result.resultType !== 'failure' && selectedRoom.npcPresence.length > 0) {
      const npc = selectedRoom.npcPresence[0];
      const contactRec = {
        id: `cont_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'contact',
        npcName: npc.name,
        npcRole: npc.role,
        state: selectedRoom.state,
        summary: `Met ${npc.name} at ${selectedRoom.title}.`,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('worldr_records_v1', JSON.stringify([contactRec, newRecord, ...existing]));
    }

    // Room history
    const hist = JSON.parse(localStorage.getItem('worldr_room_history_v1') || '[]');
    localStorage.setItem('worldr_room_history_v1', JSON.stringify([{
      roomId: selectedRoom.id, roomTitle: selectedRoom.title,
      roleId: selectedRole.id, roleLabel: selectedRole.label,
      result: result.resultType, createdAt: new Date().toISOString(),
    }, ...hist]));

    // Ledger event
    const evText = result.resultType === 'success'
      ? `${firstName} completed work at ${selectedRoom.title} and left a record.`
      : `${firstName} attended ${selectedRoom.title}.`;
    const events = JSON.parse(localStorage.getItem('worldr_recent_world_events_v1') || '[]');
    localStorage.setItem('worldr_recent_world_events_v1', JSON.stringify([{ text: evText, at: new Date().toISOString() }, ...events].slice(0, 20)));
    setLedgerEvents(prev => [evText, ...prev].slice(0, 5));

    setResolving(false);
    setOutcomeResult(result);
  }, [selectedRoom, selectedRole, citizenFile, firstName]);

  const handleRegisterCompany = useCallback((form: CompanyForm) => {
    if (!citizenFile) return;
    const company = {
      id: `co_${Date.now()}`,
      ownerCharacterId: citizenFile.name,
      name: form.name,
      legalStructure: 'Sole Trader',
      state: form.state,
      sector: form.sector,
      cash: form.startingCapital,
      monthlyRevenue: 0,
      monthlyCosts: 0,
      reputation: 0,
      riskFlags: [],
      records: [],
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
    localStorage.setItem('worldr_companies_v1', JSON.stringify([company, ...existing]));
    setCompanies([company, ...existing]);

    // Deduct starting capital
    const updated = { ...citizenFile };
    updated.personalMoney = Math.max(0, (updated.personalMoney || 0) - form.startingCapital);
    updated.money = updated.personalMoney;
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
    setCitizenFile(updated);

    // Registration record
    const rec = {
      id: `rec_co_${Date.now()}`,
      type: 'business',
      summary: `Registered ${form.name} as a Sole Trader in ${form.state}. Initial capital filed: ₯${form.startingCapital.toLocaleString()}.`,
      createdAt: new Date().toISOString(),
    };
    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));

    setShowCompanyReg(false);
  }, [citizenFile]);

  const handleRestartCharacter = () => {
    KEYS_TO_CLEAR.forEach(k => localStorage.removeItem(k));
    router.push('/start/character');
  };
  const handleRestartMotherland = () => {
    KEYS_TO_CLEAR.forEach(k => localStorage.removeItem(k));
    ['worldr_selected_continent', 'worldr_selected_motherland'].forEach(k => localStorage.removeItem(k));
    router.push('/world-entry');
  };

  const stateRooms = selectedState ? getBusinessRoomsForState(selectedState) : [];

  if (!authorized) return <Spinner />;

  // Build room pins for map from business rooms
  const businessRoomPins = DRENNIA_BUSINESS_ROOMS.map(r => ({
    id: r.id,
    title: r.title,
    state: r.state as any,
    type: 'business' as const,
    x: r.mapPinX,
    y: r.mapPinY,
    participants: r.simulatedParticipants.length + 1,
    npc: r.npcPresence[0]?.name,
  }));

  // Drawer state
  const drawerContent: 'room' | 'state' | 'letters' | 'company_reg' | 'ledger' =
    showCompanyReg ? 'company_reg' :
    showLetters    ? 'letters' :
    selectedRoom   ? 'room' :
    selectedState  ? 'state' :
                     'ledger';

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: BG, fontFamily: 'sans-serif' }}
    >
      {/* ── Modals ── */}
      {outcomeResult && (
        <OutcomeModal
          result={outcomeResult}
          firstName={firstName}
          onClose={() => { setOutcomeResult(null); setSelectedRoom(null); setSelectedRole(null); refreshCitizenFile(); }}
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

      {/* ── TOP BAR ── */}
      <div
        className="shrink-0 w-full flex items-center gap-3 px-4"
        style={{
          height: '54px',
          background: 'rgba(15,23,19,0.95)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Brand */}
        <div className="font-serif font-bold uppercase tracking-widest text-xs shrink-0" style={{ color: GOLD }}>
          <span style={{ fontSize: '1.1em' }}>W</span>ORLDr
        </div>

        <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Identity */}
        <div className="shrink-0">
          <div className="text-xs font-semibold leading-none" style={{ color: '#F4EBD6' }}>{fullName}</div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: '#7E8378' }}>
            Age {citizenFile?.age ?? 18} · {citizenFile?.homeState ?? '—'} · Drennia
          </div>
        </div>

        <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Visible Factors: Credibility, Charisma, Influence */}
        <div className="hidden sm:flex items-center gap-1.5">
          <FactorChip label="Credibility" value={factors.Credibility ?? 0} color="#818cf8" />
          <FactorChip label="Charisma"    value={factors.Charisma ?? 0}    color="#34d399" />
          <FactorChip label="Influence"   value={factors.Influence ?? 0}   color="#f59e0b" />
        </div>

        <div className="w-px h-5 shrink-0 hidden sm:block" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Cash ₯ */}
        <div className="hidden sm:flex flex-col shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Cash</span>
          <span className="text-sm font-bold font-mono" style={{ color: '#34d399' }}>₯{cash.toLocaleString()}</span>
        </div>

        <div className="flex-1" />

        {/* Company unlock indicator */}
        {companyUnlocked && !hasCompany && (
          <button onClick={() => { setShowCompanyReg(true); setShowLetters(false); setSelectedRoom(null); setSelectedState(null); }}
            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-sm animate-pulse"
            style={{ background: 'rgba(201,168,76,0.12)', border: `1px solid rgba(201,168,76,0.4)`, color: GOLD }}>
            Company Registration Available
          </button>
        )}

        {/* Letter bell */}
        <button
          onClick={() => { setShowLetters(!showLetters); setShowCompanyReg(false); setSelectedRoom(null); }}
          className="relative flex items-center justify-center w-8 h-8 rounded-sm transition-all"
          style={{ background: showLetters ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showLetters ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}` }}
        >
          <span className="text-base">✉</span>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
              style={{ background: GOLD, color: BG }}>{unreadCount}</div>
          )}
        </button>

        {/* Restart */}
        <button onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-sm"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          Restart
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* MAP AREA */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'rgba(12,18,14,0.9)' }}>
          {/* Ledger ticker overlay */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="pointer-events-auto inline-flex max-w-sm overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: '10px', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                <span className="shrink-0 text-[8px] font-bold font-mono uppercase tracking-[0.22em]" style={{ color: GOLD }}>Ledger</span>
                {ledgerEvents.slice(0, 2).map((t, i) => (
                  <span key={i} className="shrink-0 text-[10px]" style={{ color: '#B9B09B' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* State label overlay if selected */}
          {selectedState && !selectedRoom && (
            <div className="absolute top-4 right-4 z-10">
              <div className="px-3 py-1.5 rounded-sm text-[10px] font-semibold"
                style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, color: GOLD }}>
                {selectedState}
              </div>
            </div>
          )}

          {/* SVG Map */}
          <div className="w-full h-full">
            <DrenniaMapSvg
              selectedState={selectedState}
              selectedRoomId={selectedRoom?.id}
              roomPins={businessRoomPins}
              onStateSelect={(state) => {
                setSelectedState(prev => prev === state ? null : state);
                setSelectedRoom(null);
                setSelectedRole(null);
                setShowLetters(false);
                setShowCompanyReg(false);
              }}
              onRoomSelect={(roomId) => {
                const room = getBusinessRoomById(roomId);
                if (room) {
                  setSelectedRoom(room);
                  setSelectedRole(null);
                  setSelectedState(room.state);
                  setShowLetters(false);
                  setShowCompanyReg(false);
                }
              }}
            />
          </div>

          {/* Bottom compact room rail */}
          {!selectedRoom && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide pointer-events-none">
              {DRENNIA_BUSINESS_ROOMS.slice(0, 4).map(room => {
                const typeColor = ROOM_TYPE_COLORS[room.type] || GOLD;
                return (
                  <button key={room.id}
                    className="pointer-events-auto shrink-0 flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-all"
                    style={{
                      background: 'rgba(10,11,15,0.9)', backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(201,168,76,0.18)',
                    }}
                    onClick={() => { setSelectedRoom(room); setSelectedRole(null); setSelectedState(room.state); }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor, boxShadow: `0 0 6px ${typeColor}` }} />
                    <div>
                      <div className="text-[11px] font-semibold leading-none" style={{ color: '#F4EBD6' }}>{room.title}</div>
                      <div className="text-[8px] mt-0.5 font-mono" style={{ color: '#7E8378' }}>{room.state}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT DRAWER ── */}
        <div
          className="shrink-0 flex flex-col overflow-hidden"
          style={{
            width: '400px',
            borderLeft: '1px solid rgba(201,168,76,0.15)',
            background: 'rgba(10,12,10,0.95)',
          }}
        >
          <div className="flex-1 overflow-y-auto p-5">

            {/* COMPANY REGISTRATION */}
            {drawerContent === 'company_reg' && (
              <CompanyRegistrationPanel
                cash={cash}
                onRegister={handleRegisterCompany}
                onClose={() => setShowCompanyReg(false)}
              />
            )}

            {/* LETTERS */}
            {drawerContent === 'letters' && (
              <LetterPanel
                letters={letters}
                onClose={() => setShowLetters(false)}
                onMarkRead={handleMarkRead}
              />
            )}

            {/* ROOM DETAIL */}
            {drawerContent === 'room' && selectedRoom && (
              <div className="flex flex-col">
                <button onClick={() => { setSelectedRoom(null); setSelectedRole(null); }}
                  className="self-end text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: '#7E8378' }}>
                  ✕ Close Room
                </button>

                {/* Room header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm"
                      style={{ background: `${ROOM_TYPE_COLORS[selectedRoom.type]}18`, color: ROOM_TYPE_COLORS[selectedRoom.type], border: `1px solid ${ROOM_TYPE_COLORS[selectedRoom.type]}40` }}>
                      {ROOM_TYPE_LABELS[selectedRoom.type]}
                    </span>
                    <span className="text-[8px] font-mono" style={{ color: '#3f4b47' }}>{selectedRoom.visibility} · {selectedRoom.timeRemainingLabel}</span>
                  </div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#F4EBD6' }}>{selectedRoom.title}</h2>
                  <div className="text-[10px] font-mono mb-3" style={{ color: '#7E8378' }}>{selectedRoom.state} · {selectedRoom.durationLabel}</div>
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#B9B09B', fontStyle: 'italic' }}>
                    {selectedRoom.atmosphere}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#B9B09B' }}>{selectedRoom.story}</p>
                </div>

                {/* NPCs */}
                <div className="mb-4">
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>Present</div>
                  {selectedRoom.npcPresence.map(npc => (
                    <div key={npc.name} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: `1px solid rgba(201,168,76,0.2)` }}>
                        {npc.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: '#F4EBD6' }}>{npc.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>{npc.role}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedRoom.simulatedParticipants.map(p => (
                      <div key={p.name} className="text-[9px] px-2 py-0.5 rounded-sm"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#7E8378' }}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stakes */}
                <div className="mb-4 p-3 rounded-sm" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: `${GOLD}70` }}>Stakes</div>
                  <div className="text-[11px]" style={{ color: '#B9B09B' }}>{selectedRoom.stakes}</div>
                </div>

                {/* Roles */}
                <div className="mb-4">
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: '#7E8378' }}>Choose Your Role</div>
                  <div className="flex flex-col gap-2">
                    {selectedRoom.roles.map(role => (
                      <RoleCard key={role.id} role={role} selected={selectedRole?.id === role.id} onClick={() => setSelectedRole(role)} />
                    ))}
                  </div>
                </div>

                {/* Resolve */}
                <button type="button" onClick={handleResolve} disabled={!selectedRole || resolving}
                  className="w-full py-3 text-[11px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-30 transition-all"
                  style={{
                    background: selectedRole ? `linear-gradient(135deg, ${GOLD}, #a8882e)` : 'rgba(201,168,76,0.06)',
                    color: selectedRole ? BG : '#7E8378',
                    boxShadow: selectedRole ? `0 4px 20px rgba(201,168,76,0.2)` : 'none',
                  }}>
                  {resolving ? 'Resolving…' : selectedRole ? `Enter · ${selectedRole.label}` : 'Select a Role'}
                </button>
              </div>
            )}

            {/* STATE DETAIL */}
            {drawerContent === 'state' && selectedState && (
              <div className="flex flex-col">
                <button onClick={() => setSelectedState(null)}
                  className="self-end text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: '#7E8378' }}>
                  ✕ Close
                </button>
                <div className="mb-5">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] mb-1" style={{ color: `${GOLD}60` }}>Territory</div>
                  <div className="text-2xl font-bold mb-3" style={{ color: '#F4EBD6' }}>{selectedState}</div>
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#7E8378' }}>
                  Active Rooms ({stateRooms.length})
                </div>
                <div className="flex flex-col gap-3">
                  {stateRooms.map(room => (
                    <button key={room.id} onClick={() => { setSelectedRoom(room); setSelectedRole(null); }}
                      className="w-full text-left p-4 rounded-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => { e.currentTarget.style.border = `1px solid rgba(201,168,76,0.3)`; }}
                      onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm"
                          style={{ background: `${ROOM_TYPE_COLORS[room.type]}18`, color: ROOM_TYPE_COLORS[room.type] }}>
                          {ROOM_TYPE_LABELS[room.type]}
                        </span>
                        <span className="text-[8px] font-mono" style={{ color: '#7E8378' }}>{room.visibility}</span>
                      </div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: '#F4EBD6' }}>{room.title}</div>
                      <div className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>{room.roles.length} roles · {room.timeRemainingLabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LEDGER DEFAULT */}
            {drawerContent === 'ledger' && (
              <div className="flex flex-col">
                <div className="text-[9px] font-mono uppercase tracking-[0.25em] mb-4" style={{ color: GOLD }}>
                  The Drennian Ledger
                </div>
                <div className="flex flex-col gap-3 mb-6">
                  {ledgerEvents.map((ev, i) => (
                    <div key={i} className="text-[11px] leading-relaxed py-2"
                      style={{ color: '#B9B09B', borderBottom: '1px solid rgba(255,255,255,0.04)', fontStyle: 'italic' }}>
                      {ev}
                    </div>
                  ))}
                </div>

                {/* Business rooms quick list */}
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#7E8378' }}>
                  Open Rooms in Drennia
                </div>
                <div className="flex flex-col gap-2">
                  {DRENNIA_BUSINESS_ROOMS.map(room => (
                    <button key={room.id} onClick={() => { setSelectedRoom(room); setSelectedRole(null); setSelectedState(room.state); }}
                      className="w-full text-left flex items-center gap-3 py-2 transition-all"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#F4EBD6'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#B9B09B'; }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ROOM_TYPE_COLORS[room.type], boxShadow: `0 0 6px ${ROOM_TYPE_COLORS[room.type]}` }} />
                      <div>
                        <div className="text-[12px] font-semibold" style={{ color: 'inherit' }}>{room.title}</div>
                        <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{room.state}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Company unlock hint */}
                {companyUnlocked && !hasCompany && (
                  <div className="mt-6 p-4 rounded-sm" style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.3)` }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: GOLD }}>Registration Available</div>
                    <div className="text-[11px] mb-3" style={{ color: '#B9B09B' }}>
                      You have met the requirements for Sole Trader registration.
                    </div>
                    <button onClick={() => { setShowCompanyReg(true); setShowLetters(false); setSelectedRoom(null); }}
                      className="w-full py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: BG }}>
                      Open Business Registry
                    </button>
                  </div>
                )}

                {hasCompany && (
                  <div className="mt-6 p-4 rounded-sm" style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>Your Company</div>
                    <div className="text-sm font-bold" style={{ color: '#F4EBD6' }}>{companies[0]?.name}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: '#7E8378' }}>
                      {companies[0]?.legalStructure} · {companies[0]?.state} · {companies[0]?.sector}
                    </div>
                    <div className="text-sm font-bold mt-2" style={{ color: '#34d399' }}>₯{(companies[0]?.cash || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
