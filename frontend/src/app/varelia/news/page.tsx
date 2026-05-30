'use client';
import { useState, useEffect, useCallback } from 'react';
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

interface PlayerContext {
  characterName: string;
  countryName: string;
  continentName: string;
  partyName: string;
  partyColor: string;
  partyLogoId: string;
  partyAbbreviation: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'worldr_articles_varelia';

const CATEGORIES = [
  'Front Page',
  'Politics',
  'Business',
  'International',
  'Society',
  'Opinion',
] as const;

type Category = (typeof CATEGORIES)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
  const [headline, setHeadline] = useState('');
  const [writerName, setWriterName] = useState(defaultWriter);
  const [category, setCategory] = useState<Category>('Front Page');
  const [body, setBody] = useState('');
  const [touched, setTouched] = useState(false);

  const isValid = headline.trim().length > 0 && writerName.trim().length > 0 && body.trim().length > 30;

  const handlePublish = () => {
    setTouched(true);
    if (!isValid) return;
    const article: Article = {
      id: generateId(),
      headline: headline.trim(),
      writerName: writerName.trim(),
      category,
      body: body.trim(),
      publishedAt: new Date().toISOString(),
      countryName: 'Drennia',
    };
    onPublish(article);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-sm overflow-hidden"
        style={{
          background: 'rgba(6,6,12,0.98)',
          border: '1px solid rgba(245,158,11,0.18)',
          boxShadow: '0 0 80px rgba(245,158,11,0.06), 0 30px 80px rgba(0,0,0,0.95)',
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/[0.06]"
          style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.06), transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm">Write Article</div>
              <div className="text-zinc-600 text-[9px] font-mono uppercase tracking-widest mt-0.5">
                Publish to The Varelian Record · Varelia
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="modal-close-btn"
            className="w-7 h-7 rounded-sm flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal form (scrollable) */}
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
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: touched && !headline.trim() ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)',
                color: '#e4e4e7',
              }}
            />
            {touched && !headline.trim() && (
              <p className="text-red-400 text-[9px] mt-1 font-mono">Headline is required.</p>
            )}
          </div>

          {/* Writer + Category row */}
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
                placeholder="Your name"
                className="w-full px-3 py-2.5 text-sm rounded-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: touched && !writerName.trim() ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  color: '#e4e4e7',
                }}
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
                className="w-full px-3 py-2.5 text-sm rounded-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(0,0,0,0.5)',
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

          {/* Body */}
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
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: touched && body.trim().length < 30 ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)',
                color: '#e4e4e7',
              }}
            />
            <div className="flex items-center justify-between mt-1">
              {touched && body.trim().length < 30 ? (
                <p className="text-red-400 text-[9px] font-mono">Article must be at least 30 characters.</p>
              ) : (
                <span />
              )}
              <span className="text-zinc-700 font-mono text-[9px]">{body.length} chars</span>
            </div>
          </div>

          {/* Publish to label */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.10)' }}>
            <svg className="w-3 h-3 text-amber-500/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-amber-500/50 font-mono text-[9px] uppercase tracking-widest">
              Publish to: The Varelian Record · Varelia · {category}
            </span>
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="px-6 py-4 shrink-0 flex items-center justify-between border-t border-white/[0.05]"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <span className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest hidden sm:block">
            Visible to citizens across Varelia
          </span>
          <div className="flex items-center gap-3">
            <button
              id="modal-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
            >
              Cancel
            </button>
            <button
              id="modal-publish-btn"
              type="button"
              onClick={handlePublish}
              disabled={!isValid && touched}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-sm overflow-hidden transition-all duration-200 disabled:opacity-40"
              style={{
                background: isValid ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.08)',
                color: isValid ? '#000' : '#78716c',
                border: isValid ? 'none' : '1px solid rgba(245,158,11,0.12)',
                boxShadow: isValid ? '0 3px 16px rgba(245,158,11,0.22)' : 'none',
              }}
            >
              {isValid && (
                <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }} />
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
          className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm"
          style={{ background: '#1a1a2e', color: '#c0a060' }}
        >
          {article.category}
        </span>
        <span className="text-zinc-500 text-[9px] font-mono">{formatDate(article.publishedAt)}</span>
      </div>
      <h3
        className={`font-bold text-gray-900 leading-snug mb-1.5 cursor-pointer hover:text-amber-800 transition-colors ${playfair.className}`}
        style={{ fontSize: '1.1rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        {article.headline}
      </h3>
      <p className="text-zinc-500 text-[10px] font-mono mb-2">
        By <span className="text-zinc-400 font-semibold">{article.writerName}</span> · {article.countryName}
      </p>
      {expanded ? (
        <p className="text-gray-700 text-[13px] leading-relaxed whitespace-pre-wrap">{article.body}</p>
      ) : (
        <p className="text-gray-600 text-[13px] leading-relaxed line-clamp-3">{article.body}</p>
      )}
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
  const [revealed, setRevealed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Front Page');
  const [ctx, setCtx] = useState<PlayerContext>({
    characterName: '—',
    countryName: 'Drennia',
    continentName: 'Varelia',
    partyName: '—',
    partyColor: '#f59e0b',
    partyLogoId: '',
    partyAbbreviation: '—',
  });

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);

    // Load context
    const firstName = character.firstName;
    const mid = character.middleName;
    const last = character.lastName;
    const charName = [firstName, mid, last].filter(Boolean).join(' ') || '—';

    let countryName = 'Drennia';
    let continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) {
        const c = JSON.parse(raw);
        countryName = c.countryName ?? 'Drennia';
        continentName = c.continentName ?? 'Varelia';
      }
    } catch {}

    let partyName = '—';
    let partyColor = '#f59e0b';
    let partyLogoId = '';
    let partyAbbreviation = '—';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p: RegisteredPoliticalParty = JSON.parse(pRaw);
        partyName = p.partyName ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId = p.partyLogoId ?? '';
        partyColor = PARTY_COLORS.find((c) => c.id === p.colorId)?.hex ?? '#f59e0b';
      }
    } catch {}

    setCtx({ characterName: charName, countryName, continentName, partyName, partyColor, partyLogoId, partyAbbreviation });

    // Load articles
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

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
        className="min-h-screen flex flex-col transition-all duration-500"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        {/* ── WORLDr Top Bar (dark) ── */}
        <header
          className="shrink-0 px-4 md:px-6 py-0 flex items-center justify-between gap-4"
          style={{
            background: 'rgba(4,4,8,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            height: '48px',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Country flag */}
            <img
              src="/assets/flags/varelia/drennia.svg"
              alt="Drennia"
              style={{ width: '28px', height: '19px', objectFit: 'cover', borderRadius: '1px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
            />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-white font-bold text-[11px] tracking-wide">{ctx.countryName}</span>
              <span className="text-zinc-600 text-[8.5px] font-mono uppercase tracking-widest">{ctx.continentName}</span>
            </div>
            <div className="h-3.5 w-px bg-white/[0.07] hidden sm:block" />
            {/* Party badge */}
            {ctx.partyLogoId && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: `${ctx.partyColor}15`, border: `1px solid ${ctx.partyColor}30` }}>
                  <LogoSVG logoId={ctx.partyLogoId} color={ctx.partyColor} size={11} />
                </div>
                <span className="font-mono text-[9px] font-bold tracking-widest hidden md:block" style={{ color: ctx.partyColor }}>
                  {ctx.partyAbbreviation}
                </span>
              </div>
            )}
          </div>

          {/* Center: paper title (tiny) */}
          <div className="flex flex-col items-center leading-none">
            <span className={`${playfair.className} text-zinc-300 text-[11px] font-bold tracking-wide`}>
              The Varelian Record
            </span>
          </div>

          {/* Right: write article */}
          <button
            id="topbar-write-article"
            type="button"
            onClick={() => setShowModal(true)}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-90"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.30)',
              color: '#f59e0b',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Write Article
          </button>
        </header>

        {/* ── Newspaper area ── */}
        <main className="flex-1 flex flex-col" style={{ background: '#f3efe6' }}>

          {/* ── Masthead ── */}
          <div
            className="px-4 md:px-8 pt-6 pb-0"
            style={{ borderBottom: '2px solid #1a1a2e' }}
          >
            {/* Top meta row */}
            <div className="flex items-center justify-between mb-3 text-[9.5px] font-mono text-zinc-500 uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span>Est. Year 1</span>
                <span>·</span>
                <span>Continental Record</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Free Press</span>
                <span>·</span>
                <span>International Wire</span>
              </div>
            </div>

            {/* Thin rule */}
            <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, #1a1a2e40, transparent)' }} />

            {/* Giant title */}
            <div className="text-center pb-4">
              <h1
                className={`${playfair.className} text-gray-900 leading-none tracking-tight select-none`}
                style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 900 }}
              >
                The Varelian Record
              </h1>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="flex-1 h-px max-w-[120px]" style={{ background: '#1a1a2e40' }} />
                <p
                  className={`${playfair.className} text-zinc-500 text-sm italic`}
                >
                  "Public Life Across the Continent"
                </p>
                <div className="flex-1 h-px max-w-[120px]" style={{ background: '#1a1a2e40' }} />
              </div>
              <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.3em] mt-2">
                {today} · Varelia · {articles.length === 0 ? 'No Articles Yet' : `${articles.length} Article${articles.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* ── Category bar ── */}
          <div
            className="flex items-center overflow-x-auto"
            style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                id={`cat-${cat.toLowerCase().replace(' ', '-')}`}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-150"
                style={
                  activeCategory === cat
                    ? { color: '#f3efe6', borderBottom: '2px solid #c0a060', paddingBottom: 'calc(12px - 2px)' }
                    : { color: 'rgba(243,239,230,0.35)', borderBottom: '2px solid transparent' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Content area ── */}
          <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-8">
            {visibleArticles.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                {/* Elegant newspaper icon */}
                <div
                  className="w-20 h-20 rounded-sm flex items-center justify-center mb-6"
                  style={{ background: 'rgba(26,26,46,0.08)', border: '1px solid rgba(26,26,46,0.15)' }}
                >
                  <svg className="w-9 h-9 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>

                <h2
                  className={`${playfair.className} text-gray-800 font-bold mb-3`}
                  style={{ fontSize: '1.6rem' }}
                >
                  No Articles Published Yet
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mb-2">
                  No citizen, party, or public figure in{' '}
                  <span className="font-semibold text-zinc-600">Varelia</span> has published an article yet.
                  Be the first to shape the continental conversation.
                </p>

                <button
                  id="empty-write-article-btn"
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="group relative inline-flex items-center gap-2 px-8 py-3 text-sm font-bold uppercase tracking-[0.14em] rounded-sm overflow-hidden transition-all duration-200 mt-6"
                  style={{
                    background: '#1a1a2e',
                    color: '#f3efe6',
                    boxShadow: '0 4px 20px rgba(26,26,46,0.25)',
                  }}
                >
                  <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)' }} />
                  <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="relative z-10">Write the First Article</span>
                </button>

                <p className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest mt-4">
                  Articles written here will later be visible to players across Varelia.
                </p>
              </div>
            ) : (
              /* ── Article list ── */
              <div>
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-zinc-300">
                  <span
                    className={`${playfair.className} text-gray-700 font-bold`}
                    style={{ fontSize: '1rem' }}
                  >
                    {activeCategory}
                  </span>
                  <button
                    type="button"
                    id="article-list-write-btn"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 hover:opacity-80"
                    style={{ background: '#1a1a2e', color: '#c0a060' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Write Article
                  </button>
                </div>
                <div>
                  {visibleArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                {visibleArticles.length === 0 && activeCategory !== 'Front Page' && (
                  <div className="text-center py-16">
                    <p className={`${playfair.className} text-zinc-400 text-lg italic`}>
                      No articles in {activeCategory} yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="mt-4 text-[10px] font-mono uppercase tracking-widest text-amber-800 hover:text-amber-600 transition-colors"
                    >
                      Write the first {activeCategory} article →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-4 md:px-8 py-4 flex items-center justify-between flex-wrap gap-2"
            style={{ background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className={`${playfair.className} text-zinc-400 text-[11px]`}>
              The Varelian Record · Est. Year 1 · Free Press
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-widest text-zinc-600">
              WORLDr · {ctx.continentName} · All rights reserved
            </span>
          </div>
        </main>
      </div>
    </>
  );
}
