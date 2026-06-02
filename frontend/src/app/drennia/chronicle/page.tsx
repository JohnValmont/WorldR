
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DRENNIA_STATES, getDistrictsForState, type State, type District, type Place, type BusinessAction } from '../../../data/business/drenniaDistricts';
import { getLetters, markLetterRead, getUnreadCount, createWelcomeLetter, hasWelcomeLetter, type Letter, addLetter } from '../../../data/livingWorld/letterSystem';
import DrenniaMapSvg from '../../../components/maps/DrenniaMapSvg';

const GOLD = '#c9a84c';
const BG = '#0a0b0f';
const PANEL = '#0f1714';

const KEYS_TO_CLEAR = [
  'worldr_citizen_file_v1', 'worldr_character_origin_v1', 'worldr_living_world_entry_v1',
  'worldr_records_v1', 'worldr_letters_v1', 'worldr_business_rooms_v1',
  'worldr_room_history_v1', 'worldr_companies_v1', 'worldr_recent_world_events_v1',
  'worldr_life_records_v1', 'worldr_opportunity_history_v1', 'worldr_active_opportunities_v1',
  'worldr_power_rooms_v1', 'worldr_room_participation_v1',
  'worldr_reserved_business_names_v1', 'worldr_business_filings_v1',
  'worldr_contracts_v1', 'worldr_contract_bids_v1', 'worldr_business_offers_v1'
];

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

function DeleteModal({ onClose, onRestartCharacter, onRestartMotherland }: any) {
  const [input, setInput] = useState('');
  const confirmed = input.trim().toUpperCase() === 'RESTART';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(10,10,16,0.99)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="text-white font-bold text-sm">Restart Life?</div>
        <div className="text-[10px] font-mono leading-relaxed" style={{ color: '#3f4b47' }}>
          Type <strong style={{ color: '#f87171' }}>RESTART</strong> to confirm. This clears your citizen file, companies, contracts, records, and letters. Login and pre-alpha access are kept.
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

// ─── ACTION VIEWS ─────────────────────────────────────────────────────────────

function ActionResultModal({ title, prose, onClose }: { title: string; prose: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(10,11,15,0.99)', border: `1px solid ${GOLD}40`, boxShadow: `0 0 50px ${GOLD}14, 0 20px 60px rgba(0,0,0,0.8)` }}>
        <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: GOLD }}>{title}</div>
        <p className="text-sm leading-relaxed" style={{ color: '#B9B09B', fontStyle: 'italic', borderLeft: `2px solid ${GOLD}40`, paddingLeft: '12px' }}>
          {prose}
        </p>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: BG }}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTRY VIEWS ───────────────────────────────────────────────────────────

function RegistryActionView({ action, citizenFile, onComplete, onBack }: any) {
  const [reservedName, setReservedName] = useState('');
  const [sector, setSector] = useState('Shipping & Logistics');
  const [startingCapital, setStartingCapital] = useState(500);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cash = citizenFile?.personalMoney ?? citizenFile?.money ?? 0;

  // Load reserved names
  const reservedNames = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('worldr_reserved_business_names_v1') || '[]') : [];
  const myReservedNames = reservedNames.filter((r: any) => r.owner === citizenFile.name);
  const currentReservation = myReservedNames[0]?.name || '';

  const SECTORS = ['Retail & Consumer', 'Shipping & Logistics', 'Agriculture & Food', 'Manufacturing', 'Finance'];

  if (action.id === 'check-registration-reqs') {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back to Registry Office</button>
        <div className="text-lg font-bold" style={{ color: '#F4EBD6' }}>Registration Requirements</div>
        <div className="text-[12px] leading-relaxed" style={{ color: '#B9B09B' }}>
          To operate a legal business in Drennia, you must incorporate under a recognized structure. For independent citizens, this begins with a <strong>Sole Trader</strong> registration.
        </div>
        <div className="p-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ul className="text-[11px] list-disc list-inside flex flex-col gap-2" style={{ color: '#7E8378' }}>
            <li><strong style={{ color: '#F4EBD6' }}>Name Reservation:</strong> A unique business name must be reserved on the public ledger. Cost: <span style={{ color: '#f59e0b' }}>₯10</span></li>
            <li><strong style={{ color: '#F4EBD6' }}>Filing Fee:</strong> Administrative cost to the state. Cost: <span style={{ color: '#f59e0b' }}>₯25</span></li>
            <li><strong style={{ color: '#F4EBD6' }}>Starting Capital:</strong> Minimum liquidity required to prove solvency. Cost: <span style={{ color: '#34d399' }}>₯500</span> (held by the company)</li>
          </ul>
        </div>
        <div className="text-[10px] font-mono mt-2" style={{ color: '#3f4b47' }}>Total initial cash required: ₯535</div>
      </div>
    );
  }

  if (action.id === 'reserve-company-name') {
    const handleReserve = () => {
      if (cash < 10) return setErrorMsg('Insufficient cash (₯10 required)');
      if (reservedName.trim().length < 3) return setErrorMsg('Name must be at least 3 characters');
      if (myReservedNames.length > 0) return setErrorMsg('You already hold a reserved name');

      const updated = { ...citizenFile };
      updated.personalMoney = (updated.personalMoney || updated.money || 0) - 10;
      updated.money = updated.personalMoney;
      
      const newReservation = { name: reservedName.trim(), owner: citizenFile.name, reservedAt: new Date().toISOString() };
      localStorage.setItem('worldr_reserved_business_names_v1', JSON.stringify([...reservedNames, newReservation]));
      
      // Save record
      const rec = {
        id: `rec_${Date.now()}`, type: 'business',
        summary: `Reserved the business name ${newReservation.name} at Drennport Company Registry.`,
        createdAt: new Date().toISOString()
      };
      const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
      localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));
      
      onComplete(updated, 'Name Reserved', `You paid the ₯10 filing fee and reserved the name "${newReservation.name}" on the public ledger. It is yours to register.`);
    };

    return (
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back</button>
        <div className="text-lg font-bold" style={{ color: '#F4EBD6' }}>Reserve Company Name</div>
        
        {myReservedNames.length > 0 ? (
          <div className="p-3 text-[11px]" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
            You already hold the reserved name: <strong>{currentReservation}</strong>.
          </div>
        ) : (
          <>
            <div className="text-[11px]" style={{ color: '#B9B09B' }}>Securing a name prevents competitors from operating under it. Fee is ₯10.</div>
            <input type="text" value={reservedName} onChange={e => { setReservedName(e.target.value); setErrorMsg(null); }} placeholder="e.g. Arras & Partners"
              className="w-full rounded-sm px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }} />
            {errorMsg && <div className="text-[10px]" style={{ color: '#f87171' }}>{errorMsg}</div>}
            <button onClick={handleReserve} className="w-full py-3 mt-2 text-[11px] font-bold uppercase tracking-widest rounded-sm"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: BG }}>
              Reserve Name — ₯10
            </button>
          </>
        )}
      </div>
    );
  }

  if (action.id === 'register-sole-trader') {
    const handleRegister = () => {
      const required = 25 + startingCapital;
      if (cash < required) return setErrorMsg(`Insufficient cash (₯${required} required)`);
      if (!currentReservation) return setErrorMsg('You must reserve a name first.');
      if (startingCapital < 500) return setErrorMsg('Minimum starting capital is ₯500');

      const updated = { ...citizenFile };
      updated.personalMoney = (updated.personalMoney || updated.money || 0) - required;
      updated.money = updated.personalMoney;

      // Create company
      const company = {
        id: `co_${Date.now()}`,
        ownerCharacterId: citizenFile.name,
        ownerName: typeof citizenFile.name === 'object' ? `${citizenFile.name.first} ${citizenFile.name.last}` : citizenFile.name,
        name: currentReservation,
        legalStructure: 'Sole Trader',
        state: 'Drennport State', // Always Drennport in v1
        sector: sector,
        registeredAt: new Date().toISOString(),
        companyCash: startingCapital,
        monthlyRevenue: 0,
        monthlyCosts: 0,
        profit: 0,
        capacity: 1,
        reputation: 'New',
        reliability: 'Unproven',
        debt: 0,
        status: 'Active',
        activeContracts: [],
        publicRecords: [],
        riskFlags: []
      };
      const companies = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
      localStorage.setItem('worldr_companies_v1', JSON.stringify([...companies, company]));

      // Clear reservation
      const newReservations = reservedNames.filter((r: any) => r.name !== currentReservation);
      localStorage.setItem('worldr_reserved_business_names_v1', JSON.stringify(newReservations));

      // Save record
      const rec = {
        id: `rec_${Date.now()}`, type: 'business',
        summary: `Registered ${company.name} as a Sole Trader in Drennport. Initial capital filed: ₯${startingCapital.toLocaleString()}.`,
        createdAt: new Date().toISOString()
      };
      const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
      localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));

      onComplete(updated, 'Company Registered', `You have successfully registered ${company.name}. The ₯25 fee has been paid, and ₯${startingCapital} has been deposited into your new commercial accounts. You can now view your company in the Navigation.`);
    };

    return (
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back</button>
        <div className="text-lg font-bold" style={{ color: '#F4EBD6' }}>Register Sole Trader</div>
        
        {!currentReservation ? (
          <div className="p-3 text-[11px]" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            You do not hold a reserved business name. Reserve one first.
          </div>
        ) : (
          <>
            <div className="p-3 mb-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] font-mono uppercase" style={{ color: '#7E8378' }}>Reserved Name</div>
              <div className="text-[14px] font-bold" style={{ color: '#F4EBD6' }}>{currentReservation}</div>
            </div>
            
            <div>
              <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>Sector</label>
              <select value={sector} onChange={e => setSector(e.target.value)} className="w-full rounded-sm px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
                {SECTORS.map(s => <option key={s} value={s} style={{ background: '#0a0b0f' }}>{s}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[9px] font-mono uppercase tracking-widest block mb-1" style={{ color: '#7E8378' }}>Starting Capital (₯)</label>
              <input type="number" min={500} max={cash - 25} value={startingCapital} onChange={e => setStartingCapital(Number(e.target.value))}
                className="w-full rounded-sm px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399' }} />
              <div className="text-[9px] mt-1 font-mono flex justify-between" style={{ color: '#3f4b47' }}>
                <span>Min: ₯500</span><span>Filing Fee: ₯25</span>
              </div>
            </div>
            
            {errorMsg && <div className="text-[10px]" style={{ color: '#f87171' }}>{errorMsg}</div>}
            <button onClick={handleRegister} className="w-full py-3 mt-2 text-[11px] font-bold uppercase tracking-widest rounded-sm"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: BG }}>
              File Registration — ₯{startingCapital + 25}
            </button>
          </>
        )}
      </div>
    );
  }

  // Fallback for View Registry or others (will route to actual registry page later)
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back</button>
      <div className="text-sm font-bold" style={{ color: '#F4EBD6' }}>Action: {action.name}</div>
      <div className="text-[11px]" style={{ color: '#7E8378' }}>This desk is currently closed or being updated.</div>
    </div>
  );
}

// ─── MAIN CHRONICLE COMPONENT ─────────────────────────────────────────────────

export default function ChroniclePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);

  // New Selection State
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedAction, setSelectedAction] = useState<BusinessAction | null>(null);
  
  const [actionResult, setActionResult] = useState<{title: string, prose: string} | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    const motherland = localStorage.getItem('worldr_selected_motherland');
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    const entered = localStorage.getItem('worldr_living_world_entry_v1') === 'true';

    if (!granted)    { router.replace('/pre-alpha-access'); return; }
    if (!motherland) { router.replace('/world-entry'); return; }
    if (!fileStr || !entered) { router.replace('/start/character'); return; }

    setCitizenFile(JSON.parse(fileStr));
    setAuthorized(true);
  }, [router]);

  const handleRestartCharacter = () => {
    KEYS_TO_CLEAR.forEach(k => localStorage.removeItem(k));
    router.push('/start/character');
  };
  const handleRestartMotherland = () => {
    KEYS_TO_CLEAR.forEach(k => localStorage.removeItem(k));
    ['worldr_selected_continent', 'worldr_selected_motherland'].forEach(k => localStorage.removeItem(k));
    router.push('/world-entry');
  };

  const handleActionComplete = (updatedCitizen: any, title: string, prose: string) => {
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updatedCitizen));
    setCitizenFile(updatedCitizen);
    setSelectedAction(null);
    setActionResult({ title, prose });
  };

  if (!authorized) return <Spinner />;

  const factors = citizenFile?.factors || { Credibility: 0, Charisma: 0, Influence: 0 };
  const cash = citizenFile?.personalMoney ?? citizenFile?.money ?? 0;
  const firstName = citizenFile ? (typeof citizenFile.name === 'object' ? citizenFile.name.first : citizenFile.name.split(' ')[0]) : '';
  const fullName = citizenFile ? (typeof citizenFile.name === 'object' ? [citizenFile.name.first, citizenFile.name.last].filter(Boolean).join(' ') : citizenFile.name) : '—';

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: BG, fontFamily: 'sans-serif' }}>
      
      {/* Modals */}
      {actionResult && <ActionResultModal title={actionResult.title} prose={actionResult.prose} onClose={() => setActionResult(null)} />}
      {showDeleteModal && <DeleteModal onClose={() => setShowDeleteModal(false)} onRestartCharacter={handleRestartCharacter} onRestartMotherland={handleRestartMotherland} />}

      {/* ── TOP BAR ── */}
      <div className="shrink-0 w-full flex items-center gap-3 px-4" style={{ height: '54px', background: 'rgba(15,23,19,0.95)', borderBottom: '1px solid rgba(201,168,76,0.12)', backdropFilter: 'blur(8px)' }}>
        <div className="font-serif font-bold uppercase tracking-widest text-xs shrink-0" style={{ color: GOLD }}><span style={{ fontSize: '1.1em' }}>W</span>ORLDr</div>
        <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="shrink-0">
          <div className="text-xs font-semibold leading-none" style={{ color: '#F4EBD6' }}>{fullName}</div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: '#7E8378' }}>Age {citizenFile?.age ?? 18} · {citizenFile?.homeState ?? '—'} · Drennia</div>
        </div>
        <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="hidden sm:flex items-center gap-1.5">
          <FactorChip label="Credibility" value={factors.Credibility ?? 0} color="#818cf8" />
          <FactorChip label="Charisma"    value={factors.Charisma ?? 0}    color="#34d399" />
          <FactorChip label="Influence"   value={factors.Influence ?? 0}   color="#f59e0b" />
        </div>
        <div className="w-px h-5 shrink-0 hidden sm:block" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="hidden sm:flex flex-col shrink-0">
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Cash</span>
          <span className="text-sm font-bold font-mono" style={{ color: '#34d399' }}>₯{cash.toLocaleString()}</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          Restart Life
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* MAP AREA */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'rgba(12,18,14,0.9)' }}>
          <div className="w-full h-full">
            <DrenniaMapSvg
              selectedState={(selectedState?.name as any) || null}
              selectedRoomId={null} // Removed room pins
              roomPins={[]} // Removed room pins
              onStateSelect={(stateName) => {
                const stateObj = DRENNIA_STATES.find(s => s.name === stateName);
                if (stateObj) {
                  setSelectedState(stateObj);
                  setSelectedDistrict(null);
                  setSelectedPlace(null);
                  setSelectedAction(null);
                } else {
                  setSelectedState(null);
                }
              }}
              onRoomSelect={() => {}}
            />
          </div>
          
          {/* Ledger Ticker */}
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <div className="pointer-events-auto inline-flex overflow-hidden" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: '10px', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: '#B9B09B' }}>
                <span className="font-bold font-mono uppercase tracking-[0.22em]" style={{ color: GOLD }}>Ledger</span>
                <span>Drennport Commercial Bank reports steady liquidity.</span>
                <span>Port tariffs remain unchanged.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT DRAWER ── */}
        <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: '400px', borderLeft: '1px solid rgba(201,168,76,0.15)', background: 'rgba(10,12,10,0.95)' }}>
          <div className="flex-1 overflow-y-auto p-5">
            
            {/* ACTION VIEW */}
            {selectedAction && selectedPlace ? (
              <RegistryActionView action={selectedAction} citizenFile={citizenFile} onComplete={handleActionComplete} onBack={() => setSelectedAction(null)} />
            ) : 
            
            /* PLACE VIEW */
            selectedPlace ? (
              <div className="flex flex-col gap-4">
                <button onClick={() => setSelectedPlace(null)} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back to {selectedDistrict?.name}</button>
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: GOLD }}>{selectedPlace.type}</div>
                  <div className="text-xl font-bold" style={{ color: '#F4EBD6' }}>{selectedPlace.name}</div>
                  <div className="text-[11px] mt-1" style={{ color: '#B9B09B' }}>{selectedPlace.description}</div>
                </div>
                {selectedPlace.actions.length === 0 ? (
                  <div className="text-[10px] mt-4 opacity-50" style={{ color: '#7E8378' }}>No available actions here yet.</div>
                ) : (
                  <div className="flex flex-col gap-2 mt-4">
                    {selectedPlace.actions.map(act => (
                      <button key={act.id} onClick={() => setSelectedAction(act)} className="w-full text-left p-3 rounded-sm transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="text-sm font-bold mb-0.5" style={{ color: '#F4EBD6' }}>{act.name}</div>
                        <div className="text-[10px] mb-2 leading-relaxed" style={{ color: '#7E8378' }}>{act.description}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono" style={{ color: '#f59e0b' }}>Cost: {act.costLabel}</span>
                          <span className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>{act.resultType.toUpperCase()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : 
            
            /* DISTRICT VIEW */
            selectedDistrict ? (
              <div className="flex flex-col gap-4">
                <button onClick={() => setSelectedDistrict(null)} className="text-left text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#7E8378' }}>← Back to {selectedState?.name}</button>
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: GOLD }}>{selectedDistrict.function}</div>
                  <div className="text-xl font-bold" style={{ color: '#F4EBD6' }}>{selectedDistrict.name}</div>
                  <div className="text-[11px] mt-1" style={{ color: '#B9B09B' }}>{selectedDistrict.description}</div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {selectedDistrict.places.map(place => (
                    <button key={place.id} onClick={() => setSelectedPlace(place)} className="w-full text-left p-3 rounded-sm transition-all hover:bg-white/5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#F4EBD6' }}>{place.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{place.type}</div>
                      </div>
                      <span className="text-[14px]" style={{ color: GOLD }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : 
            
            /* STATE VIEW */
            selectedState ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: GOLD }}>{selectedState.businessFocus}</div>
                  <div className="text-xl font-bold" style={{ color: '#F4EBD6' }}>{selectedState.name}</div>
                  <div className="text-[11px] mt-1" style={{ color: '#B9B09B' }}>{selectedState.description}</div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {selectedState.districts.map(dist => (
                    <button key={dist.id} onClick={() => setSelectedDistrict(dist)} className="w-full text-left p-3 rounded-sm transition-all hover:bg-white/5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#F4EBD6' }}>{dist.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{dist.function}</div>
                      </div>
                      <span className="text-[14px]" style={{ color: GOLD }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : 
            
            /* IDLE VIEW */
            (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: GOLD }}>The Chronicle</div>
                <div className="text-sm" style={{ color: '#7E8378' }}>Select a state on the map to view districts, offices, markets, and business actions.</div>
                <div className="text-[10px] mt-8" style={{ color: '#3f4b47' }}>
                  FROZEN: Old Room Prototype Disabled.
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
