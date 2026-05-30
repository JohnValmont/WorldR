'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore, type Gender } from '../../../store/character.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first: string, middle: string, last: string): string {
  const parts = [first, middle, last].filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 3);
}

function buildFullName(first: string, middle: string, last: string): string {
  return [first, middle, last].filter(Boolean).join(' ') || '—';
}

const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

function characterIsComplete(c: { firstName: string; lastName: string; familyName: string; age: number | ''; gender: string }): boolean {
  return (
    c.firstName.trim().length > 0 &&
    c.lastName.trim().length > 0 &&
    c.familyName.trim().length > 0 &&
    c.gender !== '' &&
    c.age !== '' &&
    Number(c.age) >= 18
  );
}

// ── Confirmation Modal ────────────────────────────────────────────────────────

function DeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4"
        style={{ background: 'rgba(12,12,24,0.98)', border: '1px solid rgba(239,68,68,0.28)', boxShadow: '0 0 40px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.8)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Delete Character?</div>
            <div className="text-zinc-500 text-[10px] font-mono mt-0.5">This cannot be undone locally.</div>
          </div>
        </div>

        <div className="rounded-sm p-3 text-[10px] font-mono text-zinc-500 leading-relaxed" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
          Deleting your character will also remove your selected path, political party, and selected country. You will start the onboarding again from scratch.
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-sm transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
          >
            Cancel
          </button>
          <button
            id="confirm-delete-character"
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-150"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.40)', color: '#f87171' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Character Summary Panel ───────────────────────────────────────────────────

function CharacterSummary({
  character,
  onContinue,
  onDelete,
}: {
  character: { firstName: string; middleName: string; lastName: string; familyName: string; age: number | ''; gender: Gender };
  onContinue: () => void;
  onDelete: () => void;
}) {
  const initials = getInitials(character.firstName, character.middleName, character.lastName);
  const fullName = buildFullName(character.firstName, character.middleName, character.lastName);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: 'rgba(10,10,20,0.85)',
          border: '1px solid rgba(245,158,11,0.22)',
          boxShadow: '0 0 50px rgba(245,158,11,0.06), 0 12px 50px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-2 border-b border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-[0.28em]">Character Created</span>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Avatar + info */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-sm flex items-center justify-center text-2xl font-bold font-mono"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
                  border: '1.5px solid rgba(245,158,11,0.35)',
                  color: '#f59e0b',
                  letterSpacing: '-0.04em',
                }}
              >
                {initials}
              </div>
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-500/50" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-500/50" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-500/50" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-500/50" />
            </div>
            <div>
              <div className="text-white font-bold text-xl leading-tight mb-1">{fullName}</div>
              <div className="text-zinc-500 text-xs font-mono">{character.familyName} Family</div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">New Citizen · WORLDr</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Age',         value: character.age !== '' ? `${character.age} yrs` : '—' },
              { label: 'Gender',      value: character.gender ? GENDER_LABELS[character.gender] : '—' },
              { label: 'Last Name',   value: character.lastName },
              { label: 'Family Name', value: character.familyName },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-1">{f.label}</div>
                <div className="text-zinc-200 text-xs font-semibold">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.04]" />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="char-summary-continue"
              type="button"
              onClick={onContinue}
              className="group relative flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', boxShadow: '0 4px 20px rgba(245,158,11,0.2)' }}
            >
              <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />
              Continue
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <button
              id="char-summary-delete"
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-90"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#f87171' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete &amp; Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components (form mode) ────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold font-mono transition-all duration-300"
            style={
              i < step
                ? { background: '#f59e0b', color: '#000' }
                : i === step
                ? { background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#52525b' }
            }
          >
            {i < step ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className="w-12 h-px transition-all duration-500" style={{ background: i < step ? '#f59e0b' : 'rgba(255,255,255,0.06)' }} />
          )}
        </div>
      ))}
      <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest ml-2">
        Step {step + 1} of {total} — Identity
      </span>
    </div>
  );
}

function GenderCard({ value, selected, onSelect }: { value: Gender; selected: boolean; onSelect: (v: Gender) => void }) {
  const icons: Record<string, React.ReactNode> = {
    male: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 21a6.5 6.5 0 0113 0" /></svg>,
    female: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10M9 18h6" /></svg>,
    other: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 21a6.5 6.5 0 0113 0" /><circle cx="12" cy="7" r="1.5" fill="currentColor" /></svg>,
  };
  return (
    <button type="button" id={`gender-${value}`} onClick={() => onSelect(value)}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-sm border text-sm font-medium transition-all duration-200 flex-1"
      style={selected ? { background: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b', color: '#f59e0b', boxShadow: '0 0 12px rgba(245,158,11,0.12)' } : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}
    >
      <span>{icons[value]}</span>
      <span className="text-[11px] uppercase tracking-wider font-mono">{GENDER_LABELS[value]}</span>
    </button>
  );
}

function IdentityCard({ firstName, middleName, lastName, familyName, age, gender }: { firstName: string; middleName: string; lastName: string; familyName: string; age: number | ''; gender: Gender }) {
  const initials = getInitials(firstName, middleName, lastName);
  const fullName = buildFullName(firstName, middleName, lastName);
  return (
    <div className="rounded-sm overflow-hidden h-full flex flex-col" style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(245,158,11,0.12)', boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <div className="px-5 py-3 border-b border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.06), rgba(0,0,0,0))' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-[0.3em]">Identity Preview</span>
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-sm flex items-center justify-center text-xl font-bold font-mono tracking-tighter" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>{initials}</div>
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500/40" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-500/40" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber-500/40" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500/40" />
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">New Citizen</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">WORLDr / AETHON</div>
          </div>
          <div className="ml-auto">
            <svg viewBox="0 0 40 40" className="w-9 h-9 opacity-15" fill="none">
              <polygon points="20,2 24,14 37,14 27,22 31,34 20,27 9,34 13,22 3,14 16,14" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />
        <div className="space-y-3 flex-1">
          {[
            { label: 'Full Name',   value: fullName },
            { label: 'Family Name', value: familyName || '—' },
            { label: 'Age',         value: age !== '' ? `${age} years` : '—' },
            { label: 'Gender',      value: gender ? GENDER_LABELS[gender] : '—' },
            { label: 'Status',      value: 'New Citizen', accent: true },
            { label: 'Origin',      value: 'Not selected yet', muted: true },
          ].map((field) => (
            <div key={field.label} className="flex items-baseline justify-between gap-2">
              <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em] shrink-0">{field.label}</span>
              <span className="text-right text-xs font-medium truncate max-w-[55%]" style={{ color: field.accent ? '#f59e0b' : field.muted ? '#52525b' : '#e4e4e7' }}>{field.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-3 border-t border-white/[0.04]">
          <div className="font-mono text-[8px] text-zinc-700 tracking-widest">DOC · {new Date().getFullYear()} · WORLDr-AETHON</div>
          <div className="mt-1 h-4 rounded-sm overflow-hidden flex gap-px opacity-20">
            {Array.from({ length: 48 }).map((_, i) => <div key={i} className="flex-1" style={{ background: i % 3 === 0 ? '#f59e0b' : i % 7 === 0 ? '#818cf8' : '#27272a' }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateCharacterPage() {
  const router = useRouter();
  const { character, setCharacter, resetCharacter } = useCharacterStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Determine if a complete character already exists (summary mode)
  const [hasCharacter, setHasCharacter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Read character completion from store on mount and on change
  useEffect(() => {
    setHasCharacter(characterIsComplete(character));
  }, [character]);

  // ── Summary mode: smart continue routing ──────────────────────────────────

  const handleSummaryContinue = () => {
    // Read path from standardized key, fall back to legacy key for compat
    const path =
      localStorage.getItem('worldr_selected_path') ||
      localStorage.getItem('worldr-path');

    if (!path) {
      router.push('/onboarding/choose-path');
      return;
    }

    // For Politician path: ALWAYS route through create-party.
    // create-party will show existing party summary OR the creation form.
    // Never skip the party step from the character summary.
    if (path === 'politician') {
      router.push('/onboarding/create-party');
      return;
    }

    // For future non-Politician paths (Businessman, Military etc.)
    router.push('/onboarding/choose-motherland');
  };

  // ── Delete character + full account cleanup ───────────────────────────────

  const handleDeleteConfirm = () => {
    // Temporary local account cleanup.
    // In multiplayer, deleting an account must delete all owned party records
    // in the backend/database and release the party abbreviation for reuse.

    // 1. Release party abbreviation: remove player's party from the registry first
    try {
      const partyRaw = localStorage.getItem('worldr_current_party');
      if (partyRaw) {
        const party: { partyId: string } = JSON.parse(partyRaw);
        const registryRaw = localStorage.getItem('worldr_registered_parties');
        if (registryRaw) {
          const registry: Array<{ partyId: string }> = JSON.parse(registryRaw);
          const filtered = registry.filter((p) => p.partyId !== party.partyId);
          localStorage.setItem('worldr_registered_parties', JSON.stringify(filtered));
        }
      }
    } catch {}

    // 2. Reset Zustand store (clears the persisted 'worldr-character' key)
    resetCharacter();

    // 3. Clear all onboarding data (both old and new key variants for safety)
    localStorage.removeItem('worldr-path');          // legacy key
    localStorage.removeItem('worldr_selected_path'); // standardized key
    localStorage.removeItem('worldr_current_party');
    localStorage.removeItem('worldr_selected_country');
    // Note: worldr_registered_parties is NOT wiped — only the player's own party
    // was already removed above. Mock seed parties and future other players' parties remain.

    setShowDelete(false);
    setHasCharacter(false);
  };

  // ── Form mode validation ──────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!character.firstName.trim()) e.firstName = 'First name is required.';
    if (!character.lastName.trim()) e.lastName = 'Last name is required.';
    if (!character.familyName.trim()) e.familyName = 'Family name is required.';
    if (!character.gender) e.gender = 'Please select a gender.';
    if (character.age === '' || Number(character.age) < 18)
      e.age = 'You must be at least 18 years old to begin public life.';
    if (Number(character.age) > 80) e.age = 'Age cannot exceed 80.';
    return e;
  };

  const isValid = Object.keys(validate()).length === 0;
  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const fieldError = (field: string) => (touched[field] ? validate()[field] : undefined);

  const handleSubmit = () => {
    setTouched({ firstName: true, lastName: true, familyName: true, gender: true, age: true });
    if (!isValid) return;
    router.push('/onboarding/choose-path');
  };

  const inputClass = (field: string) =>
    `w-full rounded-sm px-4 py-3 text-sm font-sans outline-none transition-all duration-200 placeholder:text-zinc-700 ` +
    (fieldError(field)
      ? 'bg-red-950/20 border border-red-700/50 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
      : 'bg-black/30 border border-white/[0.07] text-white focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/15 hover:border-white/[0.12]');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="max-w-6xl mx-auto px-4 md:px-8 py-6 transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      {/* Delete confirmation modal */}
      {showDelete && <DeleteModal onCancel={() => setShowDelete(false)} onConfirm={handleDeleteConfirm} />}

      <StepIndicator step={0} total={4} />

      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
          {hasCharacter ? 'Your Character' : 'Create Your Life'}
        </h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          {hasCharacter
            ? 'Your identity has been created. Continue your journey or start fresh.'
            : 'Your identity will shape how the world sees you.'}
        </p>
      </div>

      {hasCharacter ? (
        /* ── Summary mode ── */
        <CharacterSummary
          character={character}
          onContinue={handleSummaryContinue}
          onDelete={() => setShowDelete(true)}
        />
      ) : (
        /* ── Form mode ── */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 xl:gap-8">
          {/* Left: Form */}
          <div className="rounded-sm p-6 md:p-8 space-y-6" style={{ background: 'rgba(10,10,18,0.7)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            {/* Name row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">First Name <span className="text-amber-500">*</span></label>
                <input id="char-first-name" className={inputClass('firstName')} placeholder="e.g. Arven" value={character.firstName} onChange={(e) => setCharacter({ firstName: e.target.value })} onBlur={() => handleBlur('firstName')} />
                {fieldError('firstName') && <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('firstName')}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Middle Name <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span></label>
                <input id="char-middle-name" className={inputClass('middleName')} placeholder="e.g. Cole" value={character.middleName} onChange={(e) => setCharacter({ middleName: e.target.value })} />
              </div>
            </div>

            {/* Name row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Last Name <span className="text-amber-500">*</span></label>
                <input id="char-last-name" className={inputClass('lastName')} placeholder="e.g. Veyran" value={character.lastName} onChange={(e) => setCharacter({ lastName: e.target.value })} onBlur={() => handleBlur('lastName')} />
                {fieldError('lastName') && <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('lastName')}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Family Name <span className="text-amber-500">*</span></label>
                <input id="char-family-name" className={inputClass('familyName')} placeholder="e.g. Veyran" value={character.familyName} onChange={(e) => setCharacter({ familyName: e.target.value })} onBlur={() => handleBlur('familyName')} />
                {fieldError('familyName') && <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('familyName')}</p>}
                <p className="text-zinc-700 text-[10px] mt-1.5 font-mono">Your hereditary family lineage name.</p>
              </div>
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Age <span className="text-amber-500">*</span></label>
                <input id="char-age" type="number" min={18} max={80} className={inputClass('age')} placeholder="18" value={character.age} onChange={(e) => { const val = e.target.value; setCharacter({ age: val === '' ? '' : parseInt(val, 10) }); }} onBlur={() => handleBlur('age')} />
                {fieldError('age') ? <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('age')}</p> : <p className="text-zinc-700 text-[10px] mt-1.5 font-mono">Min 18 — Max 80</p>}
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Gender <span className="text-amber-500">*</span></label>
                <div id="char-gender" className="flex gap-2" onBlur={() => handleBlur('gender')}>
                  {(['male', 'female', 'other'] as Gender[]).map((g) => (
                    <GenderCard key={g} value={g} selected={character.gender === g} onSelect={(v) => { setCharacter({ gender: v }); handleBlur('gender'); }} />
                  ))}
                </div>
                {fieldError('gender') && <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('gender')}</p>}
              </div>
            </div>

            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-zinc-700 text-[10px] font-mono leading-relaxed max-w-sm">
                <span className="text-amber-500/60">*</span> Required fields. Your identity will be used throughout the game.
              </p>
              <button
                id="char-submit-btn"
                type="button"
                onClick={handleSubmit}
                disabled={!isValid}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: isValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)', color: isValid ? '#000' : '#78716c', border: isValid ? 'none' : '1px solid rgba(245,158,11,0.12)', boxShadow: isValid ? '0 4px 20px rgba(245,158,11,0.2)' : 'none' }}
              >
                {isValid && <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />}
                Continue
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Identity Preview */}
          <div className="lg:sticky lg:top-8 self-start h-auto min-h-[480px] lg:min-h-[560px]">
            <IdentityCard firstName={character.firstName} middleName={character.middleName} lastName={character.lastName} familyName={character.familyName} age={character.age} gender={character.gender} />
          </div>
        </div>
      )}
    </div>
  );
}
