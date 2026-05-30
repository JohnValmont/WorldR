'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Playfair_Display } from 'next/font/google';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Article {
  id: string;
  headline: string;
  writerName: string;
  category: string;
  body: string;
  publishedAt: string;
  countryName: string;
}

interface PlayerCtx {
  characterName: string;
  countryName: string;
  continentName: string;
  partyName: string;
  partyAbbreviation: string;
  partyColor: string;
  partyLogoId: string;
  selectedPath: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'worldr_articles_varelia';

const MAIN_TABS = ['Home', 'Actions', 'Government', 'Nation', 'World', 'Ledger'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const CATEGORIES = ['Front Page', 'Politics', 'Business', 'International', 'Society', 'Opinion'] as const;
type Category = (typeof CATEGORIES)[number];

const FUTURE_PATHS = [
  { label: 'Become Businessman', id: 'businessman' },
  { label: 'Join Military',       id: 'military'   },
  { label: 'Join Judiciary',      id: 'judicial'   },
  { label: 'Enter Media',         id: 'media'      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Party Dropdown ────────────────────────────────────────────────────────────

function PartyDropdown({ ctx, onClose }: { ctx: PlayerCtx; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1.5 w-64 rounded-sm overflow-hidden z-50"
      style={{
        background: 'rgba(6,6,14,0.99)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 50px rgba(0,0,0,0.85)',
      }}
    >
      {/* Party identity panel */}
      <div
        className="px-4 py-3 border-b border-white/[0.06]"
        style={{ background: `linear-gradient(90deg, ${ctx.partyColor}0e, transparent)` }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          {ctx.partyLogoId && (
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: `${ctx.partyColor}12`, border: `1px solid ${ctx.partyColor}28` }}
            >
              <LogoSVG logoId={ctx.partyLogoId} color={ctx.partyColor} size={17} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-bold text-xs leading-tight truncate">{ctx.partyName}</div>
            <div className="font-mono text-[9px] font-bold tracking-[0.22em] mt-0.5" style={{ color: ctx.partyColor }}>
              {ctx.partyAbbreviation}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Path',    value: ctx.selectedPath   },
            { label: 'Leader',  value: ctx.characterName  },
            { label: 'Country', value: ctx.countryName    },
          ].map((f) => (
            <div key={f.label} className="flex items-center justify-between">
              <span className="text-zinc-600 font-mono text-[8px] uppercase tracking-[0.2em]">{f.label}</span>
              <span className="text-zinc-300 text-[10px] font-semibold truncate max-w-[140px]">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Future paths (disabled) */}
      <div className="px-4 py-3">
        <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-[0.28em] mb-2.5">Switch Path</div>
        {FUTURE_PATHS.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between py-1.5 cursor-not-allowed"
            style={{ opacity: 0.33 }}
          >
            <span className="text-zinc-400 text-[10px] font-medium">{p.label}</span>
            <span
              className="text-[7.5px] font-mono text-zinc-700 uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Write Article Modal ───────────────────────────────────────────────────────

function WriteArticleModal({
  defaultWriter,
  onClose,
  onPublish,
}: {
  defaultWriter: string;
  onClose: () => void;
  onPublish: (article: Article) => void;
}) {
  const [headline,   setHeadline]   = useState('');
  const [writerName, setWriterName] = useState(defaultWriter);
  const [category,   setCategory]   = useState<Category>('Front Page');
  const [body,       setBody]       = useState('');
  const [imageLabel, setImageLabel] = useState('');
  const [touched,    setTouched]    = useState(false);

  const isValid =
    headline.trim().length > 0 &&
    writerName.trim().length > 0 &&
    body.trim().length >= 30;

  const handlePublish = () => {
    setTouched(true);
    if (!isValid) return;
    onPublish({
      id: generateId(),
      headline:   headline.trim(),
      writerName: writerName.trim(),
      category,
      body:        body.trim(),
      publishedAt: new Date().toISOString(),
      countryName: 'Drennia',
    });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const inputStyle = (hasError: boolean) => ({
    background: 'rgba(0,0,0,0.5)',
    border: hasError ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)',
    color: '#e4e4e7',
  } as React.CSSProperties);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-sm overflow-hidden"
        style={{
          background: 'rgba(5,5,12,0.99)',
          border: '1px solid rgba(245,158,11,0.18)',
          boxShadow: '0 0 80px rgba(245,158,11,0.05), 0 30px 80px rgba(0,0,0,0.95)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/[0.06]"
          style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm">Write Article</div>
              <div className="text-zinc-600 text-[9px] font-mono uppercase tracking-widest mt-0.5">
                The Varelian Record · Varelia
              </div>
            </div>
          </div>
          <button
            id="modal-close"
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Headline */}
          <div>
            <label className="block text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-1.5">
              Headline
            </label>
            <input
              id="article-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Write a compelling headline..."
              className="w-full px-3 py-2.5 text-sm rounded-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
              style={inputStyle(touched && !headline.trim())}
            />
            {touched && !headline.trim() && (
              <p className="text-red-400 text-[9px] mt-1 font-mono">Headline is required.</p>
            )}
          </div>

          {/* Writer + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-1.5">
                Writer Name
              </label>
              <input
                id="article-writer"
                type="text"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
                style={inputStyle(touched && !writerName.trim())}
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-1.5">
                Category
              </label>
              <select
                id="article-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2.5 text-sm rounded-sm outline-none"
                style={{
                  background: '#0a0a14',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e4e4e7',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23525252' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  backgroundSize: '14px',
                  paddingRight: '32px',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: '#0a0a12' }}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Article body */}
          <div>
            <label className="block text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-1.5">
              Article
            </label>
            <textarea
              id="article-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your article here. Share analysis, commentary, or breaking news for the citizens of Varelia..."
              className="w-full px-3 py-2.5 text-sm rounded-sm outline-none transition-all duration-200 placeholder:text-zinc-700 resize-none leading-relaxed"
              style={inputStyle(touched && body.trim().length < 30)}
            />
            <div className="flex items-center justify-between mt-1">
              {touched && body.trim().length < 30 ? (
                <p className="text-red-400 text-[9px] font-mono">Article must be at least 30 characters.</p>
              ) : <span />}
              <span className="text-zinc-700 font-mono text-[9px]">{body.length} chars</span>
            </div>
          </div>

          {/* Image upload (UI only) */}
          <div>
            <label className="block text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.22em] mb-1.5">
              Article Image{' '}
              <span className="normal-case tracking-normal text-zinc-700 font-normal ml-1">optional</span>
            </label>
            <div
              className="w-full h-14 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 hover:border-amber-500/20"
              style={{ border: '1.5px dashed rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
              onClick={() => document.getElementById('img-upload-input')?.click()}
            >
              <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-zinc-600 text-[10px] font-mono">
                {imageLabel || 'Click to upload · JPG, PNG, WebP'}
              </span>
              <input
                id="img-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageLabel(e.target.files?.[0]?.name ?? '')}
              />
            </div>
          </div>

          {/* Destination label */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-sm"
            style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.10)' }}
          >
            <svg className="w-3 h-3 text-amber-500/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-amber-500/50 font-mono text-[9px] uppercase tracking-widest">
              Publish to: The Varelian Record · Varelia · {category}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex items-center justify-between border-t border-white/[0.05]"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <span className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest hidden sm:block">
            Visible to citizens across Varelia
          </span>
          <div className="flex items-center gap-3">
            <button
              id="modal-cancel"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
            >
              Cancel
            </button>
            <button
              id="modal-publish"
              type="button"
              onClick={handlePublish}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-sm overflow-hidden transition-all duration-200"
              style={{
                background: isValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.07)',
                color:      isValid ? '#000' : '#78716c',
                border:     isValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
                boxShadow:  isValid ? '0 3px 16px rgba(245,158,11,0.22)' : 'none',
              }}
            >
              {isValid && (
                <span
                  className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }}
                />
              )}
              <svg className="w-3.5 h-3.5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="relative z-10">Publish Article</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-zinc-200 py-5 last:border-b-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm"
          style={{ background: '#1a1a2e', color: '#c0a060' }}
        >
          {article.category}
        </span>
        <span className="text-zinc-400 text-[9px] font-mono">{formatDate(article.publishedAt)}</span>
      </div>
      <h3
        className={`font-bold text-gray-900 leading-snug mb-1.5 cursor-pointer hover:text-amber-800 transition-colors ${playfair.className}`}
        style={{ fontSize: '1.05rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        {article.headline}
      </h3>
      <p className="text-zinc-500 text-[9.5px] font-mono mb-2">
        By <span className="text-zinc-600 font-semibold">{article.writerName}</span> · {article.countryName}
      </p>
      <p className={`text-gray-600 text-[13px] leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
        {article.body}
      </p>
      {article.body.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-amber-800 hover:text-amber-600 transition-colors"
        >
          {expanded ? '▲ Collapse' : '▼ Read more'}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VareliaNewsPage() {
  const { character } = useCharacterStore();
  const [revealed,       setRevealed]       = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [showPartyMenu,  setShowPartyMenu]  = useState(false);
  const [articles,       setArticles]       = useState<Article[]>([]);
  const [activeTab,      setActiveTab]      = useState<MainTab>('Home');
  const [activeCategory, setActiveCategory] = useState<Category>('Front Page');
  const [ctx, setCtx] = useState<PlayerCtx>({
    characterName: '—', countryName: 'Drennia', continentName: 'Varelia',
    partyName: '—', partyAbbreviation: '—', partyColor: '#f59e0b',
    partyLogoId: '', selectedPath: 'Politician',
  });

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    // Character name
    const charName =
      [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';

    // Country
    let countryName = 'Drennia', continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) { const c = JSON.parse(raw); countryName = c.countryName ?? 'Drennia'; continentName = c.continentName ?? 'Varelia'; }
    } catch {}

    // Party
    let partyName = '—', partyAbbreviation = '—', partyColor = '#f59e0b', partyLogoId = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p: RegisteredPoliticalParty = JSON.parse(pRaw);
        partyName        = p.partyName        ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId      = p.partyLogoId      ?? '';
        partyColor       = PARTY_COLORS.find((c) => c.id === p.colorId)?.hex ?? '#f59e0b';
      }
    } catch {}

    // Path label
    const pathRaw = localStorage.getItem('worldr_selected_path') || localStorage.getItem('worldr-path');
    const pathLabels: Record<string, string> = {
      politician: 'Politician', businessman: 'Businessman',
      military: 'Military Officer', judicial: 'Judicial Officer', media: 'Media & Influence',
    };
    const selectedPath = pathLabels[pathRaw ?? ''] ?? 'Politician';

    setCtx({ characterName: charName, countryName, continentName, partyName, partyAbbreviation, partyColor, partyLogoId, selectedPath });

    // Articles
    try {
      const aRaw = localStorage.getItem(STORAGE_KEY);
      if (aRaw) setArticles(JSON.parse(aRaw));
    } catch {}

    return () => clearTimeout(t);
  }, [character]);

  const handlePublish = useCallback((article: Article) => {
    setArticles((prev) => {
      const updated = [article, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setShowModal(false);
  }, []);

  const visibleArticles =
    activeCategory === 'Front Page'
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {showModal && (
        <WriteArticleModal
          defaultWriter={ctx.characterName}
          onClose={() => setShowModal(false)}
          onPublish={handlePublish}
        />
      )}

      <div
        className="min-h-screen flex flex-col transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >

        {/* ══════════════════════════════════════════════════════════════
            TOP GAME BAR
        ══════════════════════════════════════════════════════════════ */}
        <header
          className="shrink-0 flex items-center justify-between px-4 md:px-5 gap-3"
          style={{
            height: '48px',
            background: 'rgba(3,3,8,0.99)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* ── Left: flag + country + game date ── */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/flags/varelia/drennia.svg"
              alt="Drennia"
              style={{ width: '28px', height: '19px', objectFit: 'cover', borderRadius: '1px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}
            />
            <div className="flex flex-col leading-none">
              <span className="text-white font-bold text-[12px] tracking-wide">{ctx.countryName}</span>
              <span className="text-zinc-600 text-[8.5px] font-mono uppercase tracking-widest">{ctx.continentName}</span>
            </div>

            <div className="h-3.5 w-px bg-white/[0.07] hidden md:block" />

            {/* Game date — starting state, no tick */}
            <div className="hidden md:flex flex-col leading-none">
              <span className="text-zinc-400 text-[10.5px] font-mono font-semibold tracking-wide">
                Year 0 · Month 1 · Day 1
              </span>
              <span className="text-zinc-700 text-[8px] font-mono uppercase tracking-widest">
                00:00 · Game Start
              </span>
            </div>
          </div>

          {/* ── Right: notification · cash · party menu · logout ── */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Bell */}
            <button
              id="topbar-bell"
              type="button"
              title="Notifications"
              className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-500 hover:text-zinc-200 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Cash */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-zinc-600 text-[8.5px] font-mono uppercase tracking-widest">Cash</span>
              <span className="text-emerald-400 text-[11px] font-bold font-mono">$0</span>
            </div>

            {/* Party abbreviation dropdown */}
            <div className="relative">
              <button
                id="party-menu-btn"
                type="button"
                onClick={() => setShowPartyMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-sm transition-all duration-150 hover:opacity-90"
                style={{
                  background: `${ctx.partyColor}14`,
                  border: `1px solid ${ctx.partyColor}35`,
                  color: ctx.partyColor,
                }}
              >
                <span className="font-mono text-[10px] font-bold tracking-[0.18em]">{ctx.partyAbbreviation}</span>
                <svg
                  className={`w-2.5 h-2.5 transition-transform duration-150 ${showPartyMenu ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPartyMenu && (
                <PartyDropdown ctx={ctx} onClose={() => setShowPartyMenu(false)} />
              )}
            </div>

            {/* Logout */}
            <button
              id="topbar-logout"
              type="button"
              title="Logout"
              className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-sm text-zinc-600 hover:text-red-400 transition-colors text-[10px] font-mono uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:block">Logout</span>
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            MAIN NAV TABS
        ══════════════════════════════════════════════════════════════ */}
        <nav
          className="shrink-0 flex items-center px-4 md:px-5"
          style={{
            height: '40px',
            background: 'rgba(5,5,12,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {MAIN_TABS.map((tab) => {
            const isActiveTab  = tab === 'Home';
            const isCurrent    = tab === activeTab;
            return (
              <button
                key={tab}
                id={`main-tab-${tab.toLowerCase()}`}
                type="button"
                disabled={!isActiveTab}
                onClick={() => isActiveTab && setActiveTab(tab)}
                className="relative px-4 h-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-150"
                style={{
                  color:        isCurrent ? '#e4e4e7' : isActiveTab ? '#71717a' : '#3f3f46',
                  cursor:       isActiveTab ? 'pointer' : 'not-allowed',
                  borderBottom: isCurrent ? '2px solid #f59e0b' : '2px solid transparent',
                }}
              >
                {tab}
                {!isActiveTab && (
                  <span className="text-[7px] font-mono text-zinc-700 normal-case tracking-normal hidden lg:inline">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ══════════════════════════════════════════════════════════════
            HOME SUBTABS
        ══════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 flex items-center px-4 md:px-5"
          style={{
            height: '36px',
            background: 'rgba(8,8,18,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <button
            id="subtab-news"
            type="button"
            className="relative px-4 h-full flex items-center text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: '#f59e0b', borderBottom: '2px solid #f59e0b' }}
          >
            News
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CONTENT: NEWSPAPER AREA
        ══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#f3efe6' }}>

          {/* Sticky newspaper top bar */}
          <div
            className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-2"
            style={{
              background: 'rgba(243,239,230,0.97)',
              borderBottom: '1px solid #d6d0c5',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className={`${playfair.className} text-gray-700 font-bold text-sm`}>
                The Varelian Record
              </span>
              <span className="text-zinc-400 text-[8.5px] font-mono hidden sm:block tracking-widest uppercase">
                · Varelia
              </span>
            </div>
            <button
              id="topnews-write-btn"
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-80"
              style={{ background: '#1a1a2e', color: '#c0a060' }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Write Article
            </button>
          </div>

          {/* ── Newspaper Masthead (compact) ── */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 pt-5 pb-0">
            {/* Meta row */}
            <div
              className="flex items-center justify-between mb-2 text-[8px] font-mono text-zinc-500 uppercase tracking-[0.2em]"
            >
              <div className="flex items-center gap-3">
                <span>Est. Year 0</span><span>·</span><span>Continental Record</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Free Press</span><span>·</span><span>International Wire</span>
              </div>
            </div>

            {/* Hairline */}
            <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, #1a1a2e40, transparent)' }} />

            {/* Title block */}
            <div className="text-center pb-4 border-b-2" style={{ borderColor: '#1a1a2e' }}>
              <h1
                className={`${playfair.className} text-gray-900 leading-none tracking-tight`}
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 900 }}
              >
                The Varelian Record
              </h1>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <div className="flex-1 h-px max-w-[70px]" style={{ background: '#1a1a2e25' }} />
                <p className={`${playfair.className} text-zinc-500 text-[11px] italic`}>
                  "Public Life Across the Continent"
                </p>
                <div className="flex-1 h-px max-w-[70px]" style={{ background: '#1a1a2e25' }} />
              </div>
              <p className="text-zinc-400 font-mono text-[7.5px] uppercase tracking-[0.3em] mt-1.5">
                {today} · {articles.length === 0 ? 'No Articles Published' : `${articles.length} Article${articles.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* ── Category bar ── */}
          <div className="max-w-4xl mx-auto">
            <div
              className="flex items-center overflow-x-auto"
              style={{ background: '#1a1a2e' }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  id={`news-cat-${cat.toLowerCase().replace(' ', '-')}`}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-150"
                  style={
                    activeCategory === cat
                      ? { color: '#f3efe6', borderBottom: '2px solid #c0a060', paddingBottom: 'calc(10px - 2px)' }
                      : { color: 'rgba(243,239,230,0.32)', borderBottom: '2px solid transparent' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Articles / Empty state ── */}
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-16">
            {visibleArticles.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="w-14 h-14 rounded-sm flex items-center justify-center mb-5"
                  style={{ background: 'rgba(26,26,46,0.07)', border: '1px solid rgba(26,26,46,0.13)' }}
                >
                  <svg className="w-7 h-7 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2
                  className={`${playfair.className} text-gray-800 font-bold mb-2`}
                  style={{ fontSize: '1.4rem' }}
                >
                  No Articles Published Yet
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                  No citizen, party, or public figure in{' '}
                  <span className="font-semibold text-zinc-600">Varelia</span> has published an article yet.
                  Be the first to shape the continental conversation.
                </p>
                <button
                  id="empty-write-btn"
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="group relative inline-flex items-center gap-2 px-7 py-2.5 text-sm font-bold uppercase tracking-[0.14em] rounded-sm overflow-hidden transition-all duration-200 mt-6"
                  style={{ background: '#1a1a2e', color: '#f3efe6', boxShadow: '0 4px 16px rgba(26,26,46,0.2)' }}
                >
                  <span
                    className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)' }}
                  />
                  <svg className="w-3.5 h-3.5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="relative z-10">Write the First Article</span>
                </button>
                <p className="text-zinc-400 font-mono text-[8px] uppercase tracking-widest mt-3">
                  Articles written here will later be visible to players across Varelia.
                </p>
              </div>
            ) : (
              /* Article list */
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-300">
                  <span
                    className={`${playfair.className} text-gray-700 font-bold`}
                    style={{ fontSize: '0.95rem' }}
                  >
                    {activeCategory}
                  </span>
                  <button
                    id="list-write-btn"
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-80"
                    style={{ background: '#1a1a2e', color: '#c0a060' }}
                  >
                    + Write Article
                  </button>
                </div>
                {visibleArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 md:px-8 py-3 flex items-center justify-between flex-wrap gap-2"
            style={{ background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className={`${playfair.className} text-zinc-400 text-[10px]`}>
              The Varelian Record · Est. Year 0 · Free Press
            </span>
            <span className="font-mono text-[7.5px] uppercase tracking-widest text-zinc-600">
              WORLDr · {ctx.continentName} · All rights reserved
            </span>
          </div>
        </main>
      </div>
    </>
  );
}
