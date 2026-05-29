'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCharacterStore, type Gender } from '../../../store/character.store';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, middle: string, last: string): string {
  const parts = [first, middle, last].filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);
}

function buildFullName(first: string, middle: string, last: string): string {
  return [first, middle, last].filter(Boolean).join(' ') || '—';
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Custom / Other',
};

// ── Sub-components ────────────────────────────────────────────────────────────

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
            <div className="w-12 h-px transition-all duration-500"
              style={{ background: i < step ? '#f59e0b' : 'rgba(255,255,255,0.06)' }} />
          )}
        </div>
      ))}
      <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest ml-2">
        Step {step + 1} of {total} — Identity
      </span>
    </div>
  );
}

function GenderCard({
  value,
  selected,
  onSelect,
}: {
  value: Gender;
  selected: boolean;
  onSelect: (v: Gender) => void;
}) {
  const icons: Record<string, React.ReactNode> = {
    male: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 3H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1v-5" />
      </svg>
    ),
    female: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="8" r="5" />
        <path strokeLinecap="round" d="M12 13v8M9 18h6" />
      </svg>
    ),
    other: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8v8M8 12h8" />
      </svg>
    ),
  };

  return (
    <button
      type="button"
      id={`gender-${value}`}
      onClick={() => onSelect(value)}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-sm border text-sm font-medium transition-all duration-200 flex-1"
      style={
        selected
          ? {
              background: 'rgba(245,158,11,0.08)',
              borderColor: '#f59e0b',
              color: '#f59e0b',
              boxShadow: '0 0 12px rgba(245,158,11,0.12)',
            }
          : {
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: '#71717a',
            }
      }
    >
      <span className="transition-colors">{icons[value]}</span>
      <span className="text-[11px] uppercase tracking-wider font-mono">{GENDER_LABELS[value]}</span>
    </button>
  );
}

function IdentityCard({
  firstName,
  middleName,
  lastName,
  familyName,
  age,
  gender,
}: {
  firstName: string;
  middleName: string;
  lastName: string;
  familyName: string;
  age: number | '';
  gender: Gender;
}) {
  const initials = getInitials(firstName, middleName, lastName);
  const fullName = buildFullName(firstName, middleName, lastName);

  return (
    <div
      className="rounded-sm overflow-hidden h-full flex flex-col"
      style={{
        background: 'rgba(10,10,20,0.8)',
        border: '1px solid rgba(245,158,11,0.12)',
        boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Card header stripe */}
      <div className="px-5 py-3 border-b border-white/[0.05]"
        style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.06), rgba(0,0,0,0))' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-[0.3em]">
            Identity Preview
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5">
        {/* Avatar + Emblem */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 rounded-sm flex items-center justify-center text-xl font-bold font-mono tracking-tighter"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#f59e0b',
              }}
            >
              {initials}
            </div>
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500/40" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-500/40" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber-500/40" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500/40" />
          </div>

          {/* Status badge */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">New Citizen</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              WORLDR / AETHON
            </div>
          </div>

          {/* Decorative seal */}
          <div className="ml-auto">
            <svg viewBox="0 0 40 40" className="w-9 h-9 opacity-15" fill="none">
              <polygon points="20,2 24,14 37,14 27,22 31,34 20,27 9,34 13,22 3,14 16,14" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />

        {/* Fields */}
        <div className="space-y-3 flex-1">
          {[
            { label: 'Full Name', value: fullName },
            { label: 'Family Name', value: familyName || '—' },
            { label: 'Age', value: age !== '' ? `${age} years` : '—' },
            { label: 'Gender', value: gender ? GENDER_LABELS[gender] : '—' },
            { label: 'Status', value: 'New Citizen', accent: true },
            { label: 'Origin', value: 'Not selected yet', muted: true },
          ].map((field) => (
            <div key={field.label} className="flex items-baseline justify-between gap-2">
              <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-[0.18em] shrink-0">
                {field.label}
              </span>
              <span
                className="text-right text-xs font-medium truncate max-w-[55%]"
                style={{
                  color: field.accent ? '#f59e0b' : field.muted ? '#52525b' : '#e4e4e7',
                }}
              >
                {field.value}
              </span>
            </div>
          ))}
        </div>

        {/* Document ID bar */}
        <div className="mt-auto pt-3 border-t border-white/[0.04]">
          <div className="font-mono text-[8px] text-zinc-700 tracking-widest">
            DOC · {new Date().getFullYear()} · WORLDR-AETHON
          </div>
          <div className="mt-1 h-4 rounded-sm overflow-hidden flex gap-px opacity-20">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: i % 3 === 0 ? '#f59e0b' : i % 7 === 0 ? '#818cf8' : '#27272a' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateCharacterPage() {
  const router = useRouter();
  const { character, setCharacter } = useCharacterStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  const handleBlur = (field: string) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const fieldError = (field: string) =>
    touched[field] ? validate()[field] : undefined;

  const handleSubmit = () => {
    setTouched({ firstName: true, lastName: true, familyName: true, gender: true, age: true });
    if (!isValid) return;
    router.push('/onboarding/choose-motherland');
  };

  const inputClass = (field: string) =>
    `w-full rounded-sm px-4 py-3 text-sm font-sans outline-none transition-all duration-200 placeholder:text-zinc-700 ` +
    (fieldError(field)
      ? 'bg-red-950/20 border border-red-700/50 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
      : 'bg-black/30 border border-white/[0.07] text-white focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/15 hover:border-white/[0.12]');

  return (
    <div
      className="max-w-6xl mx-auto px-4 md:px-8 py-10 transition-all duration-500"
      style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}
    >
      {/* Step indicator */}
      <StepIndicator step={0} total={2} />

      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
          Create Your Life
        </h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Your identity will shape how the world sees you.
        </p>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 xl:gap-8">

        {/* ── Left: Form ─── */}
        <div
          className="rounded-sm p-6 md:p-8 space-y-6"
          style={{
            background: 'rgba(10,10,18,0.7)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Name row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                First Name <span className="text-amber-500">*</span>
              </label>
              <input
                id="char-first-name"
                className={inputClass('firstName')}
                placeholder="e.g. Arven"
                value={character.firstName}
                onChange={(e) => setCharacter({ firstName: e.target.value })}
                onBlur={() => handleBlur('firstName')}
              />
              {fieldError('firstName') && (
                <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('firstName')}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Middle Name{' '}
                <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input
                id="char-middle-name"
                className={inputClass('middleName')}
                placeholder="e.g. Cole"
                value={character.middleName}
                onChange={(e) => setCharacter({ middleName: e.target.value })}
              />
            </div>
          </div>

          {/* Name row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Last Name <span className="text-amber-500">*</span>
              </label>
              <input
                id="char-last-name"
                className={inputClass('lastName')}
                placeholder="e.g. Veyran"
                value={character.lastName}
                onChange={(e) => setCharacter({ lastName: e.target.value })}
                onBlur={() => handleBlur('lastName')}
              />
              {fieldError('lastName') && (
                <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('lastName')}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Family Name <span className="text-amber-500">*</span>
              </label>
              <input
                id="char-family-name"
                className={inputClass('familyName')}
                placeholder="e.g. Veyran"
                value={character.familyName}
                onChange={(e) => setCharacter({ familyName: e.target.value })}
                onBlur={() => handleBlur('familyName')}
              />
              {fieldError('familyName') && (
                <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('familyName')}</p>
              )}
              <p className="text-zinc-700 text-[10px] mt-1.5 font-mono">
                Your hereditary family lineage name.
              </p>
            </div>
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Age <span className="text-amber-500">*</span>
              </label>
              <input
                id="char-age"
                type="number"
                min={18}
                max={80}
                className={inputClass('age')}
                placeholder="18"
                value={character.age}
                onChange={(e) => {
                  const val = e.target.value;
                  setCharacter({ age: val === '' ? '' : parseInt(val, 10) });
                }}
                onBlur={() => handleBlur('age')}
              />
              {fieldError('age') ? (
                <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('age')}</p>
              ) : (
                <p className="text-zinc-700 text-[10px] mt-1.5 font-mono">Min 18 — Max 80</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Gender <span className="text-amber-500">*</span>
              </label>
              <div id="char-gender" className="flex gap-2" onBlur={() => handleBlur('gender')}>
                {(['male', 'female', 'other'] as Gender[]).map((g) => (
                  <GenderCard
                    key={g}
                    value={g}
                    selected={character.gender === g}
                    onSelect={(v) => {
                      setCharacter({ gender: v });
                      handleBlur('gender');
                    }}
                  />
                ))}
              </div>
              {fieldError('gender') && (
                <p className="text-red-400 text-[10px] mt-1.5 font-mono">{fieldError('gender')}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.04]" />

          {/* Submit */}
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
              style={{
                background: isValid
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'rgba(245,158,11,0.08)',
                color: isValid ? '#000' : '#78716c',
                border: isValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
                boxShadow: isValid ? '0 4px 20px rgba(245,158,11,0.2)' : 'none',
              }}
            >
              {isValid && (
                <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />
              )}
              Continue
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Right: Identity Preview ─── */}
        <div className="lg:sticky lg:top-8 self-start h-auto min-h-[480px] lg:min-h-[560px]">
          <IdentityCard
            firstName={character.firstName}
            middleName={character.middleName}
            lastName={character.lastName}
            familyName={character.familyName}
            age={character.age}
            gender={character.gender}
          />
        </div>
      </div>
    </div>
  );
}
