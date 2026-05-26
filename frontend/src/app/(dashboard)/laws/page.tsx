'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { lawsApi, partiesApi, nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import ModalOverlay from '../../../components/ui/ModalOverlay';
import { Law } from '../../../types/game';

const VALDORIA_ID = KELDORIA_ID;

// Local mapping for display names of voter blocs matching DB codes
const BLOC_NAMES: Record<string, string> = {
  industrial_workers: 'Industrial Workers',
  union_members: 'Union Members',
  middle_class_professionals: 'Middle Class Professionals',
  urban_knowledge_workers: 'Urban Knowledge Workers',
  university_students: 'University Students',
  pensioners_elderly: 'Pensioners & Elderly',
  rural_conservatives: 'Rural Conservatives',
  small_business_owners: 'Small Business Owners',
  large_business_executives: 'Large Business & Executives',
  industrial_conglomerates: 'Industrial Conglomerates',
  immigrant_communities: 'Immigrant Communities',
  unemployed_precariat: 'Unemployed & Precariat'
};

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function LawsPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || VALDORIA_ID;

  // State
  const [laws, setLaws] = useState<Law[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [nation, setNation] = useState<any>(null);
  const [lawsConfig, setLawsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Tab filters
  const [statusFilter, setStatusFilter] = useState<'passed' | 'proposed' | 'repealed'>('proposed');

  // Draft Bill state
  const [billTitle, setBillTitle] = useState('National Reform Act');
  const [draftArticles, setDraftArticles] = useState<Array<{
    sectorKey: string;
    policyKey: string;
    optionKey: string;
    sectorName: string;
    policyName: string;
    optionName: string;
  }>>([]);
  const [selectedSectorKey, setSelectedSectorKey] = useState('economics');
  const [selectedPolicyKey, setSelectedPolicyKey] = useState('');
  const [selectedOptionKey, setSelectedOptionKey] = useState('');
  const [error, setError] = useState('');

  // Load data
  const loadData = () => {
    setLoading(true);
    Promise.all([
      lawsApi.getLaws(nationId).then(r => setLaws(r.data.laws || [])),
      partiesApi.getParties(nationId).then(r => setParties(r.data.parties || [])),
      nationApi.getState(nationId).then(r => setNation(r.data.nation || r.data)),
      lawsApi.getLawsConfig(nationId).then(r => setLawsConfig(r.data || []))
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [nationId]);

  // Helper to find currently active option for a policy key
  const getActiveOptionName = (policyKey: string) => {
    const passed = laws.filter(l => l.status === 'passed');
    for (const law of passed) {
      if (law.description) {
        try {
          const match = law.description.match(/\[METADATA:(.*)\]/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            if (parsed && parsed.policies) {
              const matchedP = parsed.policies.find((p: any) => p.policyKey === policyKey);
              if (matchedP) {
                // Find option display name from config
                const sector = lawsConfig.find((s: any) => s.key === matchedP.sectorKey);
                const policy = sector?.policies.find((p: any) => p.key === policyKey);
                const option = policy?.options.find((o: any) => o.key === matchedP.optionKey);
                return option ? option.name : 'Custom Active';
              }
            }
          }
        } catch (e) {}
      }
    }
    return 'None';
  };

  // UI calculations
  const totalSeats = 450;
  const majorityThreshold = Math.ceil(totalSeats / 2 + 1);

  // Voting Simulator Predictor
  const getVotePrediction = (law: Law) => {
    if (!law.description) return { yes: 0, no: 0, undecided: 450, breakdown: [] };
    
    try {
      const match = law.description.match(/\[METADATA:(.*)\]/);
      if (!match) return { yes: 0, no: 0, undecided: 450, breakdown: [] };
      const parsed = JSON.parse(match[1]);
      
      const proposerParty = parties.find((p: any) => p.is_governing) || parties[0];
      let yesSeats = 0;
      let noSeats = 0;
      const breakdown: any[] = [];

      const getIdeologyCompat = (id1: string, id2: string) => {
        if (id1 === id2) return 2;
        const compat: Record<string, Record<string, number>> = {
          socialist: { social_democrat: 2, green: 2, centrist: 1, socialist: 2 },
          social_democrat: { socialist: 2, green: 2, centrist: 1, technocratic: 1, social_democrat: 2 },
          green: { socialist: 2, social_democrat: 2, technocratic: 1, centrist: 1, libertarian: 1, green: 2 },
          centrist: { social_democrat: 2, conservative: 2, centrist: 2, socialist: 1, green: 1, libertarian: 1, technocratic: 1, nationalist: 1 },
          conservative: { nationalist: 2, libertarian: 2, centrist: 2, technocratic: 1, conservative: 2 },
          nationalist: { conservative: 2, centrist: 1, nationalist: 2 },
          libertarian: { conservative: 2, centrist: 1, technocratic: 1, green: 1, libertarian: 2 },
          technocratic: { green: 2, social_democrat: 1, conservative: 1, centrist: 1, libertarian: 1, technocratic: 2 }
        };
        return compat[id1]?.[id2] ?? -1;
      };

      for (const party of parties) {
        let vote = 'NO';
        if (party.is_governing) {
          vote = 'YES';
        } else if (proposerParty) {
          const compat = getIdeologyCompat(proposerParty.ideology, party.ideology);
          vote = (compat >= 1) ? 'YES' : 'NO';
        }

        if (vote === 'YES') {
          yesSeats += party.seats;
        } else {
          noSeats += party.seats;
        }

        breakdown.push({
          name: party.name,
          abbreviation: party.abbreviation,
          seats: party.seats,
          color: party.color,
          vote
        });
      }

      return { yes: yesSeats, no: noSeats, undecided: 0, breakdown };
    } catch {
      return { yes: 0, no: 0, undecided: 450, breakdown: [] };
    }
  };

  // Add selected policy change to the draft bill
  const handleAddArticle = () => {
    if (!selectedSectorKey || !selectedPolicyKey || !selectedOptionKey) return;
    
    const sector = lawsConfig.find((s: any) => s.key === selectedSectorKey);
    const policy = sector?.policies.find((p: any) => p.key === selectedPolicyKey);
    const option = policy?.options.find((o: any) => o.key === selectedOptionKey);
    
    if (!sector || !policy || !option) return;

    // Check if already in draft
    if (draftArticles.some((a: any) => a.policyKey === selectedPolicyKey)) {
      setError('An article for this policy area is already in the draft.');
      return;
    }

    setDraftArticles(prev => [...prev, {
      sectorKey: selectedSectorKey,
      policyKey: selectedPolicyKey,
      optionKey: selectedOptionKey,
      sectorName: sector.name,
      policyName: policy.name,
      optionName: option.name
    }]);

    setSelectedPolicyKey('');
    setSelectedOptionKey('');
    setError('');
  };

  // Remove article from draft
  const handleRemoveArticle = (index: number) => {
    setDraftArticles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit bill to backend
  const handleSubmitBill = async () => {
    if (draftArticles.length === 0) {
      setError('Please add at least one policy article to the bill.');
      return;
    }
    if (!billTitle.trim()) {
      setError('Please provide a title for the bill.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: billTitle,
        policies: draftArticles.map(a => ({
          sectorKey: a.sectorKey,
          policyKey: a.policyKey,
          optionKey: a.optionKey
        }))
      };
      await lawsApi.proposeBill(nationId, payload);
      setShowModal(false);
      setDraftArticles([]);
      setBillTitle('National Reform Act');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = laws.filter(l => l.status === statusFilter);

  // Active sector config
  const activeSector = lawsConfig.find((s: any) => s.key === selectedSectorKey);
  const activePolicy = activeSector?.policies.find((p: any) => p.key === selectedPolicyKey);
  const activeOption = activePolicy?.options.find((o: any) => o.key === selectedOptionKey);

  const proposalCost = 15.0; // 15.0M KDM

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Centered Government Title matching Nationhood target */}
      <div className="text-center space-y-1 py-4 border-b border-zinc-900/60 max-w-xl mx-auto mb-6">
        <h1 className="text-amber-400 font-black text-2xl uppercase tracking-widest glow-text-amber font-mono">
          PARLIAMENT LEGISLATION
        </h1>
        <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-widest leading-none">
          LEGISLATIVE DEBATES, BILLS, & CONSTITUTIONAL LAWS
        </p>
      </div>

      {/* Centered Propose Button */}
      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        {nation && (
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Treasury Balance: <span className="text-emerald-400 font-bold">${fmtMoney(Number(nation.treasury))}</span>
          </div>
        )}
        <button
          id="propose-bill-btn"
          onClick={() => {
            setShowModal(true);
            setDraftArticles([]);
            setError('');
          }}
          className="btn-premium-primary py-2 px-6 font-mono font-bold tracking-[0.2em] text-[10px]"
        >
          🏛️ PROPOSE LEGISLATIVE BILL
        </button>
      </div>

      {/* Tabs styled with custom gold underlines and borders */}
      <div className="flex justify-center gap-2 border-b border-zinc-900/80 pb-2 mb-4">
        {[
          { key: 'proposed', label: `Active Bills (${laws.filter(l => l.status === 'proposed').length})` },
          { key: 'passed', label: `Enacted Laws (${laws.filter(l => l.status === 'passed').length})` },
          { key: 'repealed', label: `Repealed (${laws.filter(l => l.status === 'repealed').length})` }
        ].map(tab => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-5 py-2 text-[10px] font-mono uppercase tracking-wider transition-all border-b-2 -mb-[10px] ${
                isActive
                  ? 'border-amber-500 text-amber-400 font-black glow-text-amber'
                  : 'border-transparent text-zinc-650 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-600 text-xs text-center py-12">Loading legislative records...</div>
          ) : filtered.length === 0 ? (
            <div className="text-zinc-600 text-xs text-center py-12 border border-zinc-900 bg-zinc-950/20">
              No bills found in this section.
            </div>
          ) : (
            filtered.map(law => {
              const { yes, no, breakdown } = getVotePrediction(law);
              return (
                <div key={law.id} className="border border-zinc-800 bg-zinc-950/40 p-4 hover:border-zinc-700 transition-colors space-y-3 animate-fade-in-up">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge
                          label={law.status.toUpperCase()}
                          variant={
                            law.status === 'passed' ? 'success' : law.status === 'proposed' ? 'warning' : 'neutral'
                          }
                          dot
                        />
                        <span className="text-zinc-100 text-xs font-bold font-mono uppercase tracking-wider">{law.title}</span>
                      </div>
                      <p className="text-zinc-500 text-[10px] font-mono leading-relaxed mt-2 whitespace-pre-line">
                        {law.description?.split('[METADATA:')[0].trim()}
                      </p>
                    </div>
                    <div className="text-[8px] text-zinc-600 font-mono tracking-widest">
                      {new Date(law.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Voting prediction indicator for Active Bills */}
                  {law.status === 'proposed' && (
                    <div className="border-t border-zinc-900 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                        <span>ESTIMATED PARLIAMENT SPLIT</span>
                        <span className="text-zinc-300">
                          {yes} YES / {no} NO (Need {majorityThreshold} to pass)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2 flex border border-zinc-800 rounded-sm overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(yes / totalSeats) * 100}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${(no / totalSeats) * 100}%` }} />
                      </div>
                      {/* Party details */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {breakdown.map((p: any, i: number) => (
                          <div key={i} className="text-[8px] font-mono border border-zinc-800 bg-zinc-900/30 px-1.5 py-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-zinc-400">{p.abbreviation}</span>
                            <span className="text-zinc-500">({p.seats})</span>
                            <span className={p.vote === 'YES' ? 'text-emerald-400' : 'text-rose-400'}>
                              {p.vote}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Parliament Makeup Sidebar */}
        <div className="space-y-3">
          <TerminalPanel title="Chamber Demographics">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                <span>SEATS ALLOCATION</span>
                <span>450 TOTAL</span>
              </div>
              <div className="space-y-1.5">
                {parties.sort((a,b) => b.seats - a.seats).map((party) => (
                  <div key={party.id} className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: party.color }} />
                      <span className="text-zinc-300 font-bold">{party.abbreviation}</span>
                      <span className="text-zinc-600 font-normal text-[8px]">({party.name})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{party.seats} seats</span>
                      {party.is_governing ? (
                        <span className="text-[8px] bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-1 py-0.2 uppercase font-black">Gov</span>
                      ) : (
                        <span className="text-[8px] bg-zinc-900/20 text-zinc-500 border border-zinc-800/40 px-1 py-0.2 uppercase font-semibold">Opp</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TerminalPanel>

          <TerminalPanel title="Voter Blocs Support Map">
            <div className="text-[9px] font-mono text-zinc-500 leading-relaxed">
              Passed laws directly affect the standing/approval of demographic groups, updating their political affinities and voter turnout. Keep your coalition blocs happy to secure the next election.
            </div>
          </TerminalPanel>
        </div>
      </div>

      {/* Redesigned Premium Propose Modal */}
      <ModalOverlay isOpen={showModal} onClose={() => setShowModal(false)} title="Draft New Bill" width="max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[70vh]">
          
          {/* 1. Sector Sidebar Selection */}
          <div className="border-r border-zinc-900 pr-3 space-y-1 flex flex-col overflow-y-auto">
            <label className="text-[8px] text-zinc-600 uppercase tracking-widest block mb-2 px-2">Choose Sector</label>
            {lawsConfig.map(sector => (
              <button
                key={sector.key}
                onClick={() => {
                  setSelectedSectorKey(sector.key);
                  setSelectedPolicyKey('');
                  setSelectedOptionKey('');
                }}
                className={`w-full text-left px-3 py-2 text-[10px] font-mono rounded transition-colors flex items-center gap-2 ${
                  selectedSectorKey === sector.key
                    ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
              >
                <span>{sector.icon}</span>
                <span className="truncate">{sector.name}</span>
              </button>
            ))}
          </div>

          {/* 2. Middle Editor: Policy Cards & Choice Selection */}
          <div className="md:col-span-2 space-y-3 flex flex-col overflow-y-auto px-1">
            {activeSector ? (
              <div className="space-y-4">
                {/* Sector Header */}
                <div>
                  <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                    {activeSector.name} Policies
                  </h3>
                  <p className="text-[9px] text-zinc-600 font-mono">
                    Select a policy topic and draft a change to the committee.
                  </p>
                </div>

                {/* Policies choices */}
                <div className="space-y-2">
                  {activeSector.policies.map((policy: any) => {
                    const activeOptionName = getActiveOptionName(policy.key);
                    return (
                      <div
                        key={policy.key}
                        onClick={() => {
                          setSelectedPolicyKey(policy.key);
                          setSelectedOptionKey('');
                        }}
                        className={`p-3 border text-left cursor-pointer transition-colors ${
                          selectedPolicyKey === policy.key
                            ? 'border-amber-500 bg-amber-950/5'
                            : 'border-zinc-900 hover:border-zinc-800 bg-zinc-950/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-mono font-bold text-zinc-200">{policy.name}</span>
                          <span className="text-[8px] font-mono text-amber-500/80 bg-amber-950/20 px-1.5 py-0.5 border border-amber-900/30">
                            Active: {activeOptionName}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-zinc-500 mt-1.5 leading-normal">
                          {policy.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Policy Option Config Selector */}
                {activePolicy && (
                  <div className="border-t border-zinc-900 pt-3 space-y-3 animate-fade-in-up">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-widest block font-mono">
                      Change To Option
                    </label>
                    <select
                      className="terminal-input text-[11px] font-mono"
                      value={selectedOptionKey}
                      onChange={e => setSelectedOptionKey(e.target.value)}
                    >
                      <option value="">-- Select new option --</option>
                      {activePolicy.options.map((opt: any) => {
                        const isActive = getActiveOptionName(activePolicy.key) === opt.name;
                        return (
                          <option key={opt.key} value={opt.key} disabled={isActive}>
                            {opt.name} {isActive ? '(Currently Active)' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Detailed Option Preview (PROS, CONS, BLOCS) */}
                    {activeOption && (
                      <div className="border border-zinc-800 bg-zinc-950/40 p-3 space-y-3 rounded-sm">
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                            {activeOption.name}
                          </div>
                          <p className="text-[9px] font-mono text-zinc-400 leading-relaxed">
                            {activeOption.description}
                          </p>
                        </div>

                        {/* Stat Modifiers */}
                        {activeOption.effects && activeOption.effects.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Stat Targets</div>
                            <div className="flex flex-wrap gap-1">
                              {activeOption.effects.map((eff: any, idx: number) => {
                                const sign = eff.modifier_value >= 0 ? '+' : '';
                                const isMultiplier = eff.modifier_type === 'multiplier';
                                const formattedVal = isMultiplier 
                                  ? `${(eff.modifier_value * 100).toFixed(0)}%` 
                                  : `${sign}${eff.modifier_value}`;
                                return (
                                  <span key={idx} className="text-[8px] font-mono border border-zinc-800 px-2 py-0.5 text-zinc-400">
                                    {eff.target_name}.{eff.parameter_name} → {formattedVal}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Voter Bloc standings */}
                        {activeOption.voterBlocStanding && (
                          <div className="space-y-1">
                            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Voter Bloc Standing</div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {Object.entries(activeOption.voterBlocStanding).map(([blocCode, value]: any) => {
                                const sign = value >= 0 ? '+' : '';
                                return (
                                  <div key={blocCode} className={`text-[8px] font-mono flex justify-between ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <span>{BLOC_NAMES[blocCode] || blocCode}</span>
                                    <span className="font-bold">{sign}{value}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add button */}
                        <button
                          onClick={handleAddArticle}
                          className="w-full btn-primary font-mono text-[9px] py-1 bg-amber-500 text-black hover:bg-amber-400"
                        >
                          + ADD TO BILL
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-600 text-xs text-center py-12 font-mono">Select a sector to view policies.</div>
            )}
          </div>

          {/* 3. Right Panel: Bill Outline & Submit */}
          <div className="border-l border-zinc-900 pl-3 flex flex-col justify-between h-full">
            <div className="space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-[8px] text-zinc-600 uppercase tracking-widest block font-mono mb-1">
                  Bill Title
                </label>
                <input
                  type="text"
                  value={billTitle}
                  onChange={e => setBillTitle(e.target.value)}
                  className="terminal-input text-[11px] font-mono"
                  placeholder="National Reform Act"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] text-zinc-600 uppercase tracking-widest block font-mono">
                  Bill Articles ({draftArticles.length})
                </label>
                {draftArticles.length === 0 ? (
                  <div className="text-[9px] font-mono text-zinc-600 italic py-4 text-center border border-zinc-900 bg-zinc-950/20">
                    No articles drafted. Add policies from the selector.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                    {draftArticles.map((art, idx) => (
                      <div key={idx} className="border border-zinc-900 bg-zinc-950/30 p-2 flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">{art.policyName}</div>
                          <div className="text-[9.5px] text-zinc-200 font-mono font-bold truncate">{art.optionName}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveArticle(idx)}
                          className="text-rose-500 hover:text-rose-400 font-mono text-[10px] px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2 border border-rose-900 bg-rose-950/20 text-rose-400 text-[9px] font-mono whitespace-pre-wrap">
                  ✕ {error}
                </div>
              )}
            </div>

            {/* Bill Footer Controls */}
            <div className="border-t border-zinc-900 pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-zinc-600">Draft cost:</span>
                <span className="text-zinc-300 font-bold">KDM {proposalCost.toFixed(1)}M</span>
              </div>
              <button
                onClick={handleSubmitBill}
                disabled={submitting || draftArticles.length === 0}
                className="w-full btn-primary py-2 font-mono text-[10px] font-bold tracking-wider"
              >
                {submitting ? 'SUBMITTING...' : 'SUBMIT BILL TO COMMITTEE'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full btn-secondary py-1.5 font-mono text-[9px] border border-zinc-800 text-zinc-500 hover:text-zinc-300"
              >
                CANCEL
              </button>
            </div>

          </div>

        </div>
      </ModalOverlay>
    </div>
  );
}
