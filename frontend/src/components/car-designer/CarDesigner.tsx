'use client';
/**
 * Car Designer — a guided, full-screen designer for a new car.
 *
 * Every number on the right-hand panel comes from the server
 * (POST /manufacturing/models/preview), which runs the SAME engineering engine
 * and the SAME demand engine as the real game, so the preview is exactly what
 * the player will get. Styling (paint, body, wheels, tagline) is visual only.
 */
import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Check, AlertTriangle, Loader2, Users, Wrench, Palette, Gauge, Car, Rocket } from 'lucide-react';
import CarPreview, { type PaintSwatch } from './CarPreview';
import { manufacturingApi } from '../../lib/api';
import { gameMonthsToRealTime } from '../../lib/gameTime';

const C = {
  bg: '#090A0F', panel: '#11131A', panel2: '#161821', border: '#2A2630', gold: '#C9A24A',
  ivory: '#F4EBD6', muted: '#A79D8C', faint: '#6B6358', green: '#4ADE80', red: '#F87171', blue: '#7DB4E6',
};

interface Option { id: string; label: string; desc?: string; baseCost?: number; locked?: boolean; costMultiplier?: number }
interface Bootstrap {
  vehicleClasses: { id: string; label: string }[];
  platforms: Option[]; powerUnits: Option[]; drivetrains: Option[];
  interiorTiers: Option[]; safetyTiers: Option[]; qualityTargets: Option[];
  engineeringPriorities?: { id: string; label: string; desc: string }[];
  defaultEngineeringPriorities?: Record<string, number>;
  carStyle?: { paints: (PaintSwatch & { label: string; premium?: boolean })[]; bodyStyles: Record<string, { id: string; label: string }[]>; wheels: { id: string; label: string }[]; taglineMaxLength: number };
  buyerSegments?: { id: string; name: string; populationShare: number; priceCeiling: number }[];
}
interface Design {
  vehicleClass: string; platform: string; powerUnit: string; drivetrain: string;
  interiorTier: string; safetyTier: string; qualityTarget: string; targetSegment: string;
  priorities: Record<string, number>; salePrice: number | null; marketingTier: string;
}
interface Style { paint: string; accent: string; bodyStyle: string; wheels: string; tagline: string }
interface Preview {
  scores: Record<string, number>; unitCost: number; salePrice: number; marginPerCar: number; targetSegment: string;
  devCost: number; devTimeMonths: number; canAfford: boolean; availableCash: number; grade: string; assessment: string;
  recommendations: string[]; engineeringRisk: number; weightKg: number;
  forecast: { markets: { marketId: string; name: string; marketBuyersPerMonth: number; interestedBuyers: number }[]; totalInterested: number; totalMarketBuyers: number };
}

const FOCUS_PRESETS: { id: string; label: string; hint: string; p: Record<string, number> }[] = [
  { id: 'balanced',  label: 'Balanced',       hint: 'A bit of everything.',                         p: { reliability: 20, performance: 15, fuel_economy: 20, comfort: 15, practicality: 15, mfg_simplicity: 15 } },
  { id: 'reliable',  label: 'Bulletproof',    hint: 'Built to last. Buyers trust it.',              p: { reliability: 35, performance: 10, fuel_economy: 15, comfort: 10, practicality: 15, mfg_simplicity: 15 } },
  { id: 'fast',      label: 'Performance',    hint: 'Power first. Thirstier and pricier.',          p: { reliability: 15, performance: 35, fuel_economy: 5,  comfort: 20, practicality: 10, mfg_simplicity: 15 } },
  { id: 'efficient', label: 'Efficiency',     hint: 'Light and frugal. Budget buyers love it.',     p: { reliability: 15, performance: 10, fuel_economy: 35, comfort: 10, practicality: 15, mfg_simplicity: 15 } },
  { id: 'comfort',   label: 'Comfort',        hint: 'Quiet, plush cabin. Appeals to premium buyers.', p: { reliability: 15, performance: 15, fuel_economy: 10, comfort: 35, practicality: 15, mfg_simplicity: 10 } },
  { id: 'cheap',     label: 'Cheap to build', hint: 'Simpler to make, lower cost per car.',          p: { reliability: 15, performance: 10, fuel_economy: 15, comfort: 10, practicality: 15, mfg_simplicity: 35 } },
];

const TEMPLATES: { id: string; name: string; pitch: string; design: Omit<Design, 'salePrice' | 'marketingTier'>; style: Omit<Style, 'tagline'> }[] = [
  { id: 'city', name: 'City Runabout', pitch: 'Cheap, frugal, easy to sell to the biggest group of buyers.',
    design: { vehicleClass: 'Compact Car', platform: 'economy', powerUnit: 'small-i4', drivetrain: 'fwd', interiorTier: 'basic', safetyTier: 'standard', qualityTarget: 'budget', targetSegment: 'budget', priorities: FOCUS_PRESETS[3].p },
    style: { paint: 'ember-orange', accent: 'midnight-black', bodyStyle: 'hatchback', wheels: 'steel' } },
  { id: 'family', name: 'Family Saloon', pitch: 'Safe, roomy and sensible — the backbone of any car maker.',
    design: { vehicleClass: 'Sedan', platform: 'standard', powerUnit: 'standard-i4', drivetrain: 'fwd', interiorTier: 'comfort', safetyTier: 'enhanced', qualityTarget: 'standard', targetSegment: 'family', priorities: FOCUS_PRESETS[0].p },
    style: { paint: 'ocean-blue', accent: 'silver-mist', bodyStyle: 'saloon', wheels: 'spoke' } },
  { id: 'van', name: 'Workhorse Van', pitch: 'Businesses buy on reliability and cargo space, not looks.',
    design: { vehicleClass: 'Utility Van', platform: 'heavy-duty', powerUnit: 'standard-i4', drivetrain: 'rwd', interiorTier: 'basic', safetyTier: 'enhanced', qualityTarget: 'standard', targetSegment: 'commercial', priorities: FOCUS_PRESETS[1].p },
    style: { paint: 'arctic-white', accent: 'graphite', bodyStyle: 'panel-van', wheels: 'steel' } },
  { id: 'sport', name: 'Sports Coupé', pitch: 'Fewer buyers, bigger margins. Needs strong appeal.',
    design: { vehicleClass: 'Sedan', platform: 'standard', powerUnit: 'v6', drivetrain: 'rwd', interiorTier: 'premium', safetyTier: 'enhanced', qualityTarget: 'premium', targetSegment: 'performance', priorities: FOCUS_PRESETS[2].p },
    style: { paint: 'drennia-red', accent: 'midnight-black', bodyStyle: 'coupe', wheels: 'turbine' } },
  { id: 'lux', name: 'Executive Luxury', pitch: 'A small, wealthy market that pays for the best.',
    design: { vehicleClass: 'Sedan', platform: 'standard', powerUnit: 'v6', drivetrain: 'awd', interiorTier: 'premium', safetyTier: 'advanced', qualityTarget: 'premium', targetSegment: 'luxury', priorities: FOCUS_PRESETS[4].p },
    style: { paint: 'midnight-black', accent: 'harvest-gold', bodyStyle: 'saloon', wheels: 'mesh' } },
];

const STEPS = [
  { id: 'start', label: 'Start', icon: Sparkles },
  { id: 'body', label: 'Body', icon: Car },
  { id: 'power', label: 'Powertrain', icon: Gauge },
  { id: 'cabin', label: 'Cabin & Safety', icon: Wrench },
  { id: 'focus', label: 'Engineering', icon: Wrench },
  { id: 'identity', label: 'Name, Look & Price', icon: Palette },
] as const;

const SCORE_LABELS: [string, string][] = [
  ['reliability', 'Reliability'], ['performance', 'Performance'], ['fuelEfficiency', 'Fuel economy'],
  ['safety', 'Safety'], ['appeal', 'Appeal'], ['cargo', 'Cargo'],
];

const money = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v).toLocaleString('en-US')}`;
};

function OptionCard({ opt, selected, onSelect, extra }: { opt: Option; selected: boolean; onSelect: () => void; extra?: string }) {
  return (
    <button type="button" disabled={opt.locked} onClick={onSelect}
      className="text-left p-3 rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: selected ? C.gold : C.border, background: selected ? 'rgba(201,162,74,0.08)' : C.panel2 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold" style={{ color: selected ? C.gold : C.ivory }}>{opt.label}</span>
        {selected && <Check size={14} color={C.gold} />}
        {opt.locked && <span className="text-[9px] uppercase tracking-wider" style={{ color: C.faint }}>Locked</span>}
      </div>
      {opt.desc && <p className="text-[11px] mt-1 leading-snug" style={{ color: C.muted }}>{opt.desc.replace(/Coming Soon.*Locked/, 'Coming soon')}</p>}
      {extra && <p className="text-[10px] mt-1.5 font-mono" style={{ color: C.faint }}>{extra}</p>}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-mono uppercase tracking-[0.14em] mb-1" style={{ color: C.gold }}>{title}</h3>
      {hint && <p className="text-[12px] mb-3" style={{ color: C.muted }}>{hint}</p>}
      {children}
    </div>
  );
}

export default function CarDesigner({ companyId, companyName, onClose, onCreated }: {
  companyId: string; companyName?: string; onClose: () => void; onCreated: () => void;
}) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [design, setDesign] = useState<Design>({ ...TEMPLATES[1].design, salePrice: null, marketingTier: 'none' });
  const [style, setStyle] = useState<Style>({ ...TEMPLATES[1].style, tagline: '' });
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; months: number } | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    manufacturingApi.getBootstrap().then(res => setBoot(res.data)).catch(() => setPreviewError('Could not load design options.'));
  }, []);

  // Live preview from the real engines, debounced.
  useEffect(() => {
    const seq = ++reqSeq.current;
    setLoadingPreview(true);
    const t = setTimeout(async () => {
      try {
        const data = await manufacturingApi.previewModel(companyId, {
          vehicleClass: design.vehicleClass, platform: design.platform, powerUnit: design.powerUnit,
          drivetrain: design.drivetrain, interiorTier: design.interiorTier, safetyTier: design.safetyTier,
          qualityTarget: design.qualityTarget, targetSegment: design.targetSegment,
          engineeringPriorities: design.priorities, salePrice: design.salePrice ?? undefined,
          marketingTier: design.marketingTier,
        });
        if (seq === reqSeq.current) { setPreview(data); setPreviewError(null); }
      } catch (err: any) {
        if (seq === reqSeq.current) setPreviewError(err?.response?.data?.error || 'Preview unavailable right now.');
      } finally {
        if (seq === reqSeq.current) setLoadingPreview(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [companyId, design]);

  const paints = boot?.carStyle?.paints ?? [];
  const bodyStyles = boot?.carStyle?.bodyStyles?.[design.vehicleClass] ?? [];
  const set = (patch: Partial<Design>) => setDesign(d => ({ ...d, ...patch }));

  const applyTemplate = (tid: string) => {
    const t = TEMPLATES.find(x => x.id === tid)!;
    setDesign({ ...t.design, salePrice: null, marketingTier: design.marketingTier });
    setStyle(s => ({ ...t.style, tagline: s.tagline }));
    setStep(1);
  };

  const changeClass = (vehicleClass: string) => {
    set({ vehicleClass });
    const first = boot?.carStyle?.bodyStyles?.[vehicleClass]?.[0]?.id;
    if (first) setStyle(s => ({ ...s, bodyStyle: first }));
  };

  const setPriority = (id: string, value: number) => {
    const others = Object.keys(design.priorities).filter(k => k !== id);
    const remaining = 100 - value;
    const otherSum = others.reduce((s, k) => s + design.priorities[k], 0) || 1;
    const next: Record<string, number> = { [id]: value };
    let assigned = 0;
    others.forEach((k, i) => {
      const v = i === others.length - 1 ? remaining - assigned : Math.round((design.priorities[k] / otherSum) * remaining);
      next[k] = Math.max(0, v); assigned += next[k];
    });
    set({ priorities: next });
  };

  const activePreset = FOCUS_PRESETS.find(p => Object.keys(p.p).every(k => p.p[k] === design.priorities[k]))?.id;
  const segment = boot?.buyerSegments?.find(s => s.id === design.targetSegment);
  const priceMin = preview ? Math.ceil(preview.unitCost * 1.05 / 100) * 100 : 0;
  const priceMax = preview ? Math.max(Math.ceil(preview.unitCost * 3 / 100) * 100, priceMin + 1000) : 0;
  const shownPrice = design.salePrice ?? preview?.salePrice ?? 0;
  const maxInterest = Math.max(1, ...(preview?.forecast.markets.map(m => m.interestedBuyers) ?? [1]));
  const nameOk = name.trim().length > 0 && name.trim().length <= 60;

  const submit = async () => {
    if (!nameOk || !preview?.canAfford) return;
    setSubmitting(true); setSubmitError(null);
    try {
      await manufacturingApi.createModel(companyId, {
        name: name.trim(),
        vehicleClass: design.vehicleClass, platform: design.platform, powerUnit: design.powerUnit,
        drivetrain: design.drivetrain, interiorTier: design.interiorTier, safetyTier: design.safetyTier,
        qualityTarget: design.qualityTarget, targetSegment: design.targetSegment,
        engineeringPriorities: design.priorities, salePrice: shownPrice,
        style: { paint: style.paint, accent: style.accent, bodyStyle: style.bodyStyle, wheels: style.wheels, tagline: style.tagline || undefined },
      });
      setCreated({ name: name.trim(), months: preview.devTimeMonths });
      onCreated();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Could not start development.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(5,6,9,0.92)' }}>
        <div className="w-full max-w-xl rounded-lg border p-6 text-center" style={{ background: C.panel, borderColor: C.border }}>
          <div className="mx-auto max-w-md"><CarPreview vehicleClass={design.vehicleClass} style={style} paints={paints} /></div>
          <h2 className="text-2xl font-bold mt-4" style={{ color: C.ivory, fontFamily: 'Cinzel, serif' }}>{created.name}</h2>
          {style.tagline && <p className="italic mt-1" style={{ color: C.muted }}>“{style.tagline}”</p>}
          <p className="mt-4 text-[13px]" style={{ color: C.muted }}>
            Development has started. Your engineers need {gameMonthsToRealTime(created.months)}.
            When it&apos;s ready, launch it, assign a production line and choose which regions to sell in.
          </p>
          <button onClick={onClose} className="mt-6 px-5 py-2.5 rounded-md font-semibold text-[13px]" style={{ background: C.gold, color: '#111' }}>
            Back to my company
          </button>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col" style={{ background: C.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b" style={{ borderColor: C.border, background: C.panel }}>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: C.gold }}>{companyName ?? 'Your company'} · Car Designer</div>
          <div className="text-[15px] font-semibold truncate" style={{ color: C.ivory }}>{name.trim() || 'Untitled car'}</div>
        </div>
        <button onClick={onClose} aria-label="Close designer" className="p-2 rounded hover:bg-white/5"><X size={18} color={C.muted} /></button>
      </div>

      {/* Step bar */}
      <div className="flex gap-1 px-4 sm:px-6 py-2 overflow-x-auto border-b" style={{ borderColor: C.border }}>
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] whitespace-nowrap"
            style={{ background: i === step ? 'rgba(201,162,74,0.12)' : 'transparent', color: i === step ? C.gold : i < step ? C.ivory : C.faint }}>
            <span className="font-mono">{i + 1}</span> {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── Left: step content ── */}
        <div className="overflow-y-auto px-4 sm:px-6 py-5 order-2 lg:order-1">
          <div className="flex items-center gap-2 mb-4">
            <StepIcon size={16} color={C.gold} />
            <h2 className="text-lg font-semibold" style={{ color: C.ivory }}>{STEPS[step].label}</h2>
          </div>

          {!boot && <div className="flex items-center gap-2 text-[13px]" style={{ color: C.muted }}><Loader2 className="animate-spin" size={14} /> Loading options…</div>}

          {boot && step === 0 && (
            <Section title="Pick a starting point" hint="Each template is a sensible car for one kind of buyer. You can change everything afterwards.">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)} className="text-left rounded-md border p-3 transition-all hover:border-[#C9A24A]"
                    style={{ borderColor: C.border, background: C.panel2 }}>
                    <CarPreview vehicleClass={t.design.vehicleClass} style={t.style} paints={paints} size="small" />
                    <div className="mt-2 text-[14px] font-semibold" style={{ color: C.ivory }}>{t.name}</div>
                    <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>{t.pitch}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {boot && step === 1 && (
            <>
              <Section title="Vehicle type">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.vehicleClasses.map(v => <OptionCard key={v.id} opt={v} selected={design.vehicleClass === v.id} onSelect={() => changeClass(v.id)} />)}
                </div>
              </Section>
              <Section title="Body style" hint="How it looks. Purely visual — it doesn't change scores or cost.">
                <div className="grid grid-cols-3 gap-2">
                  {bodyStyles.map(b => (
                    <button key={b.id} onClick={() => setStyle(s => ({ ...s, bodyStyle: b.id }))} className="rounded-md border p-2"
                      style={{ borderColor: style.bodyStyle === b.id ? C.gold : C.border, background: C.panel2 }}>
                      <CarPreview vehicleClass={design.vehicleClass} style={{ ...style, bodyStyle: b.id }} paints={paints} size="small" />
                      <div className="text-[11px] mt-1" style={{ color: style.bodyStyle === b.id ? C.gold : C.muted }}>{b.label}</div>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Platform" hint="The chassis everything is built on. Sets the base cost and character.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.platforms.map(o => <OptionCard key={o.id} opt={o} selected={design.platform === o.id} onSelect={() => set({ platform: o.id })} extra={o.baseCost != null ? `${money(o.baseCost)} per car` : undefined} />)}
                </div>
              </Section>
            </>
          )}

          {boot && step === 2 && (
            <>
              <Section title="Engine">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {boot.powerUnits.map(o => <OptionCard key={o.id} opt={o} selected={design.powerUnit === o.id} onSelect={() => set({ powerUnit: o.id })} extra={o.baseCost != null ? `+${money(o.baseCost)} per car` : undefined} />)}
                </div>
              </Section>
              <Section title="Drivetrain">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.drivetrains.map(o => <OptionCard key={o.id} opt={o} selected={design.drivetrain === o.id} onSelect={() => set({ drivetrain: o.id })} extra={o.baseCost ? `+${money(o.baseCost)} per car` : 'No extra cost'} />)}
                </div>
              </Section>
            </>
          )}

          {boot && step === 3 && (
            <>
              <Section title="Interior">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.interiorTiers.map(o => <OptionCard key={o.id} opt={o} selected={design.interiorTier === o.id} onSelect={() => set({ interiorTier: o.id })} extra={o.baseCost ? `+${money(o.baseCost)} per car` : 'No extra cost'} />)}
                </div>
              </Section>
              <Section title="Safety">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.safetyTiers.map(o => <OptionCard key={o.id} opt={o} selected={design.safetyTier === o.id} onSelect={() => set({ safetyTier: o.id })} extra={o.baseCost ? `+${money(o.baseCost)} per car` : 'No extra cost'} />)}
                </div>
              </Section>
              <Section title="Build quality" hint="Multiplies the cost of every part — and the trust buyers place in your brand.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {boot.qualityTargets.map(o => <OptionCard key={o.id} opt={o} selected={design.qualityTarget === o.id} onSelect={() => set({ qualityTarget: o.id })} extra={o.costMultiplier ? `×${o.costMultiplier} part cost` : undefined} />)}
                </div>
              </Section>
            </>
          )}

          {boot && step === 4 && (
            <>
              <Section title="Engineering focus" hint="Where your engineers spend their effort. Pick a focus, then fine-tune if you like.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FOCUS_PRESETS.map(p => (
                    <button key={p.id} onClick={() => set({ priorities: { ...p.p } })} className="text-left rounded-md border p-3"
                      style={{ borderColor: activePreset === p.id ? C.gold : C.border, background: activePreset === p.id ? 'rgba(201,162,74,0.08)' : C.panel2 }}>
                      <div className="text-[13px] font-semibold" style={{ color: activePreset === p.id ? C.gold : C.ivory }}>{p.label}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>{p.hint}</div>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Fine-tune" hint="Always adds up to 100. Raising one lowers the others.">
                <div className="space-y-3">
                  {(boot.engineeringPriorities ?? []).map(p => (
                    <label key={p.id} className="block">
                      <div className="flex justify-between text-[12px]"><span style={{ color: C.ivory }}>{p.label}</span><span className="font-mono" style={{ color: C.gold }}>{design.priorities[p.id] ?? 0}</span></div>
                      <input type="range" min={0} max={60} value={design.priorities[p.id] ?? 0} onChange={e => setPriority(p.id, Number(e.target.value))}
                        className="w-full accent-[#C9A24A]" aria-label={p.label} />
                    </label>
                  ))}
                </div>
              </Section>
            </>
          )}

          {boot && step === 5 && (
            <>
              <Section title="Name your car">
                <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="e.g. Drennport Falcon"
                  className="w-full px-3 py-2.5 rounded-md border text-[14px] outline-none focus:border-[#C9A24A]"
                  style={{ background: C.panel2, borderColor: C.border, color: C.ivory }} />
                <input value={style.tagline} onChange={e => setStyle(s => ({ ...s, tagline: e.target.value }))} maxLength={boot.carStyle?.taglineMaxLength ?? 60}
                  placeholder="Tagline (optional) — e.g. Built for the long road"
                  className="w-full mt-2 px-3 py-2 rounded-md border text-[13px] outline-none focus:border-[#C9A24A]"
                  style={{ background: C.panel2, borderColor: C.border, color: C.ivory }} />
              </Section>
              <Section title="Paint">
                <div className="flex flex-wrap gap-2">
                  {paints.map(p => (
                    <button key={p.id} title={`${p.label}${p.finish !== 'solid' ? ` (${p.finish})` : ''}`} aria-label={p.label}
                      onClick={() => setStyle(s => ({ ...s, paint: p.id }))}
                      className="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: p.hex, borderColor: style.paint === p.id ? C.gold : 'rgba(255,255,255,0.15)', boxShadow: style.paint === p.id ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.gold}` : 'none' }} />
                  ))}
                </div>
                <div className="text-[11px] mt-2" style={{ color: C.muted }}>{paints.find(p => p.id === style.paint)?.label}</div>
              </Section>
              <Section title="Accent stripe & trim">
                <div className="flex flex-wrap gap-2">
                  {paints.map(p => (
                    <button key={p.id} aria-label={`Accent ${p.label}`} onClick={() => setStyle(s => ({ ...s, accent: p.id }))}
                      className="w-7 h-7 rounded-md border-2" style={{ background: p.hex, borderColor: style.accent === p.id ? C.gold : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </Section>
              <Section title="Wheels">
                <div className="flex flex-wrap gap-2">
                  {(boot.carStyle?.wheels ?? []).map(w => (
                    <button key={w.id} onClick={() => setStyle(s => ({ ...s, wheels: w.id }))} className="px-3 py-1.5 rounded border text-[12px]"
                      style={{ borderColor: style.wheels === w.id ? C.gold : C.border, color: style.wheels === w.id ? C.gold : C.muted, background: C.panel2 }}>{w.label}</button>
                  ))}
                </div>
              </Section>
              <Section title="Who is it for?" hint="Cars aimed at a buyer group get a strong bonus with them. Each group has a price it's comfortable with.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(boot.buyerSegments ?? []).map(s => (
                    <button key={s.id} onClick={() => set({ targetSegment: s.id })} className="text-left rounded-md border p-3"
                      style={{ borderColor: design.targetSegment === s.id ? C.gold : C.border, background: design.targetSegment === s.id ? 'rgba(201,162,74,0.08)' : C.panel2 }}>
                      <div className="flex justify-between"><span className="text-[13px] font-semibold" style={{ color: design.targetSegment === s.id ? C.gold : C.ivory }}>{s.name}</span>
                        <span className="text-[11px] font-mono" style={{ color: C.muted }}>{Math.round(s.populationShare * 100)}% of buyers</span></div>
                      <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>Comfortable up to about {money(s.priceCeiling)}</div>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Price" hint={segment ? `${segment.name} buyers get hesitant above about ${money(segment.priceCeiling)}.` : undefined}>
                {preview ? (
                  <>
                    <input type="range" min={priceMin} max={priceMax} step={100} value={Math.min(Math.max(shownPrice, priceMin), priceMax)}
                      onChange={e => set({ salePrice: Number(e.target.value) })} className="w-full accent-[#C9A24A]" aria-label="Sale price" />
                    <div className="flex justify-between text-[12px] mt-1">
                      <span style={{ color: C.muted }}>Price <b className="font-mono" style={{ color: C.ivory }}>{money(shownPrice)}</b></span>
                      <span style={{ color: C.muted }}>Profit per car <b className="font-mono" style={{ color: preview.marginPerCar > 0 ? C.green : C.red }}>{money(preview.marginPerCar)}</b></span>
                    </div>
                  </>
                ) : <div className="text-[12px]" style={{ color: C.muted }}>Calculating…</div>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: C.muted }}>
                  Forecast with marketing:
                  {['none', 'local', 'regional', 'national'].map(t => (
                    <button key={t} onClick={() => set({ marketingTier: t })} className="px-2 py-1 rounded border capitalize"
                      style={{ borderColor: design.marketingTier === t ? C.gold : C.border, color: design.marketingTier === t ? C.gold : C.muted }}>{t}</button>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-4 pb-10 border-t mt-4" style={{ borderColor: C.border }}>
            <button disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} className="flex items-center gap-1 px-3 py-2 rounded text-[13px] disabled:opacity-30" style={{ color: C.muted }}>
              <ChevronLeft size={16} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="flex items-center gap-1 px-4 py-2 rounded-md text-[13px] font-semibold" style={{ background: C.gold, color: '#111' }}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={submit} disabled={!nameOk || !preview?.canAfford || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold disabled:opacity-40" style={{ background: C.gold, color: '#111' }}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                Start development{preview ? ` · ${money(preview.devCost)}` : ''}
              </button>
            )}
          </div>
          {step === STEPS.length - 1 && (
            <div className="-mt-6 mb-10 text-[12px] space-y-1">
              {!nameOk && <p style={{ color: C.muted }}>Give your car a name to continue.</p>}
              {preview && !preview.canAfford && <p style={{ color: C.red }}>Your company has {money(preview.availableCash)} — development costs {money(preview.devCost)}.</p>}
              {submitError && <p style={{ color: C.red }}>{submitError}</p>}
            </div>
          )}
        </div>

        {/* ── Right: live car + numbers ── */}
        <aside className="order-1 lg:order-2 border-b lg:border-b-0 lg:border-l overflow-y-auto max-h-[46vh] lg:max-h-none" style={{ borderColor: C.border, background: C.panel }}>
          <div className="p-4 sm:p-5">
            <div className="rounded-lg p-3" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1E2230 0%, #0D0F15 75%)' }}>
              <CarPreview vehicleClass={design.vehicleClass} style={style} paints={paints} />
            </div>
            {style.tagline && <p className="text-center text-[12px] italic mt-2" style={{ color: C.muted }}>“{style.tagline}”</p>}

            {previewError && <div className="mt-3 flex items-start gap-2 text-[12px] p-2 rounded" style={{ background: 'rgba(248,113,113,0.08)', color: C.red }}><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />{previewError}</div>}

            {preview && (
              <div className={`transition-opacity ${loadingPreview ? 'opacity-60' : 'opacity-100'}`}>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[['Cost / car', money(preview.unitCost)], ['Dev cost', money(preview.devCost)], ['Ready in', `${preview.devTimeMonths} mo`]].map(([k, v]) => (
                    <div key={k} className="rounded-md p-2 text-center" style={{ background: C.panel2 }}>
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: C.faint }}>{k}</div>
                      <div className="text-[14px] font-mono font-semibold" style={{ color: C.ivory }}>{v}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: C.faint }}>{gameMonthsToRealTime(preview.devTimeMonths)}</p>

                <div className="mt-3 space-y-1.5">
                  {SCORE_LABELS.map(([k, label]) => {
                    const v = Math.round(preview.scores[k] ?? 0);
                    return (
                      <div key={k} className="flex items-center gap-2 text-[11px]">
                        <span className="w-24" style={{ color: C.muted }}>{label}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#22252F' }}>
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${v}%`, background: v >= 70 ? C.green : v >= 45 ? C.gold : C.red }} />
                        </div>
                        <span className="w-7 text-right font-mono" style={{ color: C.ivory }}>{v}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-md p-2.5 text-[11px]" style={{ background: C.panel2, color: C.muted }}>
                  <span className="font-semibold" style={{ color: C.gold }}>Engineering grade {preview.grade}.</span> {preview.assessment}
                  {preview.recommendations?.[0] && <div className="mt-1" style={{ color: C.faint }}>Tip: {preview.recommendations[0]}</div>}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em]" style={{ color: C.gold }}><Users size={12} /> Buyer interest per month</div>
                  <p className="text-[11px] mt-1" style={{ color: C.muted }}>
                    <b style={{ color: C.ivory }}>{preview.forecast.totalInterested.toLocaleString('en-US')}</b> of {preview.forecast.totalMarketBuyers.toLocaleString('en-US')} monthly car buyers would consider it at {money(shownPrice)}.
                    Rivals will take a share of them; a stronger brand and marketing raise this.
                  </p>
                  <div className="mt-2 space-y-1">
                    {preview.forecast.markets.slice(0, 8).map(m => (
                      <div key={m.marketId} className="flex items-center gap-2 text-[10px]">
                        <span className="w-28 truncate" style={{ color: C.muted }} title={m.name}>{m.name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#22252F' }}>
                          <div className="h-full rounded-full" style={{ width: `${(m.interestedBuyers / maxInterest) * 100}%`, background: C.blue }} />
                        </div>
                        <span className="w-10 text-right font-mono" style={{ color: C.ivory }}>{m.interestedBuyers.toLocaleString('en-US')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!preview && !previewError && <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: C.muted }}><Loader2 size={14} className="animate-spin" /> Running the numbers…</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
