'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const IDEOLOGIES = [
  { value: 'far_left', label: 'Far Left', color: '#ef4444', desc: 'Revolutionary socialism, collective ownership, radical redistribution.' },
  { value: 'left', label: 'Left', color: '#f97316', desc: 'Strong social programs, union rights, progressive taxation.' },
  { value: 'centre_left', label: 'Centre Left', color: '#eab308', desc: 'Social democracy, regulated markets, expanded welfare.' },
  { value: 'centrist', label: 'Centrist', color: '#d4a945', desc: 'Pragmatic governance, cross-aisle compromise, mixed policies.' },
  { value: 'centre_right', label: 'Centre Right', color: '#60a5fa', desc: 'Fiscal conservatism, free markets, moderate social spending.' },
  { value: 'right', label: 'Right', color: '#3b82f6', desc: 'Low taxes, deregulation, private sector dominance.' },
  { value: 'far_right', label: 'Far Right', color: '#1d4ed8', desc: 'Nationalist economics, strict borders, traditional values.' },
  { value: 'libertarian', label: 'Libertarian', color: '#c9951a', desc: 'Minimal state, individual liberty, free markets.' },
  { value: 'green', label: 'Green', color: '#22c55e', desc: 'Environmental priority, sustainable growth, ecological justice.' },
  { value: 'nationalist', label: 'Nationalist', color: '#a16207', desc: 'Economic nationalism, industrial protectionism, national sovereignty.' },
];

const PATHS = [
  {
    id: 'political',
    icon: '🏛️',
    label: 'Political Party',
    desc: 'Shape laws, influence national policy, and guide your nation\'s future through parliamentary power.',
    locked: false,
  },
  {
    id: 'military',
    icon: '⚔️',
    label: 'Military Branch',
    desc: 'Command defense forces, maintain border stability, and deploy defense assets during crises.',
    locked: true,
  },
  {
    id: 'entrepreneur',
    icon: '💼',
    label: 'Entrepreneur',
    desc: 'Invest in state enterprises, build industrial complexes, merge conglomerates, and trade commodities.',
    locked: true,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<'path' | 'form'>('path');
  const [selectedPath, setSelectedPath] = useState<string>('political');

  const [form, setForm] = useState({
    display_name: user?.username || '',
    ideology: 'centrist',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmPath = () => {
    if (selectedPath !== 'political') {
      setError('This path is locked in Alpha. Please select Political Party to continue.');
      return;
    }
    setError('');
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await profileApi.create(form);
      if (user) setUser({ ...user, display_name: form.display_name });
      router.push('/onboarding/nation');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedIdeology = IDEOLOGIES.find(i => i.value === form.ideology);

  if (step === 'path') {
    return (
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 step-badge">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4a945' }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em]">Step 1 of 3 · Faction Path</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#f0d585' }}>
            Choose Your Path
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(212,169,69,0.5)' }}>
            How will you shape Aethon? Choose your faction path to begin.
          </p>
        </div>

        {error && (
          <div className="error-box px-4 py-3 rounded-xl mb-5 text-xs font-mono">
            ✕ {error}
          </div>
        )}

        <div className="space-y-3 mb-8">
          {PATHS.map(path => (
            <button
              key={path.id}
              type="button"
              onClick={() => { setSelectedPath(path.id); setError(''); }}
              className={`w-full text-left p-5 rounded-2xl transition-all duration-200 ${
                path.locked ? 'opacity-50 cursor-default' : ''
              } ${
                selectedPath === path.id && !path.locked
                  ? 'onboarding-card'
                  : 'onboarding-card onboarding-card-hover'
              }`}
              style={
                selectedPath === path.id && !path.locked
                  ? { borderColor: 'rgba(212,169,69,0.45)', boxShadow: '0 0 20px rgba(212,169,69,0.08)' }
                  : {}
              }
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{path.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold" style={{ color: selectedPath === path.id && !path.locked ? '#f0d585' : 'rgba(212,169,69,0.6)' }}>
                      {path.label}
                    </span>
                    {path.locked ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full locked-badge font-mono">Alpha Lock</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>Active</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,169,69,0.4)' }}>{path.desc}</p>
                </div>
                {selectedPath === path.id && !path.locked && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #c9951a, #e8b830)' }}>
                    <span className="text-amber-950 text-[10px] font-black">✓</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleConfirmPath}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide golden-btn"
        >
          Confirm Path →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 step-badge">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d4a945' }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em]">Step 1 of 3 · Faction Identity</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#f0d585' }}>
          Create Your Profile
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(212,169,69,0.5)' }}>
          Define your political identity before entering the world of Aethon.
        </p>
      </div>

      {error && (
        <div className="error-box px-4 py-3 rounded-xl mb-5 text-xs font-mono">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Display name */}
        <div className="section-box p-6">
          <label className="block text-[10px] uppercase tracking-widest mb-2 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
            Display Name *
          </label>
          <input
            id="profile-display-name"
            className="golden-input w-full rounded-xl px-4 py-3 text-sm"
            placeholder="e.g. Prime Minister Keldor"
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            required
            minLength={2}
            maxLength={50}
          />
          <p className="text-[9px] mt-2" style={{ color: 'rgba(212,169,69,0.3)' }}>How your political faction is identified in state papers.</p>
        </div>

        {/* Ideology */}
        <div className="section-box p-6">
          <label className="block text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
            Political Ideology *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {IDEOLOGIES.map(ideo => (
              <button
                key={ideo.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, ideology: ideo.value }))}
                className="text-left p-3 rounded-xl text-xs font-mono transition-all duration-150"
                style={{
                  background: form.ideology === ideo.value ? 'rgba(212,169,69,0.1)' : 'rgba(12,10,2,0.5)',
                  border: `1px solid ${form.ideology === ideo.value ? 'rgba(212,169,69,0.4)' : 'rgba(212,169,69,0.1)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ideo.color }} />
                  <span style={{ color: form.ideology === ideo.value ? '#f0d585' : 'rgba(212,169,69,0.55)' }}>
                    {ideo.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selectedIdeology && (
            <p className="text-[10px] mt-3 italic leading-relaxed" style={{ color: 'rgba(212,169,69,0.4)', borderLeft: '2px solid rgba(212,169,69,0.2)', paddingLeft: '0.75rem' }}>
              {selectedIdeology.desc}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="section-box p-6">
          <label className="block text-[10px] uppercase tracking-widest mb-2 font-medium" style={{ color: 'rgba(212,169,69,0.5)' }}>
            Political Biography <span style={{ color: 'rgba(212,169,69,0.3)' }}>(optional)</span>
          </label>
          <textarea
            id="profile-bio"
            className="golden-input w-full rounded-xl px-4 py-3 text-sm resize-none"
            rows={3}
            placeholder="Describe your faction's background, platform, or historical pedigree..."
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            maxLength={300}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('path')}
            className="px-5 py-3.5 rounded-xl text-xs font-bold transition-all golden-btn-ghost"
          >
            ← Change Path
          </button>
          <button
            id="profile-submit"
            type="submit"
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all golden-btn"
          >
            {loading ? 'Saving Identity...' : 'Continue to Nation Choice →'}
          </button>
        </div>
      </form>
    </div>
  );
}
