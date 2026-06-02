'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DRENNIA_STATES, type State, type District, type Place } from '../../../data/business/drenniaDistricts';
import { reserveName, isNameReserved, saveCompany, getCompanies } from '../../../lib/businessCore';

const GOLD = '#D6B35F';

export default function ChroniclePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<any>(null);
  
  // Navigation State
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Business State
  const [hasCompany, setHasCompany] = useState(false);
  const [playerCash, setPlayerCash] = useState(0);

  // Registration State
  const [reserveInput, setReserveInput] = useState('');
  const [registerSector, setRegisterSector] = useState('Trade & Commerce');
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      setCitizenFile(cf);
      setPlayerCash(cf.wealth || 0);

      const characterId = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
      const companies = getCompanies();
      setHasCompany(companies.some(c => c.ownerCharacterId === characterId));
      
      // Load initial state
      const homeState = DRENNIA_STATES.find(s => s.name === cf.motherland) || DRENNIA_STATES.find(s => s.name === 'Drennport State');
      if (homeState) {
        setSelectedState(homeState);
        setSelectedDistrict(homeState.districts[0]);
      }
    }

    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    setRecentRecords(recs.slice(0, 5));

    setAuthorized(true);
  }, [router]);

  const updateCash = (amount: number) => {
    const newCash = playerCash + amount;
    setPlayerCash(newCash);
    if (citizenFile) {
      const updated = { ...citizenFile, wealth: newCash };
      setCitizenFile(updated);
      localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updated));
    }
  };

  const addRecord = (summary: string) => {
    const rec = { id: `rec_${Date.now()}`, type: 'business', summary, createdAt: new Date().toISOString() };
    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    const newRecs = [rec, ...recs];
    localStorage.setItem('worldr_records_v1', JSON.stringify(newRecs));
    setRecentRecords(newRecs.slice(0, 5));
  };

  const handleRestartLife = () => {
    if (typeof window !== 'undefined') {
      const keysToClear = [
        'worldr_citizen_file_v1', 'worldr_character_origin_v1', 'worldr_living_world_entry_v1',
        'worldr_records_v1', 'worldr_life_records_v1', 'worldr_letters_v1',
        'worldr_business_rooms_v1', 'worldr_room_history_v1', 'worldr_room_participation_v1',
        'worldr_companies_v1', 'worldr_reserved_business_names_v1', 'worldr_business_filings_v1',
        'worldr_contracts_v1', 'worldr_contract_bids_v1', 'worldr_business_offers_v1', 'worldr_recent_world_events_v1'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));
      window.location.href = '/start';
    }
  };

  if (!authorized) return null;

  const characterName = citizenFile ? (typeof citizenFile.name === 'object' ? `${citizenFile.name.first} ${citizenFile.name.last}` : citizenFile.name) : '';

  // Company Actions
  const handleReserveName = () => {
    if (!reserveInput.trim()) return alert('Enter a name.');
    if (playerCash < 10) return alert('Not enough cash.');
    if (isNameReserved(reserveInput)) return alert('Name already reserved or used.');
    
    updateCash(-10);
    reserveName(characterName, reserveInput);
    addRecord(`Reserved the business name ${reserveInput} at Drennport Company Registry.`);
    setReserveInput('');
    alert('Name reserved successfully!');
  };

  const handleRegisterCompany = () => {
    if (playerCash < 525) return alert('Not enough cash to register.');
    const reservedNames = JSON.parse(localStorage.getItem('worldr_reserved_business_names_v1') || '{}');
    const myReservedName = Object.keys(reservedNames).find(k => reservedNames[k] === characterName);
    
    if (!myReservedName) return alert('You must reserve a name first.');
    
    // Original capitalization if possible, otherwise capitalized key
    const finalName = myReservedName.charAt(0).toUpperCase() + myReservedName.slice(1);
    
    updateCash(-525);
    
    const newCompany = {
      id: `comp_${Date.now()}`,
      ownerCharacterId: characterName,
      ownerName: characterName,
      name: finalName,
      legalStructure: 'Sole Trader' as const,
      state: selectedState?.name || 'Drennport State',
      sector: registerSector,
      registeredAt: new Date().toISOString(),
      companyCash: 500,
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
    
    saveCompany(newCompany);
    setHasCompany(true);
    addRecord(`Registered ${finalName} as a Sole Trader in ${selectedState?.name || 'Drennport'}. Initial capital filed: ₯500.`);
    alert('Company registered successfully!');
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-white" style={{ background: '#0a0b0f' }}>
      
      {/* ─── TOP PLAYER BAR ─── */}
      <div className="flex justify-between items-center px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(12,18,14,0.9)' }}>
        <div className="flex items-center gap-4">
          <div className="text-[12px] font-bold tracking-widest" style={{ color: GOLD }}>WORLDr</div>
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="text-sm font-semibold">{characterName}</div>
          <div className="text-[10px] font-mono text-gray-400">Age 18</div>
          <div className="text-[10px] font-mono text-gray-400">{citizenFile?.motherland || 'Drennia'}</div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-gray-400">Credibility</span>
            <span className="text-xs font-mono">{citizenFile?.credibility || 50}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-gray-400">Charisma</span>
            <span className="text-xs font-mono">{citizenFile?.charisma || 50}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-gray-400">Influence</span>
            <span className="text-xs font-mono">{citizenFile?.influence || 10}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-gray-400">Cash</span>
            <span className="text-xs font-bold font-mono" style={{ color: '#34d399' }}>₯{playerCash}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors" style={{ color: GOLD }}>
            Letters
          </button>
          <button onClick={handleRestartLife} className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors">
            Restart Life
          </button>
        </div>
      </div>

      {/* ─── MAIN NAV is injected by Layout, so it's above this component ─── */}
      {/* We assume LivingWorldNav is already rendered outside. Wait, no, we need space below nav. The Layout provides the nav. */}

      <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6 pt-2">
        
        {/* ─── STATE TABS ─── */}
        <div className="flex gap-1 mb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {DRENNIA_STATES.map(s => (
            <button key={s.name} onClick={() => { setSelectedState(s); setSelectedDistrict(s.districts[0]); setSelectedPlace(null); }}
              className={`px-5 py-3 flex flex-col items-start rounded-t-sm transition-colors ${selectedState?.name === s.name ? 'bg-white/5' : 'hover:bg-white/5'}`}
              style={{ borderBottom: selectedState?.name === s.name ? `2px solid ${GOLD}` : '2px solid transparent' }}
            >
              <div className="text-[13px] font-bold" style={{ color: selectedState?.name === s.name ? '#F4EBD6' : '#7E8378' }}>{s.name.replace(' State', '')}</div>
              <div className="text-[9px] font-mono text-left" style={{ color: selectedState?.name === s.name ? '#B9B09B' : '#5f6560' }}>
                {s.name === 'Drennport State' ? 'Administration & Finance' : s.name === 'Westport State' ? 'Ports & Trade' : s.name === 'Ironvale State' ? 'Industry & Labour' : 'Agriculture & Community'}
              </div>
            </button>
          ))}
        </div>

        {/* ─── DISTRICT TABS ─── */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide py-1">
          {selectedState?.districts.map(d => (
            <button key={d.name} onClick={() => { setSelectedDistrict(d); setSelectedPlace(null); }}
              className="px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest rounded-full transition-all whitespace-nowrap"
              style={{
                background: selectedDistrict?.name === d.name ? 'rgba(214,179,95,0.12)' : 'transparent',
                border: `1px solid ${selectedDistrict?.name === d.name ? 'rgba(214,179,95,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: selectedDistrict?.name === d.name ? GOLD : '#7E8378',
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* ─── WORKSPACE GRID ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-4 flex-1 min-h-0">
          
          {/* LEFT: PLACES */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Places</h3>
            {selectedDistrict?.places.map(p => (
              <button key={p.id} onClick={() => setSelectedPlace(p)}
                className="p-3 rounded-sm text-left transition-colors border"
                style={{
                  background: selectedPlace?.id === p.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.01)',
                  borderColor: selectedPlace?.id === p.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'
                }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: selectedPlace?.id === p.id ? '#F4EBD6' : '#B9B09B' }}>{p.name}</div>
                <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{p.type}</div>
              </button>
            ))}
            {selectedDistrict?.places.length === 0 && (
              <div className="text-[10px] text-gray-500 italic">No places available here yet.</div>
            )}
          </div>

          {/* CENTER: ACTION WORKSPACE */}
          <div className="flex flex-col bg-black/40 border border-white/5 rounded-sm p-6 overflow-y-auto">
            {!selectedPlace ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-2xl mb-2">🏢</div>
                <div className="text-[11px] uppercase tracking-widest">Select a place to begin</div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#F4EBD6' }}>{selectedPlace.name}</h2>
                <p className="text-xs mb-8" style={{ color: '#B9B09B' }}>{selectedPlace.description || 'A location in ' + selectedDistrict?.name}</p>

                {selectedPlace.id === 'place_company_registry' && !hasCompany ? (
                  <div className="flex flex-col gap-6">
                    {/* Action 1: Reserve Name */}
                    <div className="p-5 border rounded-sm" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-white">Reserve Company Name</h4>
                        <div className="text-right">
                          <div className="text-[10px] font-mono" style={{ color: '#f87171' }}>Cost: ₯10</div>
                          <div className="text-[10px] font-mono text-gray-500">Visibility: Private Filing</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-4">File paperwork to lock a business name for future use.</p>
                      
                      <div className="flex gap-2">
                        <input type="text" value={reserveInput} onChange={e => setReserveInput(e.target.value)} placeholder="Enter desired name" 
                          className="flex-1 px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }} />
                        <button onClick={handleReserveName} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          Reserve
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Register Company */}
                    <div className="p-5 border rounded-sm" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-white">Register Sole Trader</h4>
                        <div className="text-right">
                          <div className="text-[10px] font-mono" style={{ color: '#f87171' }}>Cost: ₯525</div>
                          <div className="text-[10px] font-mono text-gray-500">Visibility: Public Registry</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-4">Incorporate your business legally. Requires a reserved name and ₯500 starting capital + ₯25 filing fee.</p>
                      
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Sector</label>
                          <select value={registerSector} onChange={e => setRegisterSector(e.target.value)} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                            <option>Trade & Commerce</option>
                            <option>Shipping & Logistics</option>
                            <option>Retail & Consumer</option>
                            <option>Finance</option>
                            <option>Manufacturing</option>
                            <option>Agriculture & Food</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={handleRegisterCompany} className="w-full py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: '#000' }}>
                        Register Company
                      </button>
                    </div>
                  </div>
                ) : selectedPlace.id === 'place_company_registry' && hasCompany ? (
                  <div className="p-6 text-center text-sm text-gray-400 border border-white/10 rounded-sm">
                    You have already registered a company. See your Company tab for details.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {selectedPlace.actions.map(a => (
                      <div key={a.id} className="p-4 border rounded-sm" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 className="text-sm font-bold text-white mb-2">{a.name}</h4>
                        <p className="text-[11px] text-gray-400">{a.description}</p>
                        <button disabled className="mt-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm opacity-50 cursor-not-allowed" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          Action Unavailable
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: LEDGER / NOTICES */}
          <div className="flex flex-col gap-6 overflow-y-auto pl-2">
            
            {/* Context */}
            <div className="p-4 rounded-sm border border-white/5 bg-black/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Current Selection</h3>
              <div className="text-xs text-gray-300"><span className="text-gray-500">State:</span> {selectedState?.name || '—'}</div>
              <div className="text-xs text-gray-300 mt-1"><span className="text-gray-500">District:</span> {selectedDistrict?.name || '—'}</div>
              <div className="text-xs text-gray-300 mt-1"><span className="text-gray-500">Place:</span> {selectedPlace?.name || '—'}</div>
            </div>

            {/* Registry Progress */}
            {!hasCompany && (
              <div className="p-4 rounded-sm border border-white/5 bg-black/40">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Business Registry Progress</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Reserved Name</span>
                    {Object.values(JSON.parse(localStorage.getItem('worldr_reserved_business_names_v1') || '{}')).includes(characterName) ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-red-400">No</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Cash Needed</span>
                    <span className={playerCash >= 525 ? "text-green-400" : "text-red-400"}>₯525</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Company Formed</span>
                    <span className="text-red-400">No</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Filings */}
            <div className="flex-1 flex flex-col p-4 rounded-sm border border-white/5 bg-black/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Recent Filings & Records</h3>
              {recentRecords.length === 0 ? (
                <div className="text-xs text-gray-600 italic">No recent records.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentRecords.map(r => (
                    <div key={r.id} className="text-[11px] leading-relaxed text-gray-300 border-l-2 pl-2" style={{ borderColor: GOLD }}>
                      {r.summary}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Market Notices */}
            <div className="p-4 rounded-sm border border-white/5 bg-black/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Market Notices</h3>
              <ul className="list-disc pl-4 text-[10px] text-gray-400 flex flex-col gap-2">
                <li>Drennport Commercial Bank reports steady liquidity.</li>
                <li>Port tariffs remain unchanged.</li>
                <li>Ironvale suppliers warn about material delays.</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
