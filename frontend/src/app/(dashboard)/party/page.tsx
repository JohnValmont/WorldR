'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';
import { partiesApi, partyStaffApi, voterBlocsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import GaugeBar from '../../../components/ui/GaugeBar';
import IdeologyBadge from '../../../components/ui/IdeologyBadge';
import StaffCard from '../../../components/ui/StaffCard';

const TOTAL_SEATS = 450;

const ROLE_LABELS: Record<string, string> = {
  leader: '👑 Party Leader',
  deputy_leader: '🔰 Deputy Leader',
  secretary_general: '📋 Secretary General',
  treasurer: '💰 Treasurer',
  campaign_manager: '📣 Campaign Manager',
  policy_chief: '📊 Policy Chief',
  media_manager: '📡 Media Manager',
  whip: '⚖️ Parliamentary Whip',
  member: '• Member',
};

const STAFF_ROLES = [
  { value: 'campaign_worker', label: 'Campaign Worker', salaries: { junior: 45000, senior: 67500, expert: 99000 } },
  { value: 'media_advisor', label: 'Media Advisor', salaries: { junior: 95000, senior: 142500, expert: 209000 } },
  { value: 'policy_economist', label: 'Policy Economist', salaries: { junior: 120000, senior: 180000, expert: 264000 } },
  { value: 'party_strategist', label: 'Party Strategist', salaries: { junior: 160000, senior: 240000, expert: 352000 } },
  { value: 'recruitment_officer', label: 'Recruitment Officer', salaries: { junior: 65000, senior: 97500, expert: 143000 } },
  { value: 'fundraiser', label: 'Fundraiser', salaries: { junior: 80000, senior: 120000, expert: 176000 } },
  { value: 'parliamentary_whip', label: 'Parliamentary Whip', salaries: { junior: 75000, senior: 112500, expert: 165000 } },
];

function fmtMoney(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function PartyPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;
  const router = useRouter();

  const [myParty, setMyParty] = useState<any>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [allParties, setAllParties] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [voterBlocs, setVoterBlocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hire modal state
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireRole, setHireRole] = useState('campaign_worker');
  const [hireSeniority, setHireSeniority] = useState<'junior' | 'senior' | 'expert'>('junior');
  const [hireName, setHireName] = useState('');
  const [hiring, setHiring] = useState(false);
  const [hireMsg, setHireMsg] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'blocs' | 'all'>('overview');

  const loadData = async () => {
    await Promise.all([
      partiesApi.getMyParty(nationId).then(r => {
        setMyParty(r.data.party || null);
        setMyMembership(r.data.membership || null);
      }).catch(() => {}),
      partiesApi.getParties(nationId).then(r => setAllParties(r.data.parties || [])).catch(() => {}),
    ]);
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
    voterBlocsApi.getBlocs(nationId).then(r => setVoterBlocs(r.data.voterBlocs || r.data.blocs || [])).catch(() => {});
  }, [nationId]);

  useEffect(() => {
    if (myParty?.id) {
      partyStaffApi.getStaff(nationId, myParty.id)
        .then(r => setStaff(r.data.staff || []))
        .catch(() => {});
      
      partiesApi.getPartyDetails(nationId, myParty.id)
        .then(r => setMembers(r.data.members || []))
        .catch(() => {});
    }
  }, [myParty?.id, nationId]);

  const handleHire = async () => {
    if (!myParty?.id) return;
    setHiring(true);
    setHireMsg('');
    try {
      await partyStaffApi.hireStaff(nationId, myParty.id, {
        role: hireRole,
        name: hireName || undefined,
        seniority: hireSeniority,
      });
      setHireMsg('✓ Staff member hired successfully.');
      setShowHireModal(false);
      const r = await partyStaffApi.getStaff(nationId, myParty.id);
      setStaff(r.data.staff || []);
    } catch (err: any) {
      setHireMsg('✕ ' + (err?.response?.data?.error || 'Failed to hire.'));
    } finally {
      setHiring(false);
    }
  };

  const handleFire = async (staffId: string) => {
    if (!myParty?.id) return;
    try {
      await partyStaffApi.fireStaff(nationId, myParty.id, staffId);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch {}
  };

  const isLeader = myMembership?.role === 'leader';
  const selectedRoleData = STAFF_ROLES.find(r => r.value === hireRole);
  const hireCost = selectedRoleData?.salaries[hireSeniority] || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-amber-500/60 text-xs font-mono">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <span>Synchronizing with party servers...</span>
      </div>
    );
  }

  if (!myParty) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-amber-400 font-extrabold text-2xl uppercase tracking-widest">My Party</h1>
            <div className="text-zinc-500 text-xs font-mono">Select a political faction to enter the Bundestag</div>
          </div>
          <button 
            onClick={() => router.push('/onboarding/join-party')} 
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-lg"
          >
            🏛️ FOUND OR JOIN A PARTY
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TerminalPanel title="ALL REGISTERED PARTIES" subtitle={`${allParties.length} political organizations competing for power`}>
              {allParties.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                  No parties exist in this nation. Be the first to establish one!
                </div>
              ) : (
                <div className="space-y-3">
                  {allParties.sort((a, b) => b.seats - a.seats).map((p: any) => (
                    <div 
                      key={p.id} 
                      className="flex items-center gap-4 p-4 bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/90 transition-all rounded-xl shadow-md"
                    >
                      <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: p.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-200 text-sm font-extrabold">{p.name}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                            {p.abbreviation}
                          </span>
                          <IdeologyBadge ideology={p.ideology} size="xs" />
                          {p.is_governing && <StatusBadge label="GOVERNING" variant="success" dot />}
                        </div>
                        <div className="text-zinc-500 text-xs italic mt-1 font-mono">"{p.slogan || 'No official slogan published'}"</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-zinc-300 font-mono text-lg font-black">{p.seats}</div>
                        <div className="text-zinc-600 text-[9px] uppercase tracking-wider font-bold">seats</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerminalPanel>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-b from-amber-950/15 to-transparent border border-amber-900/30 rounded-2xl text-center space-y-4">
              <div className="text-4xl">🏛️</div>
              <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wider">Multipayer Factions Only</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                This game is completely multiplayer-driven. All parties are founded and operated by real players. 
                Enter the political landscape, form coalitions, or spark legislative opposition!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const monthlyStaffCost = staff.reduce((a, s) => a + Number(s.monthly_salary), 0);
  const partyFunds = Number(myParty.funds || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* ── HIGH PREMIUM HERO BANNER ──────────────────────────────────────── */}
      <div className="relative overflow-hidden border border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900/40 p-6 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-amber-500/5 to-transparent pointer-events-none rounded-full blur-3xl" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-2 h-16 shrink-0 rounded-full" style={{ background: myParty.color }} />
            <div>
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <h1 className="text-zinc-100 font-black text-2xl tracking-tight">{myParty.name}</h1>
                <span className="text-zinc-500 text-lg font-mono font-bold uppercase">[{myParty.abbreviation}]</span>
                <IdeologyBadge ideology={myParty.ideology} />
                {myParty.is_governing && <StatusBadge label="GOVERNING COALITION" variant="success" dot />}
              </div>
              <p className="text-amber-400/80 text-xs font-mono italic mb-2">"{myParty.slogan || 'No slogan published'}"</p>
              {myParty.description && (
                <p className="text-zinc-400 text-xs max-w-3xl leading-relaxed">{myParty.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-zinc-800 pt-4 lg:pt-0 gap-4">
            <div className="text-left lg:text-right">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Affiliation Status</div>
              <StatusBadge label={ROLE_LABELS[myMembership?.role]?.replace(/^.+ /, '') || 'Member'} variant="purple" />
            </div>
            {isLeader && (
              <span className="text-[10px] px-2 py-1 bg-amber-950/40 border border-amber-900/40 text-amber-400 font-mono rounded">
                🔑 Party Administrator
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── DUAL PANE SYSTEM ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PARTY ROSTER (REAL PLAYERS & DETERMINISTIC AI) ──────── */}
        <div className="lg:col-span-4 space-y-6">
          <TerminalPanel title="PARTY ROSTER & ROLES" subtitle="8 Seats - Cabinet & Administration">
            <div className="divide-y divide-zinc-900">
              {members.map((member: any) => {
                const isCurrentUser = member.user_id === user?.id;
                const isAI = member.is_ai;
                
                return (
                  <div 
                    key={member.user_id} 
                    className={`flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 transition-all ${
                      isCurrentUser ? 'bg-amber-950/10 px-2 rounded-xl -mx-2' : ''
                    }`}
                  >
                    {/* Role Avatar */}
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-xs font-mono border"
                      style={{ 
                        background: `${myParty.color}15`, 
                        borderColor: isCurrentUser ? '#f59e0b' : `${myParty.color}40`,
                        color: isCurrentUser ? '#f59e0b' : myParty.color
                      }}
                    >
                      {member.display_name?.charAt(0) || 'AI'}
                    </div>

                    {/* Member Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-extrabold truncate ${isCurrentUser ? 'text-amber-400' : 'text-zinc-200'}`}>
                          {member.display_name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[8px] font-black font-mono text-amber-500 bg-amber-950 border border-amber-900 px-1 py-0.5 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {ROLE_LABELS[member.role] || member.role}
                      </div>
                    </div>

                    {/* Roster Type Badge */}
                    <div className="shrink-0 text-right">
                      {isAI ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold rounded">
                          🤖 AI
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-teal-950/40 border border-teal-900/40 text-teal-400 font-mono font-bold rounded">
                          👤 PLAYER
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 border-t border-zinc-900 pt-4 text-[10px] text-zinc-500 leading-relaxed font-mono">
              ℹ️ A party can have a maximum of 2 real players. Empty roster slots are supported by AI delegates whose voting and campaign actions are directed by the active player leadership.
            </div>
          </TerminalPanel>
        </div>

        {/* RIGHT COLUMN: MAIN ACTIONS & TABS ───────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Elegant Modern Tabs Bar */}
          <div className="flex border-b border-zinc-800 pb-0 gap-2">
            {[
              { key: 'overview', label: '📊 Dashboard' },
              { key: 'staff', label: `👥 AI Staff (${staff.length})` },
              { key: 'blocs', label: '📈 Voter Blocs' },
              { key: 'all', label: '🏛️ All Parties' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 font-bold transition-all -mb-px ${
                  activeTab === tab.key
                    ? 'border-amber-500 text-amber-400 bg-amber-950/15'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Vibrant Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl shadow-md">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Seats Share</div>
                  <div className="text-zinc-200 font-mono text-lg font-black">{myParty.seats} <span className="text-xs text-zinc-500 font-normal">/ {TOTAL_SEATS}</span></div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ background: myParty.color, width: `${(myParty.seats / TOTAL_SEATS) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl shadow-md">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Support share</div>
                  <div className="text-zinc-200 font-mono text-lg font-black">{(Number(myParty.support_share) * 100).toFixed(1)}%</div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Number(myParty.support_share) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl shadow-md">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Party Funds</div>
                  <div className="text-emerald-400 font-mono text-lg font-black">{fmtMoney(partyFunds)}</div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-2">Available capital</div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl shadow-md">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Staff Costs</div>
                  <div className={`font-mono text-lg font-black ${monthlyStaffCost > partyFunds * 0.1 ? 'text-amber-500' : 'text-zinc-300'}`}>
                    {fmtMoney(monthlyStaffCost)}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-2">Monthly overhead</div>
                </div>

              </div>

              {/* Manifesto & Active Platforms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="md:col-span-2 space-y-4">
                  <TerminalPanel title="PARTY MANIFESTO & PROGRAM">
                    <p className="text-zinc-300 text-xs leading-relaxed font-mono whitespace-pre-line">
                      {myParty.manifesto || 'No manifesto published. Operational parameters default to centrist stance.'}
                    </p>
                    <div className="border-t border-zinc-900 mt-4 pt-4 grid grid-cols-2 gap-4 text-[10px] text-zinc-500 font-mono">
                      <div>HQ Region: <span className="text-zinc-300">{myParty.hq_region || 'Unassigned'}</span></div>
                      <div>Founded Year: <span className="text-zinc-300">{myParty.founded_year || '—'} AE</span></div>
                      <div>Economic: <span className="text-zinc-300 capitalize">{myParty.economic_stance?.replace(/_/g, ' ')}</span></div>
                      <div>Social: <span className="text-zinc-300 capitalize">{myParty.social_stance?.replace(/_/g, ' ')}</span></div>
                    </div>
                  </TerminalPanel>
                </div>

                {/* Campaign Actions */}
                <div className="space-y-4">
                  <TerminalPanel title="CAMPAIGN CENTER">
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { label: '📣 ORGANIZE RALLY', desc: 'Outreach to swing voter blocs', cost: '$150K' },
                        { label: '📡 PRESS CAMPAIGN', desc: 'Boost narrative sentiment', cost: '$80K' },
                        { label: '💰 TARGETED FUNDRAISER', desc: 'Generate capital from donors', cost: '$20K' },
                        { label: '📊 DRAFT POLICY', desc: 'Formulate bills for parliament', cost: '$50K' },
                      ].map(a => (
                        <div 
                          key={a.label} 
                          className="border border-zinc-800 bg-zinc-950/40 p-3 rounded-lg hover:border-zinc-600 hover:bg-zinc-950 transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-zinc-200 text-xs font-black tracking-wide group-hover:text-amber-400 transition-colors">
                              {a.label}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{a.cost}</span>
                          </div>
                          <p className="text-zinc-500 text-[10px] font-mono leading-tight">{a.desc}</p>
                        </div>
                      ))}
                    </div>
                  </TerminalPanel>
                </div>

              </div>

            </div>
          )}

          {/* ── STAFF TAB ────────────────────────────────────────────────── */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-300 font-mono uppercase tracking-widest">AI Operatives & Advisors</h3>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Operatives budget overhead: <span className="text-amber-500">{fmtMoney(monthlyStaffCost)}/mo</span>
                  </div>
                </div>
                {isLeader && (
                  <button 
                    onClick={() => setShowHireModal(true)} 
                    className="px-4 py-2 bg-zinc-900 border border-amber-500/50 hover:bg-amber-950/20 text-amber-400 text-xs font-bold font-mono tracking-widest uppercase transition-all rounded-lg active:scale-95 shadow-md"
                  >
                    + HIRE OPERATIVE
                  </button>
                )}
              </div>

              {hireMsg && (
                <div className={`p-3 text-xs font-mono border rounded-lg ${
                  hireMsg.startsWith('✓') 
                    ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
                    : 'bg-red-950/20 border-red-900/50 text-red-400'
                }`}>
                  {hireMsg}
                </div>
              )}

              {/* Hire Operative Modal */}
              {showHireModal && (
                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 shadow-xl animate-fade-in-up">
                  <h4 className="text-amber-400 font-bold text-sm uppercase tracking-wider font-mono">Commission AI Operative</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold mb-1.5 font-mono">Expertise Role</label>
                      <select
                        value={hireRole}
                        onChange={e => setHireRole(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:border-amber-500 focus:outline-none"
                      >
                        {STAFF_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold mb-1.5 font-mono">Seniority Rating</label>
                      <select
                        value={hireSeniority}
                        onChange={e => setHireSeniority(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="junior">Junior Grade</option>
                        <option value="senior">Senior Grade</option>
                        <option value="expert">Executive Advisor</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold mb-1.5 font-mono">Operative codename (optional)</label>
                      <input
                        value={hireName}
                        onChange={e => setHireName(e.target.value)}
                        placeholder="e.g. Agent Phoenix"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold mb-1.5 font-mono">Monthly retainer cost</div>
                      <div className="text-emerald-400 font-mono font-black text-xl">{fmtMoney(hireCost)}</div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button 
                      onClick={handleHire} 
                      disabled={hiring} 
                      className="px-5 py-2.5 bg-amber-500 text-black text-xs font-black uppercase tracking-wider rounded-lg hover:brightness-110 disabled:opacity-50"
                    >
                      {hiring ? 'COMMISSIONING...' : 'CONFIRM CONTRACT'}
                    </button>
                    <button 
                      onClick={() => { setShowHireModal(false); setHireMsg(''); }} 
                      className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-800"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {staff.length === 0 ? (
                <TerminalPanel title="NO HIRED STAFF">
                  <div className="text-center py-12 text-zinc-500 text-xs font-mono leading-relaxed">
                    No active operatives on payroll. Commission AI campaigners, media strategists, or regulatory experts to optimize party activities during world tick updates.
                  </div>
                </TerminalPanel>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staff.map((s: any) => (
                    <StaffCard
                      key={s.id}
                      staff={s}
                      onFire={handleFire}
                      canFire={isLeader}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VOTER BLOCS TAB ──────────────────────────────────────────── */}
          {activeTab === 'blocs' && (
            <TerminalPanel title="VOTER BLOC REPRESENTATION" subtitle="Electoral alignment with your platforms">
              <div className="space-y-3">
                {voterBlocs.length === 0 ? (
                  <div className="text-zinc-500 text-xs text-center font-mono py-12">Loading voter alignment matrices...</div>
                ) : (
                  voterBlocs.map((bloc: any) => (
                    <div 
                      key={bloc.code} 
                      className="flex items-center gap-4 p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl hover:border-zinc-700 hover:bg-zinc-950 transition-colors shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-200 text-sm font-extrabold">{bloc.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded">
                            {(bloc.population_share * 100).toFixed(1)}% weight
                          </span>
                        </div>
                        <div className="text-zinc-500 text-[10px] font-mono mt-1">
                          Primary Alignment: <span className="text-zinc-400 capitalize">{bloc.primary_ideology?.replace(/_/g, ' ')}</span> · Typical Turnout: <span className="text-zinc-400">{(bloc.turnout_rate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Popular Approval</div>
                        <div className={`text-sm font-mono font-black mt-0.5 ${
                          bloc.approval > 0.6 ? 'text-emerald-400' : bloc.approval < 0.4 ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {(bloc.approval * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TerminalPanel>
          )}

          {/* ── ALL PARTIES TAB ──────────────────────────────────────────── */}
          {activeTab === 'all' && (
            <TerminalPanel title="NATIONAL POLITICAL LANDSCAPE" subtitle={`${allParties.length} active player factions`}>
              <div className="space-y-3">
                {allParties.sort((a, b) => b.seats - a.seats).map((p: any) => {
                  const isUserParty = p.id === myParty.id;
                  
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 p-4 border rounded-xl shadow-md transition-all ${
                        isUserParty 
                          ? 'border-amber-800 bg-amber-950/10' 
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-950'
                      }`}
                    >
                      <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: p.color }} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-sm font-black ${isUserParty ? 'text-amber-400' : 'text-zinc-200'}`}>
                            {p.name}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                            {p.abbreviation}
                          </span>
                          <IdeologyBadge ideology={p.ideology} size="xs" />
                          {p.is_governing && <StatusBadge label="GOVERNING" variant="success" dot />}
                          {isUserParty && (
                            <span className="text-[9px] font-black font-mono text-amber-500 bg-amber-950 border border-amber-900 px-1 py-0.5 rounded">
                              YOUR FACTION
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-xs italic font-mono">"{p.slogan || 'No slogan published'}"</div>
                        <div className="flex gap-4 mt-2 text-[10px] text-zinc-500 font-mono">
                          <span>👤 {p.member_count} real players</span>
                          <span>📈 {(Number(p.support_share) * 100).toFixed(1)}% support</span>
                          <span>⏳ Founded {p.founded_year || '—'} AE</span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-zinc-300 font-mono text-lg font-black">{p.seats}</div>
                        <div className="text-zinc-600 text-[9px] uppercase tracking-wider font-bold">seats</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TerminalPanel>
          )}

        </div>

      </div>
    </div>
  );
}
