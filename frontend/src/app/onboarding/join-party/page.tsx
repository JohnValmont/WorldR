'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { partiesApi, KELDORIA_ID } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const IDEOLOGIES = [
  { value: 'far_left', label: 'Far Left' },
  { value: 'left', label: 'Left' },
  { value: 'centre_left', label: 'Centre Left' },
  { value: 'centrist', label: 'Centrist' },
  { value: 'centre_right', label: 'Centre Right' },
  { value: 'right', label: 'Right' },
  { value: 'far_right', label: 'Far Right' },
  { value: 'libertarian', label: 'Libertarian' },
  { value: 'green', label: 'Green' },
  { value: 'nationalist', label: 'Nationalist' },
  { value: 'socialist', label: 'Socialist' },
  { value: 'social_democrat', label: 'Social Democrat' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'technocratic', label: 'Technocratic' },
  { value: 'populist', label: 'Populist' },
  { value: 'religious_conservative', label: 'Religious Conservative' },
];

const COLOR_PRESETS = [
  { value: '#c9951a', label: 'Gold' },
  { value: '#e11d48', label: 'Crimson' },
  { value: '#ea580c', label: 'Flame' },
  { value: '#16a34a', label: 'Forest' },
  { value: '#0891b2', label: 'Teal' },
  { value: '#2563eb', label: 'Royal Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#db2777', label: 'Rose' },
  { value: '#64748b', label: 'Steel' },
  { value: '#292524', label: 'Obsidian' },
];

export default function JoinPartyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;

  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'browse' | 'create'>('browse');
  const [joining, setJoining] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    abbreviation: '',
    ideology: 'centrist',
    description: '',
    color: '#c9951a',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    partiesApi
      .getParties(nationId)
      .then(r => setParties(r.data.parties || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nationId]);

  const playerParties = parties;

  const handleJoin = async (partyId: string) => {
    setJoining(partyId);
    setError('');
    try {
      await partiesApi.joinParty(nationId, partyId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to join party.');
    } finally {
      setJoining('');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await partiesApi.createParty(nationId, form);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to found party.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 step-badge">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4a945' }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em]">Step 3 of 3 · Political Faction</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#f0d585' }}>
          Join or Found a Party
        </h1>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(212,169,69,0.5)' }}>
          Every faction needs a political home. Join an existing player party or establish your own to set your political ideology.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-box px-4 py-3 rounded-xl mb-6 text-xs font-mono flex items-center gap-2">
          <span className="text-red-400">✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        <button
          type="button"
          onClick={() => setMode('browse')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
            mode === 'browse' ? 'golden-tab-active' : 'golden-tab-inactive'
          }`}
        >
          Browse Player Parties ({playerParties.length})
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
            mode === 'create' ? 'golden-tab-active' : 'golden-tab-inactive'
          }`}
          disabled={playerParties.length >= 6}
          title={playerParties.length >= 6 ? 'Maximum limit of 6 parties per nation reached' : ''}
        >
          {playerParties.length >= 6 ? '🔒 Party Limit Reached (6/6)' : '+ Found New Party'}
        </button>
      </div>

      {mode === 'browse' ? (
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(212,169,69,0.4)', borderTopColor: '#d4a945' }} />
              <span className="text-xs" style={{ color: 'rgba(212,169,69,0.4)' }}>Loading political landscape...</span>
            </div>
          )}

          {/* Player-founded parties */}
          {!loading && (
            <div>
              {playerParties.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={{ border: '1px dashed rgba(212,169,69,0.2)' }}>
                  <div className="text-3xl mb-3">🏛️</div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#d4a945' }}>No player parties yet</p>
                  <p className="text-xs mb-5" style={{ color: 'rgba(212,169,69,0.4)' }}>Be the first to found a political faction!</p>
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all golden-btn"
                  >
                    Found a Party →
                  </button>
                </div>
              ) : (
                playerParties.map((party: any) => (
                  <div
                    key={party.id}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-3 onboarding-card onboarding-card-hover"
                  >
                    <div className="w-1 h-12 rounded-full shrink-0" style={{ background: party.color || '#d4a945' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold" style={{ color: '#f0d585' }}>{party.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(212,169,69,0.1)', border: '1px solid rgba(212,169,69,0.2)', color: '#d4a945' }}>
                          {party.abbreviation}
                        </span>
                        {party.member_count >= 2 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-red-950/40 text-red-400 border border-red-900/40">
                            FULL (2/2)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: 'rgba(212,169,69,0.4)' }}>
                        {party.ideology?.replace(/_/g, ' ')} · {party.seats} seats · {party.member_count || 0}/2 real players
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoin(party.id)}
                      disabled={!!joining || party.member_count >= 2}
                      className={`shrink-0 px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                        party.member_count >= 2 ? 'golden-btn-ghost cursor-not-allowed opacity-30' : 'golden-btn'
                      }`}
                    >
                      {joining === party.id ? 'Joining...' : party.member_count >= 2 ? 'Full' : 'Join'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Found a Party form ── */
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Party identity */}
          <div className="section-box p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,169,69,0.6)' }}>
              Party Identity
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
                  Party Name *
                </label>
                <input
                  id="party-name"
                  className="golden-input w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="Democratic Alliance"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  minLength={3}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
                  Abbreviation *
                </label>
                <input
                  id="party-abbr"
                  className="golden-input w-full rounded-xl px-4 py-3 text-sm uppercase"
                  placeholder="DA"
                  value={form.abbreviation}
                  onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value.toUpperCase() }))}
                  required
                  minLength={2}
                  maxLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
                Ideology *
              </label>
              <select
                id="party-ideology"
                className="golden-input w-full rounded-xl px-4 py-3 text-sm"
                value={form.ideology}
                onChange={e => setForm(f => ({ ...f, ideology: e.target.value }))}
              >
                {IDEOLOGIES.map(i => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
                Description
              </label>
              <textarea
                id="party-desc"
                className="golden-input w-full rounded-xl px-4 py-3 text-sm resize-none"
                rows={3}
                placeholder="A pragmatic party committed to..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                maxLength={500}
              />
            </div>
          </div>

          {/* Party colour */}
          <div className="section-box p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(212,169,69,0.6)' }}>
              Party Colour
            </h3>
            <div className="grid grid-cols-5 gap-2.5 mb-4">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  className={`h-9 rounded-xl transition-all duration-150 ${
                    form.color === c.value ? 'color-swatch-active scale-110' : 'hover:scale-105 opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    background: c.value,
                    boxShadow: form.color === c.value ? `0 0 0 2px #111008, 0 0 0 3.5px ${c.value}` : 'none',
                  }}
                />
              ))}
            </div>

            {/* Preview */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(12,10,2,0.7)', border: '1px solid rgba(212,169,69,0.12)' }}>
              <div className="w-1.5 h-10 rounded-full shrink-0" style={{ background: form.color }} />
              <div>
                <div className="text-sm font-bold" style={{ color: '#f0d585' }}>{form.name || 'Your Party Name'}</div>
                <div className="text-[10px] font-mono" style={{ color: 'rgba(212,169,69,0.4)' }}>{form.abbreviation || 'ABR'} · {form.ideology?.replace(/_/g, ' ')}</div>
              </div>
              <div className="ml-auto w-5 h-5 rounded-full shrink-0" style={{ background: form.color }} />
            </div>
          </div>

          <button
            id="create-party-submit"
            type="submit"
            disabled={creating}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 golden-btn"
          >
            {creating ? '⏳ Establishing Party...' : '🏛️ Found Party & Enter Governance →'}
          </button>
        </form>
      )}
    </div>
  );
}
