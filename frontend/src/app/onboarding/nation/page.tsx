'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nationListApi, api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function NationPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [dbNations, setDbNations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContinent, setActiveContinent] = useState<string>('');
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    nationListApi.list()
      .then(res => {
        const list = res.data.nations || res.data || [];
        setDbNations(list);
        if (list.length > 0) {
          const firstContinent = list[0].continent || 'World';
          setActiveContinent(firstContinent.toLowerCase());
        }
      })
      .catch(() => {
        setError('Failed to fetch nation registry.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleJoinNation = async (nation: any) => {
    setJoining(nation.id);
    setError('');
    try {
      await api.patch('/auth/nation', { nation_id: nation.id });
      if (user) setUser({ ...user, nation_id: nation.id });
      router.push('/onboarding/join-party');
    } catch (err: any) {
      setError(err?.response?.data?.error || `Failed to enter ${nation.name}.`);
      setJoining(null);
    }
  };

  // Group unique continents
  const uniqueContinents = Array.from(
    new Set(dbNations.map(n => n.continent || 'World'))
  );

  const continentTabs = uniqueContinents.map(c => {
    const id = c.toLowerCase();
    return {
      id,
      label: c,
      subtitle: 'Simulated Domain',
      icon: '🌍',
      desc: `Simulated nations located in the continent of ${c}.`,
    };
  });

  const activeContinentObj = continentTabs.find(c => c.id === activeContinent) || {
    id: 'world',
    label: 'World',
    subtitle: 'Simulated Domain',
    icon: '🌍',
    desc: 'Simulated world regions.',
  };

  const filteredNations = dbNations.filter(n => {
    const cont = n.continent || 'World';
    return cont.toLowerCase() === activeContinent;
  });

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 step-badge">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4a945' }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em]">Step 2 of 3 · Nation Registry</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#f0d585' }}>
          Choose Your Nation
        </h1>
        <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(212,169,69,0.5)' }}>
          Select an active nation in the world state registry to govern. Each nation runs on the real-time simulation engine.
        </p>
      </div>

      {error && (
        <div className="error-box px-4 py-3 rounded-xl mb-6 text-xs font-mono flex items-center gap-2">
          <span>✕</span> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(212,169,69,0.4)', borderTopColor: '#d4a945' }} />
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(212,169,69,0.5)' }}>Accessing World Registry...</span>
        </div>
      ) : dbNations.length === 0 ? (
        <div className="text-center py-20 rounded-2xl onboarding-card" style={{ border: '1px dashed rgba(212,169,69,0.2)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="text-5xl mb-5">🌍</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#f0d585' }}>No nations available yet</h2>
          <p className="text-xs max-w-xs mx-auto leading-relaxed mb-6" style={{ color: 'rgba(212,169,69,0.45)' }}>
            The world starts completely blank. Factions, continents, and nations will be created manually from scratch. World creation is pending.
          </p>
          <button
            type="button"
            disabled
            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all opacity-50 cursor-not-allowed golden-btn"
          >
            Select Nation (Unavailable)
          </button>
        </div>
      ) : (
        <>
          {/* Continent tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {continentTabs.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveContinent(c.id)}
                className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 ${
                  activeContinent === c.id ? 'continent-tab-active' : 'continent-tab-inactive'
                }`}
              >
                <div className="text-xl mb-1.5">{c.icon}</div>
                <div className="text-xs font-bold tracking-wide" style={{ color: activeContinent === c.id ? '#d4a945' : 'rgba(212,169,69,0.55)' }}>
                  {c.label}
                </div>
                <div className="text-[9px] mt-0.5 font-medium" style={{ color: 'rgba(212,169,69,0.3)' }}>{c.subtitle}</div>
              </button>
            ))}
          </div>

          {/* Continent description */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-2xl mb-8 onboarding-card">
            <span className="text-2xl shrink-0 mt-0.5">{activeContinentObj.icon}</span>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-bold" style={{ color: '#f0d585' }}>{activeContinentObj.label}</span>
                <span className="text-[10px] font-medium" style={{ color: 'rgba(212,169,69,0.4)' }}>· {activeContinentObj.subtitle}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,169,69,0.45)' }}>{activeContinentObj.desc}</p>
            </div>
          </div>

          {/* Nations grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNations.map(nation => {
              const isJoining = joining === nation.id;
              const flagColors = nation.flag_colors ? nation.flag_colors.split(',') : ['#6b7280', '#4b5563', '#374151'];

              return (
                <div
                  key={nation.id}
                  className="relative rounded-2xl p-6 flex flex-col gap-4 nation-card-playable"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                      {flagColors.map((col: string, i: number) => (
                        <div key={i} className="w-8 h-2.5 rounded-sm" style={{ background: col }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-sm font-bold tracking-wide" style={{ color: '#f0d585' }}>{nation.name}</h2>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full border font-medium"
                          style={{
                            color: '#4ade80',
                            background: 'rgba(21,128,61,0.15)',
                            borderColor: 'rgba(21,128,61,0.35)',
                          }}
                        >
                          Playable
                        </span>
                      </div>
                      <div className="text-[10px] font-medium" style={{ color: 'rgba(212,169,69,0.45)' }}>Simulation Nation</div>
                      <div className="text-[9px] mt-0.5" style={{ color: 'rgba(212,169,69,0.3)' }}>📍 {nation.region || 'Unknown Region'}</div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,169,69,0.45)' }}>
                    An active player-created simulated nation state running in the world simulation.
                  </p>

                  {nation.motto && (
                    <div className="text-[10px] italic" style={{ color: 'rgba(212,169,69,0.3)' }}>"{nation.motto}"</div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'GDP', value: `₭${(Number(nation.gdp) / 1e12).toFixed(2)}T` },
                      { label: 'Population', value: `${(Number(nation.population_size || 50000000) / 1e6).toFixed(0)}M` },
                      { label: 'Approval', value: `${(Number(nation.approval) * 100).toFixed(0)}%` },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl px-2.5 py-2.5 text-center stat-box">
                        <div className="text-[8px] uppercase tracking-wider font-medium mb-1" style={{ color: 'rgba(212,169,69,0.35)' }}>{s.label}</div>
                        <div className="text-xs font-bold font-mono" style={{ color: '#d4a945' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(212,169,69,0.1)' }}>
                    <button
                      type="button"
                      id={`enter-${nation.id}-btn`}
                      disabled={joining !== null}
                      onClick={() => handleJoinNation(nation)}
                      className="w-full py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 golden-btn"
                    >
                      {isJoining ? '⏳ Establishing Governance...' : `Enter ${nation.name} →`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
