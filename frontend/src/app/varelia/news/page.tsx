'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Playfair_Display, IM_Fell_English } from 'next/font/google';
import { useCharacterStore } from '../../../store/character.store';
import { LogoSVG } from '../../../components/LogoSVG';
import { PARTY_COLORS } from '../../../data/political-parties/partyLogos';
import type { RegisteredPoliticalParty } from '../../../data/political-parties/partyTypes';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const imFell = IM_Fell_English({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Article {
  articleId: string;
  headline: string;
  writerName: string;
  category: string;
  body: string;
  imageDataUrl?: string;
  createdAt: string;
  continentName: string;
  countryName: string;
  partyAbbreviation?: string;
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

const STORAGE_KEY = 'worldr_varelia_articles';

const MAIN_TABS = ['Home', 'Actions', 'Government', 'Nation', 'World', 'Ledger'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const CATEGORIES = ['Front Page', 'Politics', 'Business', 'International', 'Society', 'Opinion'] as const;
type Category = (typeof CATEGORIES)[number];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

const FUTURE_PATHS = [
  { label: 'Become Businessman', id: 'businessman' },
  { label: 'Join Military',       id: 'military'   },
  { label: 'Join Judiciary',      id: 'judicial'   },
  { label: 'Enter Media',         id: 'media'      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGameDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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
  partyAbbreviation,
  onClose,
  onPublish,
}: {
  defaultWriter: string;
  partyAbbreviation?: string;
  onClose: () => void;
  onPublish: (article: Article) => void;
}) {
  const [headline,      setHeadline]      = useState('');
  const [writerName,    setWriterName]    = useState(defaultWriter);
  const [category,      setCategory]      = useState<Category>('Front Page');
  const [body,          setBody]          = useState('');
  const [imageDataUrl,  setImageDataUrl]  = useState<string | null>(null);
  const [imageName,     setImageName]     = useState('');
  const [imageError,    setImageError]    = useState('');
  const [touched,       setTouched]       = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid =
    headline.trim().length > 0 &&
    writerName.trim().length > 0 &&
    body.trim().length >= 1;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Only PNG, JPG, and WebP images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be smaller than 2 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch {
      setImageError('Failed to read image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageDataUrl(null);
    setImageName('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = () => {
    setTouched(true);
    if (!isValid) return;
    onPublish({
      articleId:         generateId(),
      headline:          headline.trim(),
      writerName:        writerName.trim(),
      category,
      body:              body.trim(),
      imageDataUrl:      imageDataUrl ?? undefined,
      createdAt:         new Date().toISOString(),
      continentName:     'Varelia',
      countryName:       'Drennia',
      partyAbbreviation: partyAbbreviation,
    });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const fieldError = (hasError: boolean): React.CSSProperties => ({
    background: 'rgba(5,5,14,0.9)',
    border: hasError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.09)',
    color: '#e4e4e7',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden"
        style={{
          background: 'rgba(4,4,11,0.99)',
          border: '1px solid rgba(192,160,96,0.22)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 40px 100px rgba(0,0,0,0.96)',
          borderRadius: '2px',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgba(192,160,96,0.08), transparent)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(192,160,96,0.08)',
                border: '1px solid rgba(192,160,96,0.22)',
                borderRadius: '2px',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#c0a060" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">Write Article</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] mt-0.5" style={{ color: 'rgba(192,160,96,0.55)' }}>
                The Varelian Record · Varelia
              </div>
            </div>
          </div>
          <button
            id="modal-close"
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center transition-colors text-zinc-600 hover:text-zinc-300"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px' }}
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
            <label className="block text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: 'rgba(192,160,96,0.65)' }}>
              Headline <span className="text-red-500">*</span>
            </label>
            <input
              id="article-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Write a compelling headline…"
              className="w-full px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
              style={fieldError(touched && !headline.trim())}
            />
            {touched && !headline.trim() && (
              <p className="text-red-400 text-[9px] mt-1 font-mono">Headline is required.</p>
            )}
          </div>

          {/* Writer + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: 'rgba(192,160,96,0.65)' }}>
                Writer Name <span className="text-red-500">*</span>
              </label>
              <input
                id="article-writer"
                type="text"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700"
                style={fieldError(touched && !writerName.trim())}
              />
              {touched && !writerName.trim() && (
                <p className="text-red-400 text-[9px] mt-1 font-mono">Writer name is required.</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: 'rgba(192,160,96,0.65)' }}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="article-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(5,5,14,0.9)',
                  border: '1px solid rgba(255,255,255,0.09)',
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
                  <option key={c} value={c} style={{ background: '#05050e' }}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Article body */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: 'rgba(192,160,96,0.65)' }}>
              Article Body <span className="text-red-500">*</span>
            </label>
            <textarea
              id="article-body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your article here. Share analysis, commentary, or breaking news for the citizens of Varelia…"
              className="w-full px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-700 resize-none leading-relaxed"
              style={fieldError(touched && body.trim().length < 1)}
            />
            <div className="flex items-center justify-between mt-1">
              {touched && body.trim().length < 1 ? (
                <p className="text-red-400 text-[9px] font-mono">Article body is required.</p>
              ) : <span />}
              <span className="text-zinc-700 font-mono text-[9px]">{body.length} chars</span>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: 'rgba(192,160,96,0.65)' }}>
              Article Image{' '}
              <span className="normal-case tracking-normal text-zinc-600 font-normal ml-1">optional · max 2 MB · PNG, JPG, WebP</span>
            </label>

            {imageDataUrl ? (
              /* Preview */
              <div
                className="relative rounded-sm overflow-hidden"
                style={{ border: '1px solid rgba(192,160,96,0.2)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Article preview"
                  className="w-full object-cover"
                  style={{ maxHeight: '180px' }}
                />
                <div
                  className="absolute inset-0 flex items-end justify-between px-3 py-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}
                >
                  <span className="text-zinc-300 text-[9px] font-mono truncate max-w-[80%]">{imageName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-1 transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171',
                      borderRadius: '2px',
                    }}
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              /* Upload zone */
              <div
                className="w-full h-20 flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-150"
                style={{
                  border: imageError ? '1.5px dashed rgba(239,68,68,0.45)' : '1.5px dashed rgba(255,255,255,0.09)',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '2px',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <span className="text-zinc-500 text-[10px] font-mono">Reading image…</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-zinc-600 text-[10px] font-mono">Click to upload image · JPG, PNG, WebP · max 2 MB</span>
                  </>
                )}
              </div>
            )}

            {imageError && (
              <p className="text-red-400 text-[9px] mt-1 font-mono">{imageError}</p>
            )}

            <input
              ref={fileInputRef}
              id="img-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Destination label */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: 'rgba(192,160,96,0.04)', border: '1px solid rgba(192,160,96,0.10)', borderRadius: '2px' }}
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="rgba(192,160,96,0.5)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(192,160,96,0.5)' }}>
              Publish to: The Varelian Record · Varelia · {category}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex items-center justify-between"
          style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest hidden sm:block">
            Visible to citizens across Varelia
          </span>
          <div className="flex items-center gap-3">
            <button
              id="modal-cancel"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#a1a1aa',
                borderRadius: '2px',
              }}
            >
              Cancel
            </button>
            <button
              id="modal-publish"
              type="button"
              onClick={handlePublish}
              disabled={!isValid}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest overflow-hidden transition-all duration-200"
              style={{
                background: isValid ? 'linear-gradient(135deg, #c8a84b, #a07830)' : 'rgba(192,160,96,0.07)',
                color:      isValid ? '#fff' : '#6b5a2e',
                border:     isValid ? '1px solid rgba(192,160,96,0.35)' : '1px solid rgba(192,160,96,0.12)',
                boxShadow:  isValid ? '0 3px 20px rgba(192,160,96,0.2)' : 'none',
                borderRadius: '2px',
                cursor: isValid ? 'pointer' : 'not-allowed',
              }}
            >
              {isValid && (
                <span
                  className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
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

  const categoryColor: Record<string, string> = {
    'Front Page':    '#8b0000',
    'Politics':      '#1a3a5c',
    'Business':      '#1a4a1a',
    'International': '#3a1a5c',
    'Society':       '#4a3a1a',
    'Opinion':       '#1a3a3a',
  };

  const bg = categoryColor[article.category] ?? '#1a1a2e';

  return (
    <article
      className="py-5 transition-all duration-200"
      style={{ borderBottom: '1px solid rgba(26,26,46,0.15)' }}
    >
      {/* Image */}
      {article.imageDataUrl && (
        <div className="mb-3 overflow-hidden" style={{ borderRadius: '2px', border: '1px solid rgba(26,26,46,0.15)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageDataUrl}
            alt={article.headline}
            className="w-full object-cover"
            style={{ maxHeight: '220px' }}
          />
        </div>
      )}

      {/* Category + date */}
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="text-[7.5px] font-bold uppercase tracking-[0.2em] px-2 py-0.5"
          style={{ background: bg, color: '#e8dfc8', borderRadius: '2px' }}
        >
          {article.category}
        </span>
        <span className="text-zinc-400 text-[9px] font-mono">{formatGameDate(article.createdAt)}</span>
        {article.partyAbbreviation && article.partyAbbreviation !== '—' && (
          <>
            <span className="text-zinc-500 text-[9px]">·</span>
            <span className="text-zinc-500 text-[9px] font-mono">{article.partyAbbreviation}</span>
          </>
        )}
      </div>

      {/* Headline */}
      <h3
        className={`font-bold text-gray-900 leading-snug mb-1.5 cursor-pointer hover:text-amber-900 transition-colors ${playfair.className}`}
        style={{ fontSize: '1.08rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        {article.headline}
      </h3>

      {/* Byline */}
      <p className="text-zinc-500 text-[9.5px] font-mono mb-2">
        By <span className="text-zinc-600 font-semibold">{article.writerName}</span>
        {' '}· {article.countryName}, {article.continentName}
      </p>

      {/* Body */}
      <p className={`text-gray-600 text-[13.5px] leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
        {article.body}
      </p>

      {article.body.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors"
          style={{ color: '#8b5e3c' }}
        >
          {expanded ? '▲ Collapse' : '▼ Read more'}
        </button>
      )}
    </article>
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
    partyName: '—', partyAbbreviation: '—', partyColor: '#c0a060',
    partyLogoId: '', selectedPath: 'Politician',
  });

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);

    const charName =
      [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ') || '—';

    let countryName = 'Drennia', continentName = 'Varelia';
    try {
      const raw = localStorage.getItem('worldr_selected_country');
      if (raw) { const c = JSON.parse(raw); countryName = c.countryName ?? 'Drennia'; continentName = c.continentName ?? 'Varelia'; }
    } catch {}

    let partyName = '—', partyAbbreviation = '—', partyColor = '#c0a060', partyLogoId = '';
    try {
      const pRaw = localStorage.getItem('worldr_current_party');
      if (pRaw) {
        const p: RegisteredPoliticalParty = JSON.parse(pRaw);
        partyName         = p.partyName         ?? '—';
        partyAbbreviation = p.partyAbbreviation ?? '—';
        partyLogoId       = p.partyLogoId       ?? '';
        partyColor        = PARTY_COLORS.find((c) => c.id === p.colorId)?.hex ?? '#c0a060';
      }
    } catch {}

    const pathRaw = localStorage.getItem('worldr_selected_path') || localStorage.getItem('worldr-path');
    const pathLabels: Record<string, string> = {
      politician: 'Politician', businessman: 'Businessman',
      military: 'Military Officer', judicial: 'Judicial Officer', media: 'Media & Influence',
    };
    const selectedPath = pathLabels[pathRaw ?? ''] ?? 'Politician';

    setCtx({ characterName: charName, countryName, continentName, partyName, partyAbbreviation, partyColor, partyLogoId, selectedPath });

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

  return (
    <>
      {showModal && (
        <WriteArticleModal
          defaultWriter={ctx.characterName !== '—' ? ctx.characterName : ''}
          partyAbbreviation={ctx.partyAbbreviation !== '—' ? ctx.partyAbbreviation : undefined}
          onClose={() => setShowModal(false)}
          onPublish={handlePublish}
        />
      )}

      <div
        className="min-h-screen flex flex-col transition-opacity duration-500"
        style={{ opacity: revealed ? 1 : 0, background: '#06060e' }}
      >

        {/* ══════════════════════════════════════════════════════════════
            TOP GAME BAR
        ══════════════════════════════════════════════════════════════ */}
        <header
          className="shrink-0 flex items-center justify-between px-4 md:px-5 gap-3"
          style={{
            height: '48px',
            background: 'rgba(3,3,9,0.99)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Left: flag + country + game date */}
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

            <div className="hidden md:flex flex-col leading-none">
              <span className="text-zinc-400 text-[10.5px] font-mono font-semibold tracking-wide">
                Year 0 · Month 1 · Day 1
              </span>
              <span className="text-zinc-700 text-[8px] font-mono uppercase tracking-widest">
                00:00 · Game Start
              </span>
            </div>
          </div>

          {/* Right: bell · cash · party menu · logout */}
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
            background: 'rgba(5,5,13,0.98)',
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
                  borderBottom: isCurrent ? '2px solid #c0a060' : '2px solid transparent',
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
            background: 'rgba(8,8,19,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <button
            id="subtab-news"
            type="button"
            className="relative px-4 h-full flex items-center text-[9.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: '#c0a060', borderBottom: '2px solid #c0a060' }}
          >
            News
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CONTENT: NEWSPAPER AREA
        ══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#f0ebe0' }}>

          {/* ─── Newspaper Masthead ───────────────────────────────────── */}
          <div
            className="w-full"
            style={{ background: '#f7f3e8', borderBottom: '3px double #1a1a2e' }}
          >
            <div className="max-w-4xl mx-auto px-4 md:px-10 pt-6 pb-0">

              {/* Top info row */}
              <div
                className="flex items-center justify-between pb-2 mb-2 text-[8px] font-mono uppercase tracking-[0.2em]"
                style={{ borderBottom: '1px solid rgba(26,26,46,0.15)', color: '#8a7a5a' }}
              >
                <div className="flex items-center gap-3">
                  <span>Est. Year 0</span>
                  <span style={{ color: '#c0a060' }}>·</span>
                  <span>Continental Record</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Free Press</span>
                  <span style={{ color: '#c0a060' }}>·</span>
                  <span>International Wire</span>
                </div>
              </div>

              {/* Masthead title */}
              <div className="text-center py-4 relative">
                <h1
                  className={`${playfair.className} text-gray-900 leading-none`}
                  style={{
                    fontSize: 'clamp(1.9rem, 5vw, 3.4rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.01em',
                    textShadow: '0 1px 0 rgba(0,0,0,0.08)',
                  }}
                >
                  The Varelian Record
                </h1>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex-1 h-px" style={{ background: 'rgba(26,26,46,0.2)', maxWidth: '80px' }} />
                  <p className={`${imFell.className} text-[13px] italic`} style={{ color: '#8a7a5a' }}>
                    &ldquo;Public Life Across the Continent&rdquo;
                  </p>
                  <div className="flex-1 h-px" style={{ background: 'rgba(26,26,46,0.2)', maxWidth: '80px' }} />
                </div>
                <p className="font-mono text-[7.5px] uppercase tracking-[0.3em] mt-2" style={{ color: '#a09070' }}>
                  Year 0 · Month 1 · Day 1 &nbsp;·&nbsp;{' '}
                  {articles.length === 0 ? 'No Articles Published' : `${articles.length} Article${articles.length !== 1 ? 's' : ''} Published`}
                </p>
              </div>

              {/* Write Article button row */}
              <div
                className="flex items-center justify-end pb-3"
              >
                <button
                  id="topnews-write-btn"
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
                  style={{
                    background: '#1a1a2e',
                    color: '#c0a060',
                    border: '1px solid rgba(192,160,96,0.25)',
                    borderRadius: '2px',
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Write Article
                </button>
              </div>
            </div>
          </div>

          {/* ─── Category bar ─────────────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 w-full overflow-x-auto"
            style={{ background: '#1a1a2e', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
          >
            <div className="max-w-4xl mx-auto px-2 md:px-6 flex items-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  id={`news-cat-${cat.toLowerCase().replace(' ', '-')}`}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-4 py-3 text-[9px] font-bold uppercase tracking-[0.18em] transition-all duration-150 relative"
                  style={
                    activeCategory === cat
                      ? { color: '#c0a060' }
                      : { color: 'rgba(243,239,230,0.32)' }
                  }
                >
                  {cat}
                  {activeCategory === cat && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: '#c0a060' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Articles / Empty state ───────────────────────────────── */}
          <div className="max-w-4xl mx-auto px-4 md:px-10 py-8 pb-20">
            {visibleArticles.length === 0 ? (
              /* ─ Empty state ─ */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                {/* Ornamental newspaper icon */}
                <div
                  className="w-20 h-20 flex items-center justify-center mb-7 relative"
                  style={{
                    background: 'linear-gradient(135deg, #f7f3e8, #ede8d8)',
                    border: '2px solid rgba(26,26,46,0.12)',
                    borderRadius: '2px',
                    boxShadow: '0 4px 20px rgba(26,26,46,0.08)',
                  }}
                >
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,46,0.35)" strokeWidth={0.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  {/* Corner ornaments */}
                  <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l" style={{ borderColor: 'rgba(192,160,96,0.4)' }} />
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r" style={{ borderColor: 'rgba(192,160,96,0.4)' }} />
                  <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l" style={{ borderColor: 'rgba(192,160,96,0.4)' }} />
                  <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r" style={{ borderColor: 'rgba(192,160,96,0.4)' }} />
                </div>

                {/* Decorative rule */}
                <div className="flex items-center gap-3 mb-5 w-full max-w-xs">
                  <div className="flex-1 h-px" style={{ background: 'rgba(26,26,46,0.15)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(192,160,96,0.6)' }}>✦</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(26,26,46,0.15)' }} />
                </div>

                <h2
                  className={`${playfair.className} text-gray-800 font-bold mb-3`}
                  style={{ fontSize: '1.5rem', letterSpacing: '-0.01em' }}
                >
                  No Articles Published Yet
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mb-1">
                  No citizen, party, or public figure in{' '}
                  <span className="font-semibold text-zinc-600">Varelia</span> has published an article yet.
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mb-7">
                  Be the first to shape the continental conversation.
                </p>

                <button
                  id="empty-write-btn"
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="group relative inline-flex items-center gap-2.5 px-8 py-3 text-sm font-bold uppercase tracking-[0.14em] overflow-hidden transition-all duration-200"
                  style={{
                    background: '#1a1a2e',
                    color: '#e8dfc8',
                    border: '1px solid rgba(192,160,96,0.3)',
                    borderRadius: '2px',
                    boxShadow: '0 4px 20px rgba(26,26,46,0.18)',
                  }}
                >
                  <span
                    className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)' }}
                  />
                  <svg className="w-3.5 h-3.5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="#c0a060" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="relative z-10">Write the First Article</span>
                </button>

                <p className="font-mono text-[8px] uppercase tracking-widest mt-4" style={{ color: '#a09070' }}>
                  Articles written here will be visible to players across Varelia
                </p>
              </div>
            ) : (
              /* ─ Article list ─ */
              <div>
                {/* Section header */}
                <div
                  className="flex items-center justify-between mb-5 pb-3"
                  style={{ borderBottom: '2px solid rgba(26,26,46,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <h2
                      className={`${playfair.className} text-gray-800 font-bold`}
                      style={{ fontSize: '1.1rem' }}
                    >
                      {activeCategory}
                    </h2>
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                      {visibleArticles.length} {visibleArticles.length === 1 ? 'article' : 'articles'}
                    </span>
                  </div>
                  <button
                    id="list-write-btn"
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
                    style={{ background: '#1a1a2e', color: '#c0a060', borderRadius: '2px' }}
                  >
                    + Write Article
                  </button>
                </div>

                {visibleArticles.map((a) => (
                  <ArticleCard key={a.articleId} article={a} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 md:px-10 py-4 flex items-center justify-between flex-wrap gap-2"
            style={{ background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className={`${playfair.className} text-zinc-400 text-[10px] italic`}>
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
