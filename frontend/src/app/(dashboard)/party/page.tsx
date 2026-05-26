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
    return <div className="text-zinc-600 text-xs font-mono text-center py-20">Loading party data...</div>;
  }

  if (!myParty) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">My Party</h1>
          <div className="text-zinc-600 text-[10px]">Political parties of Keldoria</div>
        </div>

        <TerminalPanel title="You Are Not Yet a Party Member">
          <div className="text-center py-6 space-y-3">
            <p className="text-zinc-500 text-xs">Join an existing party or found your own to begin your political career.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => router.push('/onboarding/join-party')} className="btn-primary">
                FOUND OR JOIN A PARTY
              </button>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title="All Parties in Keldoria" subtitle={`${allParties.length} registered parties`}>
          <div className="space-y-2">
            {allParties.sort((a, b) => b.seats - a.seats).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="w-1 self-stretch" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 text-xs font-bold">{p.name}</span>
                    <IdeologyBadge ideology={p.ideology} size="xs" />
                    {p.is_governing && <StatusBadge label="GOVERNING" variant="success" />}
                  </div>
                  <div className="text-zinc-500 text-[9px] mt-0.5">{p.slogan}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-zinc-300 font-mono text-sm font-bold">{p.seats}</div>
                  <div className="text-zinc-600 text-[8px]">seats</div>
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
    );
  }

  const monthlyStaffCost = staff.reduce((a, s) => a + Number(s.monthly_salary), 0);
  const partyFunds = Number(myParty.funds || 0);

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Party header */}
      <div className="border border-zinc-700 bg-zinc-900 p-4">
        <div className="flex items-start gap-4">
          <div className="w-1.5 self-stretch shrink-0" style={{ background: myParty.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-zinc-100 font-black text-xl">{myParty.name}</h1>
              <span className="text-zinc-500 text-sm font-mono">[{myParty.abbreviation}]</span>
              <IdeologyBadge ideology={myParty.ideology} />
              {myParty.is_governing && <StatusBadge label="GOVERNING PARTY" variant="success" dot />}
            </div>
            <div className="text-amber-400/80 text-xs italic mb-1">"{myParty.slogan}"</div>
            {myParty.description && (
              <p className="text-zinc-400 text-xs max-w-2xl">{myParty.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">My Role</div>
            <StatusBadge label={ROLE_LABELS[myMembership?.role]?.replace(/^.+ /, '') || 'Member'} variant="purple" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-0">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'staff', label: `AI Staff (${staff.length})` },
          { key: 'blocs', label: 'Voter Blocs' },
          { key: 'all', label: 'All Parties' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TerminalPanel title="Party Statistics">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Members</div>
                  <div className="text-zinc-300 font-mono text-xl font-bold">{myParty.member_count?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Parliament Seats</div>
                  <div className="text-zinc-300 font-mono text-xl font-bold">{myParty.seats} / {TOTAL_SEATS}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Party Funds</div>
                  <div className="text-emerald-400 font-mono text-xl font-bold">{fmtMoney(partyFunds)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Monthly Staff Cost</div>
                  <div className={`font-mono text-xl font-bold ${monthlyStaffCost > partyFunds * 0.1 ? 'text-amber-400' : 'text-zinc-300'}`}>
                    {fmtMoney(monthlyStaffCost)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Public Support</div>
                <GaugeBar value={Number(myParty.support_share)} label="Support Share" />
              </div>
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Parliamentary Presence</div>
                <GaugeBar value={myParty.seats / TOTAL_SEATS} label="Seat Share" />
              </div>
              <div className="border-t border-zinc-800 pt-3 grid grid-cols-2 gap-2 text-[9px] text-zinc-500">
                <div>HQ Region: <span className="text-zinc-300">{myParty.hq_region || '—'}</span></div>
                <div>Founded: <span className="text-zinc-300">{myParty.founded_year || '—'} AE</span></div>
                <div>Economic: <span className="text-zinc-300">{myParty.economic_stance?.replace(/_/g, ' ')}</span></div>
                <div>Social: <span className="text-zinc-300">{myParty.social_stance?.replace(/_/g, ' ')}</span></div>
              </div>
            </div>
          </TerminalPanel>

          <div className="space-y-3">
            <TerminalPanel title="Manifesto">
              <p className="text-zinc-400 text-xs leading-relaxed">
                {myParty.manifesto || 'No manifesto published.'}
              </p>
            </TerminalPanel>

            <TerminalPanel title="Campaign Actions">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '📣 Organize Rally', desc: '+bloc outreach', color: 'btn-secondary' },
                  { label: '📡 Press Campaign', desc: '+urban approval', color: 'btn-secondary' },
                  { label: '💰 Fundraise', desc: '+party treasury', color: 'btn-secondary' },
                  { label: '📋 Policy Release', desc: '+law quality', color: 'btn-secondary' },
                ].map(a => (
                  <div key={a.label} className="border border-zinc-800 p-2 hover:border-zinc-700 transition-colors cursor-pointer text-center">
                    <div className="text-zinc-200 text-[10px] font-bold">{a.label}</div>
                    <div className="text-zinc-600 text-[8px]">{a.desc}</div>
                  </div>
                ))}
              </div>
            </TerminalPanel>
          </div>
        </div>
      )}

      {/* ── STAFF TAB ────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-widest">
                Monthly Staff Cost: <span className="text-amber-400 font-mono">{fmtMoney(monthlyStaffCost)}</span>
                {' '}/ Party Funds: <span className="text-emerald-400 font-mono">{fmtMoney(partyFunds)}</span>
              </div>
              {hireMsg && (
                <div className={`text-[10px] font-mono mt-1 ${hireMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {hireMsg}
                </div>
              )}
            </div>
            {isLeader && (
              <button onClick={() => setShowHireModal(true)} className="btn-primary">
                + HIRE AI STAFF
              </button>
            )}
          </div>

          {/* Hire Modal */}
          {showHireModal && (
            <div className="border border-amber-800 bg-zinc-950 p-4 space-y-3">
              <div className="text-amber-400 font-bold text-sm uppercase tracking-widest">Hire AI Staff Member</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Role</label>
                  <select
                    value={hireRole}
                    onChange={e => setHireRole(e.target.value)}
                    className="terminal-input text-xs"
                  >
                    {STAFF_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Seniority</label>
                  <select
                    value={hireSeniority}
                    onChange={e => setHireSeniority(e.target.value as any)}
                    className="terminal-input text-xs"
                  >
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Name (optional)</label>
                  <input
                    value={hireName}
                    onChange={e => setHireName(e.target.value)}
                    placeholder="AI Staff"
                    className="terminal-input text-xs"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Monthly Cost</div>
                  <div className="text-amber-400 font-mono font-bold text-lg">{fmtMoney(hireCost)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleHire} disabled={hiring} className="btn-primary">
                  {hiring ? 'HIRING...' : 'CONFIRM HIRE'}
                </button>
                <button onClick={() => { setShowHireModal(false); setHireMsg(''); }} className="btn-secondary">
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {staff.length === 0 ? (
            <TerminalPanel title="No Staff Hired">
              <div className="text-center py-8 text-zinc-500 text-xs">
                Hire AI staff to automate campaign actions, raise funds, and improve election outcomes.
              </div>
            </TerminalPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
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
        <TerminalPanel title="Voter Bloc Affinities" subtitle="Blocs that favour this party">
          <div className="space-y-2">
            {voterBlocs.length === 0 ? (
              <div className="text-zinc-600 text-xs text-center py-6">Loading voter blocs...</div>
            ) : (
              voterBlocs.map((bloc: any) => (
                <div key={bloc.code} className="flex items-center gap-3 p-2 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 text-xs font-bold">{bloc.name}</span>
                      <span className="text-zinc-600 text-[8px]">{(bloc.population_share * 100).toFixed(1)}% of pop</span>
                    </div>
                    <div className="text-zinc-500 text-[8px]">{bloc.primary_ideology?.replace(/_/g, ' ')} · Turnout {(bloc.turnout_rate * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] text-zinc-600">Approval</div>
                    <div className={`text-xs font-mono font-bold ${bloc.approval > 0.6 ? 'text-emerald-400' : bloc.approval < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
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
        <TerminalPanel title="All Parties in Keldoria" subtitle={`${allParties.length} registered parties`}>
          <div className="space-y-2">
            {allParties.sort((a, b) => b.seats - a.seats).map((p: any) => (
              <div
                key={p.id}
                className={`flex items-start gap-3 p-2.5 border transition-colors ${
                  p.id === myParty.id ? 'border-amber-800 bg-amber-950/10' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="w-1 self-stretch shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-bold ${p.id === myParty.id ? 'text-amber-400' : 'text-zinc-200'}`}>
                      {p.name}
                    </span>
                    <IdeologyBadge ideology={p.ideology} size="xs" />
                    {p.is_governing && <StatusBadge label="GOVERNING" variant="success" />}
                    {p.id === myParty.id && <span className="text-[8px] text-amber-500">← YOUR PARTY</span>}
                  </div>
                  <div className="text-zinc-500 text-[8px] italic">{p.slogan}</div>
                  <div className="flex gap-3 mt-1 text-[8px] text-zinc-600">
                    <span>{p.member_count} members</span>
                    <span>{(Number(p.support_share) * 100).toFixed(1)}% support</span>
                    <span>Founded {p.founded_year} AE</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-zinc-300 font-mono text-lg font-bold">{p.seats}</div>
                  <div className="text-zinc-600 text-[8px]">seats</div>
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}
    </div>
  );
}
