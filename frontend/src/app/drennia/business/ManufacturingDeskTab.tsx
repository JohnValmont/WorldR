"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { manufacturingApi } from '../../../lib/api';

// ─── Theme ─────────────────────────────────────────────────────────────────
const T = {
  gold:   '#d4af37',
  muted:  '#888888',
  faint:  '#444444',
  ivory:  '#fffff0',
  paper:  '#0a0a0a',
  border: '#2a2a2a',
  mint:   '#36d399',
  red:    '#b85555',
  blue:   '#6ea8fe',
  bg:     '#090A0F',
};

const stateLookup: Record<string, string> = {
  'drennia-drennport': 'Drennport State',
  'drennia-westport':  'Westport State',
  'drennia-ironvale':  'Ironvale State',
  'drennia-greenmere': 'Greenmere State',
};

const resolveState = (id?: string) => (id && stateLookup[id]) ? stateLookup[id] : (id || 'Unknown State');

// ─── Score calculation (mirrors backend — original formulas) ────────────────
function calcLiveScores(design: {
  vehicleClass: string; platform: string; powerUnit: string;
  drivetrain: string; interiorTier: string; safetyTier: string;
  qualityTarget: string; targetSegment: string; salePrice: number;
}) {
  const { vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget } = design;
  let baseCost = platform === 'economy' ? 8000 : platform === 'standard' ? 12000 : 18000;
  const engineCost = powerUnit === 'small-i4' ? 1500 : powerUnit === 'standard-i4' ? 2500 : 4500;
  const drivetrainCost = drivetrain === 'fwd' ? 0 : drivetrain === 'rwd' ? 500 : 2000;
  const interiorCost = interiorTier === 'basic' ? 0 : interiorTier === 'comfort' ? 1500 : 3500;
  const safetyCost = safetyTier === 'standard' ? 0 : safetyTier === 'enhanced' ? 1000 : 2500;
  const qualityMult = qualityTarget === 'budget' ? 0.85 : qualityTarget === 'standard' ? 1.0 : 1.20;
  const cost = Math.round((baseCost + engineCost + drivetrainCost + interiorCost + safetyCost) * qualityMult);

  let rel = 50; if (safetyTier==='enhanced') rel+=10; if (safetyTier==='advanced') rel+=20;
  if (qualityTarget==='premium') rel+=15; if (qualityTarget==='budget') rel-=10;
  if (platform==='economy') rel-=5; if (platform==='heavy-duty') rel+=10; if (powerUnit==='v6') rel-=5;
  rel = Math.min(100, Math.max(10, rel));

  let perf = 40; if (powerUnit==='standard-i4') perf+=10; if (powerUnit==='v6') perf+=25;
  if (drivetrain==='awd'||drivetrain==='rwd') perf+=5; if (platform==='heavy-duty') perf-=5;
  if (vehicleClass==='Compact Car') perf+=5;
  perf = Math.min(100, Math.max(10, perf));

  let fuel = 60; if (powerUnit==='small-i4') fuel+=15; if (powerUnit==='v6') fuel-=15;
  if (drivetrain==='awd') fuel-=10; if (platform==='heavy-duty') fuel-=15;
  if (vehicleClass==='Compact Car') fuel+=8; if (vehicleClass==='Utility Van') fuel-=10;
  fuel = Math.min(100, Math.max(10, fuel));

  let appeal = 45; if (interiorTier==='comfort') appeal+=15; if (interiorTier==='premium') appeal+=30;
  if (safetyTier==='enhanced') appeal+=5; if (safetyTier==='advanced') appeal+=10;
  if (platform==='standard') appeal+=5; if (platform==='economy') appeal-=10;
  if (qualityTarget==='premium') appeal+=10; if (qualityTarget==='budget') appeal-=8;
  if (vehicleClass==='Sedan') appeal+=8;
  appeal = Math.min(100, Math.max(10, appeal));

  let cargo = 30; if (vehicleClass==='Utility Van') cargo+=35; if (platform==='heavy-duty') cargo+=25;
  if (drivetrain==='awd') cargo+=5; if (vehicleClass==='Compact Car') cargo-=10;
  cargo = Math.min(100, Math.max(5, cargo));

  return { cost, rel, perf, fuel, appeal, cargo };
}

// ─── Reusable Atoms ─────────────────────────────────────────────────────────
const fm = (val: number) => `₯${Math.round(val).toLocaleString()}`;

function SectionHeader({ children, stamp }: { children: React.ReactNode; stamp?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', borderBottom:`1px solid ${T.border}`, paddingBottom:'8px', marginBottom:'16px' }}>
      <h2 style={{ fontSize:'18px', fontWeight:600, color:T.gold, margin:0, letterSpacing:'0.05em' }}>{children}</h2>
      {stamp && <div style={{ fontSize:'10px', fontFamily:'monospace', color:T.muted, textTransform:'uppercase', letterSpacing:'0.1em', paddingBottom:'2px' }}>{stamp}</div>}
    </div>
  );
}

function PanelBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${T.border}`, padding:'16px', borderRadius:'2px', ...style }}>{children}</div>;
}

function FieldRow({ label, value, valueColor = T.ivory }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px dotted ${T.border}`, fontSize:'12px' }}>
      <span style={{ color:T.muted }}>{label}</span>
      <span style={{ color:valueColor, fontWeight:500, fontFamily:(typeof value==='number'||String(value).startsWith('₯'))?'monospace':'inherit' }}>{value}</span>
    </div>
  );
}

function GoldButton({ children, onClick, disabled=false, style={} }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled?'transparent':'rgba(212,175,55,0.12)', color:disabled?T.faint:T.gold,
      border:`1px solid ${disabled?T.border:T.gold}`, padding:'9px 18px', fontSize:'11px',
      fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em',
      cursor:disabled?'not-allowed':'pointer', transition:'all 0.2s', ...style
    }}>{children}</button>
  );
}

function GhostButton({ children, onClick, color=T.gold, disabled=false, style={} }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:'transparent', color:disabled?T.faint:color, border:`1px solid ${disabled?T.border:color}`,
      padding:'6px 14px', fontSize:'11px', fontFamily:'monospace', textTransform:'uppercase',
      letterSpacing:'0.1em', cursor:disabled?'not-allowed':'pointer', ...style
    }}>{children}</button>
  );
}

function ScoreBadge({ label, value, color = T.ivory }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'4px 0' }}>
      <span style={{ color:T.muted }}>{label}</span>
      <span style={{ color, fontFamily:'monospace', fontWeight:600 }}>{value}/100</span>
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: {id:string; label:string; locked?:boolean}[] }) {
  return (
    <div style={{ marginBottom:'12px' }}>
      <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%', padding:'8px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.ivory, fontSize:'12px' }}>
        {options.map(o => <option key={o.id} value={o.id} disabled={o.locked}>{o.label}{o.locked ? ' — Coming Soon' : ''}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ icon='⚙', title, subtitle, action }: { icon?:string; title:string; subtitle?:string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px', border:`1px dashed ${T.border}`, borderRadius:'2px' }}>
      <div style={{ fontSize:'32px', marginBottom:'12px' }}>{icon}</div>
      <div style={{ fontSize:'14px', fontWeight:600, color:T.ivory, marginBottom:'8px' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'12px', color:T.muted, marginBottom:'20px', maxWidth:'380px', margin:'0 auto 20px', lineHeight:1.6 }}>{subtitle}</div>}
      {action && <div style={{ marginTop:'16px' }}>{action}</div>}
    </div>
  );
}

// ─── Tab type ───────────────────────────────────────────────────────────────
type MfgTab = 'overview' | 'factory' | 'design' | 'production' | 'inventory' | 'staff' | 'finance' | 'records' | 'equity';

const MFG_TABS: { id: MfgTab; label: string }[] = [
  { id:'overview',   label:'Overview' },
  { id:'factory',    label:'Factory' },
  { id:'design',     label:'R&D / Design' },
  { id:'production', label:'Production' },
  { id:'inventory',  label:'Inventory & Sales' },
  { id:'staff',      label:'Staffing' },
  { id:'finance',    label:'Finance' },
  { id:'records',    label:'Records' },
  { id:'equity',     label:'Equity' },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ManufacturingDeskTab({ company, mfgData, playerCash, characterName, onRefresh, isAdmin }: any) {
  const [deskTab, setDeskTab] = useState<MfgTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [bootstrapData, setBootstrapData] = useState<any>(null);

  // Design form state
  const [modelName,     setModelName]     = useState('');
  const [dClass,        setDClass]        = useState('Compact Car');
  const [dPlatform,     setDPlatform]     = useState('economy');
  const [dEngine,       setDEngine]       = useState('small-i4');
  const [dDrivetrain,   setDDrivetrain]   = useState('fwd');
  const [dInterior,     setDInterior]     = useState('basic');
  const [dSafety,       setDSafety]       = useState('standard');
  const [dQuality,      setDQuality]      = useState('standard');
  const [dSegment,      setDSegment]      = useState('budget');
  const [dSalePrice,    setDSalePrice]    = useState(0);
  const [designSaving,  setDesignSaving]  = useState(false);

  // R&D portfolio state
  const [showDesignModal,  setShowDesignModal]  = useState(false);
  const [selectedModelId,  setSelectedModelId]  = useState<string|null>(null);
  const [launchingModelId, setLaunchingModelId] = useState<string|null>(null);

  // Production line state
  const [editingLineId, setEditingLineId] = useState<string|null>(null);
  const [planModelId,   setPlanModelId]   = useState('');
  const [planTarget,    setPlanTarget]    = useState(0);
  const [planQuality,   setPlanQuality]   = useState('Standard');

  // Inventory price editing
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<string|null>(null);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 6000);
  };

  const loadBootstrap = useCallback(async () => {
    if (bootstrapData) return;
    try {
      const res = await manufacturingApi.getBootstrap();
      setBootstrapData(res.data);
    } catch {}
  }, [bootstrapData]);

  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
  }, [deskTab, loadBootstrap]);

  // Auto-set suggested price from live score
  const liveScore = calcLiveScores({ vehicleClass:dClass, platform:dPlatform, powerUnit:dEngine, drivetrain:dDrivetrain, interiorTier:dInterior, safetyTier:dSafety, qualityTarget:dQuality, targetSegment:dSegment, salePrice:dSalePrice });
  useEffect(() => { setDSalePrice(Math.round(liveScore.cost * 1.5)); }, [dClass, dPlatform, dEngine, dDrivetrain, dInterior, dSafety, dQuality]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased. Production lines created.', true);
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease factory.', false);
    }
  };

  const handleSaveDesign = async () => {
    setDesignSaving(true);
    try {
      await manufacturingApi.createModel(company.id, {
        name: modelName.trim(), vehicleClass: dClass, platform: dPlatform,
        powerUnit: dEngine, drivetrain: dDrivetrain, interiorTier: dInterior,
        safetyTier: dSafety, qualityTarget: dQuality,
        salePrice: dSalePrice, targetSegment: dSegment,
      });
      showNotif(`Development started for "${modelName}". Launch it when ready.`, true);
      setModelName(''); setDClass('Compact Car'); setDPlatform('economy'); setDEngine('small-i4');
      setDDrivetrain('fwd'); setDInterior('basic'); setDSafety('standard'); setDQuality('standard');
      setDSegment('budget');
      setShowDesignModal(false);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Design failed.', false);
    } finally { setDesignSaving(false); }
  };

  const handleLaunchModel = async (modelId: string) => {
    setLaunchingModelId(modelId);
    try {
      await manufacturingApi.launchModel(company.id, modelId);
      showNotif('Vehicle model launched. It is now available for production.', true);
      setSelectedModelId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Launch failed.', false);
    } finally { setLaunchingModelId(null); }
  };

  const handleSaveProductionPlan = async (lineId: string) => {
    try {
      await manufacturingApi.saveProductionPlan(company.id, {
        lineId, modelId: planModelId || null, qualitySetting: planQuality, targetUnitsPerArc: planTarget,
      });
      showNotif('Production plan saved.', true);
      setEditingLineId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to save plan.', false);
    }
  };

  const handleHireFire = async (role: string, action: 'hire'|'fire') => {
    try {
      if (action === 'hire') await manufacturingApi.hireStaff(company.id, role);
      else await manufacturingApi.fireStaff(company.id, role);
      showNotif(action === 'hire' ? 'Staff hired.' : 'Staff removed.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Action failed.', false);
    }
  };

  const handleSavePrice = async (modelId: string) => {
    const newPrice = priceEdits[modelId];
    if (!newPrice || newPrice <= 0) { showNotif('Enter a valid price.', false); return; }
    setSavingPrice(modelId);
    try {
      await manufacturingApi.updateModelPrice(company.id, modelId, newPrice);
      showNotif('Sale price updated.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to save price.', false);
    } finally { setSavingPrice(null); }
  };

  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(`Arc processed: Net ${fm(res.data.netProfit)}`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process arc.', false);
    }
  };

  if (!mfgData) {
    return <div style={{ color:T.muted, fontSize:'12px', padding:'24px' }}>Loading manufacturing data...</div>;
  }

  const { factories=[], productionLines=[], models=[], inventory=[], latestReport, allReports=[], staff=[], ledger=[], finances, homeMarket, staffRoles=[] } = mfgData;

  const totalStaff      = staff.reduce((acc: number, s: any) => acc + s.quantity, 0);
  const totalWagesPerArc = staffRoles.reduce((acc: number, r: any) => {
    const employed = staff.find((s: any) => s.role === r.id)?.quantity || 0;
    return acc + employed * r.wagePerArc;
  }, 0);
  const totalWorkers    = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
  const recWorkers      = factories.reduce((acc: number, f: any) => acc + (f.worker_requirement || 30), 0);
  const activeLines     = productionLines.filter((l: any) => l.status === 'active');
  const hasFactory      = factories.length > 0;
  const hasModel        = models.length > 0;
  const hasActivePlan   = activeLines.length > 0;
  const inventoryValue  = inventory.reduce((acc: number, inv: any) => acc + Number(inv.inventory_value || 0), 0);
  const leaseCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.lease_cost_per_arc || 0), 0);
  const maintCostPerArc = factories.reduce((acc: number, f: any) => acc + Number(f.maintenance_cost_per_arc || 0), 0);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width:'100%' }}>

      {/* Notification */}
      {notification && (
        <div style={{ marginBottom:'16px', padding:'12px 16px', background:notification.success?'rgba(54,211,153,0.08)':'rgba(184,85,85,0.08)', border:`1px solid ${notification.success?T.mint:T.red}`, color:notification.success?T.mint:T.red, fontSize:'12px', lineHeight:1.6 }}>
          {notification.msg}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display:'flex', gap:'0', borderBottom:`1px solid ${T.border}`, overflowX:'auto', marginBottom:'24px' }}>
        {MFG_TABS.map(tab => {
          const isActive = deskTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{
              padding:'9px 14px', fontSize:'10px', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em',
              fontWeight:isActive?700:500, color:isActive?T.gold:T.muted, background:'transparent', border:'none',
              borderBottom:isActive?`2px solid ${T.gold}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap',
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
          {/* Stats */}
          <PanelBox>
            <SectionHeader stamp="MFG DESK">Manufacturing Overview</SectionHeader>
            <FieldRow label="Active Models"          value={models.length} />
            <FieldRow label="Factories"              value={factories.length} />
            <FieldRow label="Active Production Lines" value={activeLines.length} />
            <FieldRow label="Total Staff"            value={totalStaff} />
            <FieldRow label="Available Cash"         value={fm(finances?.available_cash || 0)} valueColor={T.mint} />
            <FieldRow label="Last Arc Profit"        value={fm(finances?.last_arc_profit || 0)} valueColor={(finances?.last_arc_profit||0) < 0 ? T.red : T.mint} />
          </PanelBox>

          {/* Latest Arc Report */}
          <PanelBox>
            <SectionHeader stamp="LATEST REPORT">Last Arc Results</SectionHeader>
            {latestReport ? (
              <>
                <FieldRow label="Units Produced"    value={latestReport.units_produced} />
                <FieldRow label="Units Sold"        value={latestReport.units_sold} />
                <FieldRow label="Unsold Inventory"  value={latestReport.units_unsold || 0} />
                <FieldRow label="Gross Revenue"     value={fm(latestReport.gross_revenue)} valueColor={T.mint} />
                <FieldRow label="Total Costs"       value={fm((Number(latestReport.production_costs||0)) + (Number(latestReport.staff_wages||0)) + (Number(latestReport.factory_lease_costs||0)) + (Number(latestReport.factory_maintenance_costs||0)) + (Number(latestReport.inventory_storage_costs||0)))} valueColor={T.red} />
                <FieldRow label="Net Profit"        value={fm(latestReport.net_profit)} valueColor={Number(latestReport.net_profit)<0?T.red:T.mint} />
                <FieldRow label="Ending Cash"       value={fm(latestReport.ending_cash)} valueColor={T.gold} />
              </>
            ) : (
              <div style={{ fontSize:'12px', color:T.faint, padding:'8px 0' }}>No Arc reports available yet. Close an Arc to generate your first report.</div>
            )}
          </PanelBox>

          {/* Next Steps */}
          <PanelBox style={{ gridColumn:'1 / -1' }}>
            <SectionHeader stamp="GUIDE">Next Steps</SectionHeader>
            {!hasFactory && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
                <span style={{ fontSize:'12px', color:T.ivory }}>① Lease your first factory to begin production.</span>
                <GhostButton onClick={() => setDeskTab('factory')}>Go to Factory →</GhostButton>
              </div>
            )}
            {hasFactory && !hasModel && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
                <span style={{ fontSize:'12px', color:T.ivory }}>② Design your first vehicle model in R&D.</span>
                <GhostButton onClick={() => setDeskTab('design')}>Go to R&D / Design →</GhostButton>
              </div>
            )}
            {hasFactory && hasModel && !hasActivePlan && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
                <span style={{ fontSize:'12px', color:T.ivory }}>③ Assign a model to your production line.</span>
                <GhostButton onClick={() => setDeskTab('production')}>Go to Production →</GhostButton>
              </div>
            )}
            {hasFactory && hasModel && hasActivePlan && (
              <div style={{ padding:'8px 0', fontSize:'12px', color:T.mint }}>
                ✓ Production is configured and ready. Your vehicles will be produced and sold at Arc Close.
              </div>
            )}
          </PanelBox>

          {/* Admin Controls */}
          {isAdmin && (
            <PanelBox style={{ gridColumn:'1 / -1', border:`1px dashed ${T.red}`, background:'rgba(184,85,85,0.04)' }}>
              <div style={{ fontSize:'10px', fontFamily:'monospace', color:T.red, marginBottom:'8px', letterSpacing:'0.1em' }}>DEV ADMIN — RESTRICTED</div>
              <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                <GoldButton style={{ borderColor:T.red, color:T.red }} onClick={handleProcessAdmin}>Process Manufacturing Arc (Dev)</GoldButton>
                <span style={{ fontSize:'11px', color:T.faint }}>Simulates Arc Close for this company only.</span>
              </div>
            </PanelBox>
          )}
          {!isAdmin && (
            <PanelBox style={{ gridColumn:'1 / -1', background:'transparent', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'12px', color:T.faint }}>Manufacturing is processed automatically at Arc Close. No manual action required.</div>
            </PanelBox>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FACTORY TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'factory' && (
        <div>
          <SectionHeader stamp="FACILITIES">Factory</SectionHeader>

          {factories.length === 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
              <EmptyState
                icon="🏭"
                title="No factories yet"
                subtitle="Lease a Small Workshop to begin automobile manufacturing. The lease cost is deducted immediately from company cash."
                action={<GoldButton onClick={() => handleLeaseFactory('small-workshop')}>Lease Small Workshop</GoldButton>}
              />
              {/* Factory info card */}
              <PanelBox>
                <div style={{ fontSize:'13px', fontWeight:700, color:T.gold, marginBottom:'12px' }}>Small Workshop</div>
                <div style={{ fontSize:'11px', color:T.muted, marginBottom:'16px', lineHeight:1.6 }}>Entry-level automobile assembly facility. Suitable for compact cars, sedans and utility vans.</div>
                <FieldRow label="Capacity"                value="100 units / Arc" />
                <FieldRow label="Production Lines"        value="1" />
                <FieldRow label="Lease Cost"              value="₯25,000 / Arc" valueColor={T.red} />
                <FieldRow label="Maintenance"             value="₯8,000 / Arc" valueColor={T.red} />
                <FieldRow label="Recommended Workers"     value="30" />
                <FieldRow label="Status"                  value="Available" valueColor={T.mint} />
                <div style={{ marginTop:'16px' }}>
                  <GoldButton onClick={() => handleLeaseFactory('small-workshop')} disabled={Number(finances?.available_cash||0) < 25000}>
                    Lease Small Workshop
                  </GoldButton>
                  {Number(finances?.available_cash||0) < 25000 && (
                    <div style={{ fontSize:'11px', color:T.red, marginTop:'6px' }}>Insufficient cash. Need ₯25,000.</div>
                  )}
                </div>
              </PanelBox>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {factories.map((factory: any) => (
                <PanelBox key={factory.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                    <div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:T.ivory, marginBottom:'4px' }}>{factory.name}</div>
                      <div style={{ fontSize:'11px', color:T.muted }}>
                        Type: <span style={{ color:T.gold }}>{factory.type_name || 'Small Workshop'}</span>
                        {' · '}Location: <span style={{ color:T.ivory }}>{resolveState(factory.state_id)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'11px', color:factory.status==='active'?T.mint:T.red, fontFamily:'monospace', textTransform:'uppercase' }}>
                      ● {factory.status}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                    <FieldRow label="Capacity / Arc"        value={`${factory.capacity_per_arc} units`} />
                    <FieldRow label="Lease Cost / Arc"      value={fm(factory.lease_cost_per_arc)} valueColor={T.red} />
                    <FieldRow label="Production Lines"      value={factory.max_production_lines || 1} />
                    <FieldRow label="Maintenance / Arc"     value={fm(factory.maintenance_cost_per_arc)} valueColor={T.red} />
                    <FieldRow label="Machine Level"         value={factory.machine_level} valueColor={T.gold} />
                    <FieldRow label="Condition"             value={`${factory.condition}%`} valueColor={Number(factory.condition) < 60 ? T.red : T.mint} />
                  </div>

                  <div style={{ marginTop:'16px' }}>
                    <GhostButton onClick={() => setDeskTab('production')}>Open Production →</GhostButton>
                  </div>
                </PanelBox>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          R&D / DESIGN TAB — PORTFOLIO PAGE
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'design' && (() => {
        const selectedModel = selectedModelId ? models.find((m: any) => m.id === selectedModelId) : null;

        // Status badge helper
        const devBadge = (status: string) => {
          const cfg: Record<string, { label: string; color: string; bg: string }> = {
            in_development: { label: 'Development In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            ready_to_launch: { label: 'Ready to Launch',        color: '#6ea8fe', bg: 'rgba(110,168,254,0.08)' },
            launched:        { label: 'Launched',               color: T.mint,   bg: 'rgba(54,211,153,0.08)' },
            cancelled:       { label: 'Cancelled',              color: T.red,    bg: 'rgba(184,85,85,0.08)' },
          };
          const c = cfg[status] || cfg['in_development'];
          return (
            <span style={{ fontSize:'10px', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.08em',
              color: c.color, background: c.bg, border:`1px solid ${c.color}40`, padding:'2px 8px', borderRadius:'2px' }}>
              {c.label}
            </span>
          );
        };

        // Detail scores (recompute from stored values)
        const detailScores = selectedModel ? calcLiveScores({
          vehicleClass: selectedModel.vehicle_class,
          platform: selectedModel.platform_type,
          powerUnit: selectedModel.power_unit_type,
          drivetrain: selectedModel.drivetrain_type,
          interiorTier: selectedModel.interior_tier,
          safetyTier: selectedModel.safety_tier,
          qualityTarget: selectedModel.production_quality,
          targetSegment: selectedModel.target_segment,
          salePrice: selectedModel.sale_price,
        }) : null;

        return (
          <div>
            {/* ── VEHICLE DETAIL PANEL ── */}
            {selectedModel && (
              <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }}
                onClick={() => setSelectedModelId(null)}>
                <div style={{ width:'520px', height:'100vh', overflowY:'auto', background:'#0d0d0d', border:`1px solid ${T.border}`, borderRight:'none', padding:'32px 28px' }}
                  onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
                    <div>
                      <div style={{ fontSize:'20px', fontWeight:700, color:T.gold, marginBottom:'6px' }}>{selectedModel.name}</div>
                      <div style={{ fontSize:'12px', color:T.muted }}>{selectedModel.vehicle_class} · {selectedModel.target_segment}</div>
                    </div>
                    <button onClick={() => setSelectedModelId(null)} style={{ background:'none', border:'none', color:T.muted, fontSize:'20px', cursor:'pointer', padding:'0 0 0 12px', lineHeight:1 }}>✕</button>
                  </div>

                  {/* Status */}
                  <div style={{ marginBottom:'20px' }}>
                    {devBadge(selectedModel.development_status || 'launched')}
                  </div>

                  {/* Development status info box */}
                  {selectedModel.development_status === 'in_development' && (
                    <div style={{ background:'rgba(245,158,11,0.06)', border:`1px solid rgba(245,158,11,0.25)`, padding:'14px', marginBottom:'20px', borderRadius:'2px' }}>
                      <div style={{ fontSize:'11px', color:'#f59e0b', fontFamily:'monospace', textTransform:'uppercase', marginBottom:'6px' }}>Development In Progress</div>
                      <div style={{ fontSize:'12px', color:T.muted, lineHeight:1.7 }}>
                        Vehicle development is underway. It will be ready after Arc {selectedModel.development_completes_at_orbit || 1}.{selectedModel.development_completes_at_arc || 1} Close.
                      </div>
                    </div>
                  )}

                  {selectedModel.development_status === 'ready_to_launch' && (
                    <div style={{ background:'rgba(110,168,254,0.06)', border:`1px solid rgba(110,168,254,0.25)`, padding:'14px', marginBottom:'20px', borderRadius:'2px' }}>
                      <div style={{ fontSize:'11px', color:T.blue, fontFamily:'monospace', textTransform:'uppercase', marginBottom:'6px' }}>Ready to Launch</div>
                      <div style={{ fontSize:'12px', color:T.muted, lineHeight:1.7 }}>
                        Development is complete. Review the final specifications, then click <strong style={{ color:T.ivory }}>Launch Model</strong> to make it available for production assignment.
                      </div>
                      <div style={{ marginTop:'14px' }}>
                        <GoldButton
                          onClick={() => handleLaunchModel(selectedModel.id)}
                          disabled={launchingModelId === selectedModel.id}
                        >
                          {launchingModelId === selectedModel.id ? 'Launching...' : 'Launch Model'}
                        </GoldButton>
                      </div>
                    </div>
                  )}

                  {selectedModel.development_status === 'launched' && (
                    <div style={{ background:'rgba(54,211,153,0.06)', border:`1px solid rgba(54,211,153,0.2)`, padding:'10px 14px', marginBottom:'20px', borderRadius:'2px', fontSize:'12px', color:T.mint }}>
                      ✓ Launched — available for production assignment.
                    </div>
                  )}

                  {/* Design Specs */}
                  <div style={{ marginBottom:'20px' }}>
                    <div style={{ fontSize:'11px', color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>Design Specifications</div>
                    <PanelBox>
                      <FieldRow label="Vehicle Class"      value={selectedModel.vehicle_class} />
                      <FieldRow label="Platform"           value={selectedModel.platform_type} />
                      <FieldRow label="Power Unit"         value={selectedModel.power_unit_type} />
                      <FieldRow label="Drivetrain"         value={selectedModel.drivetrain_type} />
                      <FieldRow label="Interior"           value={selectedModel.interior_tier} />
                      <FieldRow label="Safety Standard"    value={selectedModel.safety_tier} />
                      <FieldRow label="Production Quality" value={selectedModel.production_quality} />
                      <FieldRow label="Target Segment"     value={selectedModel.target_segment} />
                    </PanelBox>
                  </div>

                  {/* Financial */}
                  <div style={{ marginBottom:'20px' }}>
                    <div style={{ fontSize:'11px', color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>Financial</div>
                    <PanelBox>
                      <FieldRow label="Mfg Cost / Unit"        value={fm(selectedModel.manufacturing_cost_per_unit)} valueColor={T.red} />
                      <FieldRow label="Sale Price"              value={fm(selectedModel.sale_price)} valueColor={T.gold} />
                      <FieldRow label="Est. Margin / Unit"      value={fm(Number(selectedModel.sale_price) - Number(selectedModel.manufacturing_cost_per_unit))} valueColor={Number(selectedModel.sale_price) > Number(selectedModel.manufacturing_cost_per_unit) ? T.mint : T.red} />
                      <FieldRow label="Dev. Started (Arc)"      value={`Orbit ${selectedModel.created_at_world_orbit} / Arc ${selectedModel.created_at_world_arc}`} />
                    </PanelBox>
                  </div>

                  {/* Performance Scores */}
                  <div style={{ marginBottom:'20px' }}>
                    <div style={{ fontSize:'11px', color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>Performance Scores</div>
                    <PanelBox style={{ border:`1px solid ${T.gold}33` }}>
                      <ScoreBadge label="Reliability Score"     value={selectedModel.reliability_score}     color={selectedModel.reliability_score > 70 ? T.mint : selectedModel.reliability_score > 50 ? T.gold : T.red} />
                      <ScoreBadge label="Performance Score"     value={selectedModel.performance_score}     color={selectedModel.performance_score > 70 ? T.mint : T.gold} />
                      <ScoreBadge label="Fuel Efficiency Score" value={selectedModel.fuel_efficiency_score} color={selectedModel.fuel_efficiency_score > 70 ? T.mint : T.gold} />
                      <ScoreBadge label="Appeal Score"          value={selectedModel.appeal_score}          color={selectedModel.appeal_score > 70 ? T.mint : T.gold} />
                      <ScoreBadge label="Cargo Utility Score"   value={selectedModel.cargo_score}           color={selectedModel.cargo_score > 50 ? T.mint : T.faint} />
                    </PanelBox>
                  </div>

                  {/* Factory Compatibility */}
                  <PanelBox>
                    <div style={{ fontSize:'11px', color:T.muted, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Factory Compatibility</div>
                    <div style={{ fontSize:'12px', color:T.ivory, lineHeight:1.8 }}>
                      Compatible with: <span style={{ color:T.gold }}>Small Workshop</span><br/>
                      {selectedModel.development_status !== 'launched'
                        ? <span style={{ color:'#f59e0b' }}>⚠ Must be launched before assigning to a production line.</span>
                        : <span style={{ color:T.mint }}>✓ Ready for production assignment.</span>
                      }
                    </div>
                  </PanelBox>
                </div>
              </div>
            )}

            {/* ── DESIGN FORM MODAL ── */}
            {showDesignModal && (
              <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(3px)' }}
                onClick={() => setShowDesignModal(false)}>
                <div style={{ width:'900px', maxWidth:'95vw', maxHeight:'92vh', overflowY:'auto', background:'#0d0d0d', border:`1px solid ${T.gold}55`, padding:'32px', position:'relative' }}
                  onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
                    <div>
                      <div style={{ fontSize:'18px', fontWeight:700, color:T.gold, letterSpacing:'0.05em' }}>Design a Vehicle</div>
                      <div style={{ fontSize:'11px', color:T.muted, marginTop:'3px', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.08em' }}>R&D Desk — New Model</div>
                    </div>
                    <button onClick={() => setShowDesignModal(false)} style={{ background:'none', border:'none', color:T.muted, fontSize:'22px', cursor:'pointer', lineHeight:1 }}>✕</button>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'28px' }}>
                    {/* Design Form */}
                    <div>
                      <div style={{ marginBottom:'14px' }}>
                        <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Model Name</label>
                        <input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Drennia Compact Mk1" maxLength={60} style={{ width:'100%', boxSizing:'border-box', padding:'9px 10px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.ivory, fontSize:'13px' }} />
                      </div>
                      <FormSelect label="Vehicle Class"      value={dClass}      onChange={setDClass}      options={[{id:'Compact Car',label:'Compact Car'},{id:'Sedan',label:'Sedan'},{id:'Utility Van',label:'Utility Van'}]} />
                      <FormSelect label="Platform"           value={dPlatform}   onChange={setDPlatform}   options={[{id:'economy',label:'Economy Platform'},{id:'standard',label:'Standard Platform'},{id:'heavy-duty',label:'Heavy-Duty Platform'}]} />
                      <FormSelect label="Power Unit"         value={dEngine}     onChange={setDEngine}     options={[{id:'small-i4',label:'Small Inline-4'},{id:'standard-i4',label:'Standard Inline-4'},{id:'v6',label:'V6 Engine'},{id:'basic-electric',label:'Basic Electric Motor',locked:true}]} />
                      <FormSelect label="Drivetrain"         value={dDrivetrain} onChange={setDDrivetrain} options={[{id:'fwd',label:'Front-Wheel Drive'},{id:'rwd',label:'Rear-Wheel Drive'},{id:'awd',label:'All-Wheel Drive'}]} />
                      <FormSelect label="Interior"           value={dInterior}   onChange={setDInterior}   options={[{id:'basic',label:'Basic'},{id:'comfort',label:'Comfort'},{id:'premium',label:'Premium'}]} />
                      <FormSelect label="Safety Standard"    value={dSafety}     onChange={setDSafety}     options={[{id:'standard',label:'Standard'},{id:'enhanced',label:'Enhanced'},{id:'advanced',label:'Advanced'}]} />
                      <FormSelect label="Production Quality" value={dQuality}    onChange={setDQuality}    options={[{id:'budget',label:'Budget'},{id:'standard',label:'Standard'},{id:'premium',label:'Premium'}]} />
                      <FormSelect label="Target Segment"     value={dSegment}    onChange={setDSegment}    options={[{id:'budget',label:'Budget'},{id:'family',label:'Family'},{id:'commercial',label:'Commercial'},{id:'premium',label:'Premium'}]} />
                      <div style={{ marginBottom:'16px' }}>
                        <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Sale Price (₯)</label>
                        <input type="number" value={dSalePrice} onChange={e => setDSalePrice(Number(e.target.value))} style={{ width:'100%', boxSizing:'border-box', padding:'8px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.gold, fontSize:'13px', fontFamily:'monospace' }} />
                        <div style={{ fontSize:'10px', color:T.faint, marginTop:'3px' }}>Suggested: {fm(Math.round(liveScore.cost * 1.5))}</div>
                      </div>
                    </div>

                    {/* Live Design Preview */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                      <PanelBox style={{ border:`1px solid ${T.gold}33` }}>
                        <SectionHeader stamp="LIVE ESTIMATE">Design Preview</SectionHeader>
                        <FieldRow label="Est. Manufacturing Cost / Unit" value={fm(liveScore.cost)} valueColor={T.red} />
                        <div style={{ marginTop:'10px' }}>
                          <ScoreBadge label="Reliability Score"     value={liveScore.rel}    color={liveScore.rel > 70 ? T.mint : liveScore.rel > 50 ? T.gold : T.red} />
                          <ScoreBadge label="Performance Score"     value={liveScore.perf}   color={liveScore.perf > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Fuel Efficiency Score" value={liveScore.fuel}   color={liveScore.fuel > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Appeal Score"          value={liveScore.appeal} color={liveScore.appeal > 70 ? T.mint : T.gold} />
                          <ScoreBadge label="Cargo Utility Score"   value={liveScore.cargo}  color={liveScore.cargo > 50 ? T.mint : T.faint} />
                        </div>
                        <div style={{ marginTop:'12px', padding:'10px', background:'rgba(212,175,55,0.05)', border:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:'10px', color:T.muted }}>Estimated Margin at Current Price</div>
                          <div style={{ fontSize:'16px', fontWeight:700, color:dSalePrice > liveScore.cost ? T.mint : T.red, fontFamily:'monospace' }}>
                            {fm(dSalePrice - liveScore.cost)} / unit
                          </div>
                        </div>
                      </PanelBox>
                      <div style={{ fontSize:'11px', color:T.faint, lineHeight:1.7, padding:'0 2px' }}>
                        <strong style={{ color:T.muted }}>How development works:</strong><br/>
                        After clicking Start Vehicle Development, the model enters development. Open it from your portfolio and click <em>Launch Model</em> when ready. Only launched models can be assigned to production lines.
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div style={{ marginTop:'28px', paddingTop:'20px', borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:'16px' }}>
                    <GoldButton
                      onClick={handleSaveDesign}
                      disabled={!modelName.trim() || modelName.trim().length < 2 || designSaving}
                      style={{ padding:'11px 28px', fontSize:'12px' }}
                    >
                      {designSaving ? 'Starting Development...' : 'Start Vehicle Development'}
                    </GoldButton>
                    <GhostButton onClick={() => setShowDesignModal(false)}>Cancel</GhostButton>
                  </div>
                </div>
              </div>
            )}

            {/* ── PORTFOLIO PAGE HEADER ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <SectionHeader stamp="R&D DESK">R&D Portfolio</SectionHeader>
              <GoldButton onClick={() => setShowDesignModal(true)} style={{ padding:'9px 20px' }}>+ Design a Vehicle</GoldButton>
            </div>

            {/* ── VEHICLE MODEL CARDS ── */}
            {models.length === 0 ? (
              <EmptyState
                icon="🔬"
                title="No vehicle models yet"
                subtitle="Start your first R&D project. Design a vehicle to begin development, then launch it when it's ready for production."
                action={<GoldButton onClick={() => setShowDesignModal(true)}>Design a Vehicle</GoldButton>}
              />
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'14px' }}>
                {models.map((m: any) => {
                  const devStatus = m.development_status || 'launched';
                  const statusColors: Record<string, string> = {
                    in_development: '#f59e0b', ready_to_launch: T.blue, launched: T.mint, cancelled: T.red,
                  };
                  const statusColor = statusColors[devStatus] || T.mint;
                  return (
                    <div key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      style={{
                        background:'rgba(255,255,255,0.02)', border:`1px solid ${T.border}`,
                        padding:'16px', cursor:'pointer', transition:'border-color 0.15s, background 0.15s',
                        borderRadius:'2px',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.gold + '88'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.border; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:T.gold, lineHeight:1.3 }}>{m.name}</div>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:statusColor, marginTop:'4px', flexShrink:0 }} />
                      </div>
                      <div style={{ fontSize:'11px', color:T.muted, marginBottom:'12px' }}>
                        {m.vehicle_class} · {m.target_segment}
                      </div>
                      <div style={{ fontSize:'10px', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.07em', color:statusColor, marginBottom:'10px' }}>
                        {devStatus === 'in_development' ? 'Development In Progress'
                          : devStatus === 'ready_to_launch' ? 'Ready to Launch'
                          : devStatus === 'launched' ? 'Launched'
                          : 'Cancelled'}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, fontFamily:'monospace' }}>{fm(m.sale_price)}</div>
                        <div style={{ fontSize:'10px', color:T.faint }}>View Details →</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          PRODUCTION TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'production' && (
        <div>
          <SectionHeader stamp="PRODUCTION DESK">Production Lines</SectionHeader>

          {!hasFactory && (
            <EmptyState
              icon="⚙"
              title="No factory yet"
              subtitle="You need a factory before production can begin."
              action={<GoldButton onClick={() => setDeskTab('factory')}>Lease Small Workshop</GoldButton>}
            />
          )}

          {hasFactory && !hasModel && (
            <EmptyState
              icon="📐"
              title="No vehicle model designed"
              subtitle="Design a vehicle model before assigning it to a production line."
              action={<GoldButton onClick={() => setDeskTab('design')}>Go to R&D / Design</GoldButton>}
            />
          )}

          {hasFactory && hasModel && factories.map((factory: any) => {
            const lines = productionLines.filter((l: any) => l.factory_id === factory.id);
            return (
              <PanelBox key={factory.id} style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'14px', fontWeight:700, color:T.ivory, marginBottom:'4px' }}>{factory.name}</div>
                <div style={{ fontSize:'11px', color:T.muted, marginBottom:'16px' }}>
                  Capacity: {factory.capacity_per_arc} units/Arc · Workers Required: {factory.worker_requirement || 30} · Current Workers: {totalWorkers}
                  {totalWorkers < (factory.worker_requirement || 30) && (
                    <span style={{ color:T.red, marginLeft:'8px' }}>⚠ Understaffed — production will be reduced</span>
                  )}
                </div>

                {lines.map((line: any) => {
                  const assignedModel = models.find((m: any) => m.id === line.assigned_vehicle_model_id);
                  const isEditing = editingLineId === line.id;
                  const editModel = models.find((m: any) => m.id === planModelId);
                  const estCost = editModel ? Math.round(editModel.manufacturing_cost_per_unit * planTarget) : 0;
                  const estRev  = editModel ? Math.round(editModel.sale_price * planTarget * 0.8) : 0;
                  const margin  = estRev - estCost;

                  return (
                    <div key={line.id} style={{ border:`1px solid ${T.border}`, padding:'16px', marginBottom:'12px', background:'rgba(0,0,0,0.2)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:T.gold }}>Production Line {line.line_number}</div>
                        <div style={{ fontSize:'10px', color:line.status==='active'?T.mint:T.faint, fontFamily:'monospace', textTransform:'uppercase' }}>● {line.status}</div>
                      </div>

                      {isEditing ? (
                        <div>
                          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                            <div>
                              <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px' }}>Assigned Model</label>
                              <select value={planModelId} onChange={e => { setPlanModelId(e.target.value); }} style={{ width:'100%', padding:'7px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.ivory, fontSize:'12px' }}>
                                <option value="">— Halt Production —</option>
                                {models.filter((m: any) => (m.development_status || 'launched') === 'launched').map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px' }}>Target (Units/Arc)</label>
                              <input type="number" min={0} max={factory.capacity_per_arc} value={planTarget} onChange={e => setPlanTarget(Number(e.target.value))} style={{ width:'100%', boxSizing:'border-box', padding:'7px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.ivory, fontSize:'12px' }} />
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:'10px', color:T.muted, marginBottom:'4px' }}>Quality Setting</label>
                              <select value={planQuality} onChange={e => setPlanQuality(e.target.value)} style={{ width:'100%', padding:'7px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.ivory, fontSize:'12px' }}>
                                <option value="Budget">Budget</option>
                                <option value="Standard">Standard</option>
                                <option value="Premium">Premium</option>
                              </select>
                            </div>
                          </div>

                          {/* Estimates */}
                          {editModel && planTarget > 0 && (
                            <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${T.border}`, padding:'12px', marginBottom:'12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', fontSize:'11px' }}>
                              <div><span style={{ color:T.muted }}>Est. Production Cost</span><br/><strong style={{ color:T.red, fontFamily:'monospace' }}>{fm(estCost)}</strong></div>
                              <div><span style={{ color:T.muted }}>Est. Revenue</span><br/><strong style={{ color:T.mint, fontFamily:'monospace' }}>{fm(estRev)}</strong></div>
                              <div><span style={{ color:T.muted }}>Est. Gross Margin</span><br/><strong style={{ color:margin>0?T.mint:T.red, fontFamily:'monospace' }}>{fm(margin)}</strong></div>
                              <div><span style={{ color:T.muted }}>Max Capacity</span><br/><strong style={{ color:T.ivory }}>{factory.capacity_per_arc} units</strong></div>
                              <div><span style={{ color:T.muted }}>Workers Needed</span><br/><strong style={{ color:T.ivory }}>{factory.worker_requirement || 30}</strong></div>
                              <div><span style={{ color:T.muted }}>Current Workers</span><br/><strong style={{ color:totalWorkers >= (factory.worker_requirement||30)?T.mint:T.red }}>{totalWorkers}</strong></div>
                            </div>
                          )}

                          <div style={{ display:'flex', gap:'10px' }}>
                            <GoldButton onClick={() => handleSaveProductionPlan(line.id)}>Save Production Plan</GoldButton>
                            <GhostButton onClick={() => setEditingLineId(null)}>Cancel</GhostButton>
                          </div>
                          <div style={{ fontSize:'10px', color:T.faint, marginTop:'8px' }}>⚠ Saving a plan does not generate money. Revenues are only earned at Arc Close.</div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:'12px', color:T.ivory }}>
                            {assignedModel ? (
                              <>Producing: <strong style={{ color:T.gold }}>{assignedModel.name}</strong> — {line.target_units_per_arc} units/Arc · {line.quality_setting} quality</>
                            ) : (
                              <span style={{ color:T.faint }}>No model assigned. Line is idle.</span>
                            )}
                          </div>
                          <GhostButton onClick={() => {
                            setEditingLineId(line.id);
                            setPlanModelId(line.assigned_vehicle_model_id || '');
                            setPlanTarget(line.target_units_per_arc || 0);
                            setPlanQuality(line.quality_setting || 'Standard');
                          }}>Configure Line</GhostButton>
                        </div>
                      )}
                    </div>
                  );
                })}
              </PanelBox>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          INVENTORY & SALES TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'inventory' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <SectionHeader stamp="SALES DESK">Inventory &amp; Sales</SectionHeader>

          {/* Home Market */}
          {homeMarket && (
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.gold, marginBottom:'12px' }}>
                Home Market — {homeMarket.name}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 24px' }}>
                <FieldRow label="Population"           value={Number(homeMarket.population).toLocaleString()} />
                <FieldRow label="Compact Preference"   value={`${Math.round(homeMarket.preference_compact * 100)}%`} />
                <FieldRow label="Avg Income"           value={fm(homeMarket.average_income)} />
                <FieldRow label="Sedan Preference"     value={`${Math.round(homeMarket.preference_sedan * 100)}%`} />
                <FieldRow label="Economic Multiplier"  value={homeMarket.economic_multiplier} />
                <FieldRow label="Utility Van Preference" value={`${Math.round(homeMarket.preference_utility_van * 100)}%`} />
              </div>
            </PanelBox>
          )}

          {/* Models with price control */}
          {models.length === 0 && (
            <EmptyState icon="📋" title="No models designed" subtitle="Design a vehicle model first to manage pricing and view inventory." action={<GhostButton onClick={() => setDeskTab('design')}>Go to R&D / Design</GhostButton>} />
          )}

          {models.length > 0 && (
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Vehicle Models &amp; Pricing</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {models.map((m: any) => {
                  const invRow = inventory.find((inv: any) => inv.vehicle_model_id === m.id);
                  return (
                    <div key={m.id} style={{ border:`1px solid ${T.border}`, padding:'14px', background:'rgba(0,0,0,0.2)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                        <div>
                          <span style={{ fontSize:'13px', fontWeight:700, color:T.gold }}>{m.name}</span>
                          <span style={{ fontSize:'11px', color:T.muted, marginLeft:'8px' }}>{m.vehicle_class} · {m.target_segment}</span>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px', marginBottom:'12px' }}>
                        <FieldRow label="Cost / Unit"       value={fm(m.manufacturing_cost_per_unit)} />
                        <FieldRow label="In Stock"          value={invRow?.units_in_stock || 0} valueColor={T.mint} />
                        <FieldRow label="Inventory Value"   value={fm(invRow?.inventory_value || 0)} />
                        <FieldRow label="Storage / Arc"     value={fm(invRow?.storage_cost_per_arc || 0)} valueColor={T.red} />
                      </div>
                      {/* Price editor */}
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ fontSize:'11px', color:T.muted }}>Sale Price:</span>
                        <input
                          type="number"
                          defaultValue={m.sale_price}
                          value={priceEdits[m.id] !== undefined ? priceEdits[m.id] : m.sale_price}
                          onChange={e => setPriceEdits(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ width:'120px', padding:'6px', background:'#0e0e0e', border:`1px solid ${T.border}`, color:T.gold, fontSize:'12px', fontFamily:'monospace' }}
                        />
                        <GhostButton
                          color={T.mint}
                          disabled={savingPrice === m.id}
                          onClick={() => handleSavePrice(m.id)}
                        >
                          {savingPrice === m.id ? 'Saving...' : 'Save Price'}
                        </GhostButton>
                        <span style={{ fontSize:'11px', color:T.faint }}>Cost: {fm(m.manufacturing_cost_per_unit)} · Margin: {fm((priceEdits[m.id]??m.sale_price) - m.manufacturing_cost_per_unit)}/unit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelBox>
          )}

          {/* Inventory table */}
          {inventory.length === 0 ? (
            <div style={{ fontSize:'12px', color:T.faint, padding:'12px 0' }}>
              No inventory yet. Vehicles will appear here after production is processed at Arc Close.
            </div>
          ) : (
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Current Inventory</div>
              <table style={{ width:'100%', fontSize:'12px', textAlign:'left', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}`, color:T.muted }}>
                    <th style={{ padding:'8px' }}>Model</th>
                    <th style={{ padding:'8px' }}>Class</th>
                    <th style={{ padding:'8px' }}>Sale Price</th>
                    <th style={{ padding:'8px' }}>In Stock</th>
                    <th style={{ padding:'8px' }}>Inv Value</th>
                    <th style={{ padding:'8px' }}>Storage/Arc</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom:`1px solid #1a1a1a` }}>
                      <td style={{ padding:'8px', color:T.ivory }}>{inv.model_name}</td>
                      <td style={{ padding:'8px', color:T.muted }}>{inv.vehicle_class}</td>
                      <td style={{ padding:'8px', color:T.gold, fontFamily:'monospace' }}>{fm(inv.sale_price)}</td>
                      <td style={{ padding:'8px', color:T.mint, fontWeight:700 }}>{inv.units_in_stock}</td>
                      <td style={{ padding:'8px', color:T.muted, fontFamily:'monospace' }}>{fm(inv.inventory_value)}</td>
                      <td style={{ padding:'8px', color:T.red, fontFamily:'monospace' }}>{fm(inv.storage_cost_per_arc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelBox>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STAFFING TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'staff' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <SectionHeader stamp="STAFFING DESK">Company Staffing</SectionHeader>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Staffing Summary</div>
              <FieldRow label="Total Staff"                value={totalStaff} />
              <FieldRow label="Total Wages / Arc"          value={fm(totalWagesPerArc)} valueColor={T.red} />
              <FieldRow label="Recommended Factory Workers" value={recWorkers || 0} />
              <FieldRow label="Current Factory Workers"    value={totalWorkers} valueColor={totalWorkers >= recWorkers ? T.mint : T.red} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Production Efficiency</div>
              <div style={{ fontSize:'12px', color:T.ivory, lineHeight:1.7 }}>
                {!hasFactory && <span style={{ color:T.faint }}>No factory yet. Hire staff after leasing a factory.</span>}
                {hasFactory && totalWorkers === 0 && <span style={{ color:T.red }}>⚠ No workers hired. Production cannot run.</span>}
                {hasFactory && totalWorkers > 0 && totalWorkers < recWorkers && <span style={{ color:T.red }}>⚠ Understaffed: production will be reduced proportionally.</span>}
                {hasFactory && totalWorkers >= recWorkers && totalWorkers < recWorkers * 1.5 && <span style={{ color:T.mint }}>✓ Adequately staffed. Production will run at full capacity.</span>}
                {hasFactory && totalWorkers >= recWorkers * 1.5 && <span style={{ color:T.mint }}>✓ Strong workforce. Technical staff may improve quality and reliability over time.</span>}
              </div>
              <div style={{ marginTop:'12px', fontSize:'11px', color:T.faint }}>Wages are deducted at Arc Close. No immediate deduction on hiring.</div>
            </PanelBox>
          </div>

          {/* Staff Table */}
          <PanelBox>
            <table style={{ width:'100%', fontSize:'12px', textAlign:'left', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}`, color:T.muted }}>
                  <th style={{ padding:'10px 8px' }}>Role</th>
                  <th style={{ padding:'10px 8px' }}>Wage / Arc</th>
                  <th style={{ padding:'10px 8px' }}>Employed</th>
                  <th style={{ padding:'10px 8px', textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffRoles.map((roleDef: any) => {
                  const employed = staff.find((s: any) => s.role === roleDef.id)?.quantity || 0;
                  return (
                    <tr key={roleDef.id} style={{ borderBottom:`1px solid #1a1a1a` }}>
                      <td style={{ padding:'10px 8px', color:T.ivory }}>{roleDef.label}</td>
                      <td style={{ padding:'10px 8px', color:T.red, fontFamily:'monospace' }}>{fm(roleDef.wagePerArc)}</td>
                      <td style={{ padding:'10px 8px', color:T.mint, fontWeight:700 }}>{employed}</td>
                      <td style={{ padding:'10px 8px', textAlign:'right' }}>
                        <GhostButton color={T.red} disabled={employed===0} onClick={() => handleHireFire(roleDef.id, 'fire')} style={{ marginRight:'8px' }}>Fire</GhostButton>
                        <GhostButton color={T.mint} onClick={() => handleHireFire(roleDef.id, 'hire')}>Hire</GhostButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PanelBox>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FINANCE TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'finance' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <SectionHeader stamp="FINANCE DESK">Company Financials</SectionHeader>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            {/* Finance Summary */}
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Current Position</div>
              <FieldRow label="Available Cash"             value={fm(finances?.available_cash || 0)} valueColor={T.mint} />
              <FieldRow label="Company Value"              value={fm(finances?.company_value || 0)} />
              <FieldRow label="Inventory Value"            value={fm(inventoryValue)} />
              <FieldRow label="Outstanding Debt"          value={fm(finances?.debt || 0)} valueColor={(finances?.debt||0) > 0 ? T.red : T.faint} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Recurring Costs / Arc</div>
              <FieldRow label="Factory Lease"              value={fm(leaseCostPerArc)} valueColor={T.red} />
              <FieldRow label="Factory Maintenance"        value={fm(maintCostPerArc)} valueColor={T.red} />
              <FieldRow label="Staff Wages"                value={fm(totalWagesPerArc)} valueColor={T.red} />
              <FieldRow label="Total Fixed Costs / Arc"    value={fm(leaseCostPerArc + maintCostPerArc + totalWagesPerArc)} valueColor={T.red} />
            </PanelBox>
          </div>

          {/* Arc Report Summary */}
          <PanelBox>
            <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Last Arc Report</div>
            {latestReport ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 24px' }}>
                <FieldRow label="Last Arc Revenue"       value={fm(latestReport.gross_revenue)} valueColor={T.mint} />
                <FieldRow label="Production Costs"       value={fm(latestReport.production_costs)} valueColor={T.red} />
                <FieldRow label="Staff Wages"            value={fm(latestReport.staff_wages)} valueColor={T.red} />
                <FieldRow label="Factory Costs"          value={fm(Number(latestReport.factory_lease_costs||0) + Number(latestReport.factory_maintenance_costs||0))} valueColor={T.red} />
                <FieldRow label="Storage Costs"          value={fm(latestReport.inventory_storage_costs || 0)} valueColor={T.red} />
                <FieldRow label="Last Arc Net Profit"    value={fm(latestReport.net_profit)} valueColor={Number(latestReport.net_profit)<0?T.red:T.mint} />
              </div>
            ) : (
              <div style={{ fontSize:'12px', color:T.faint }}>No manufacturing Arc report yet. Reports are generated at Arc Close.</div>
            )}
          </PanelBox>

          {/* Ledger */}
          <PanelBox>
            <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Transaction Ledger</div>
            {!ledger || ledger.length === 0 ? (
              <div style={{ fontSize:'12px', color:T.faint }}>No financial records yet.</div>
            ) : (
              <table style={{ width:'100%', fontSize:'11px', textAlign:'left', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}`, color:T.muted }}>
                    <th style={{ padding:'8px' }}>Time</th>
                    <th style={{ padding:'8px' }}>Type</th>
                    <th style={{ padding:'8px' }}>Description</th>
                    <th style={{ padding:'8px', textAlign:'right' }}>Amount</th>
                    <th style={{ padding:'8px', textAlign:'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry: any) => (
                    <tr key={entry.id} style={{ borderBottom:`1px solid #1a1a1a` }}>
                      <td style={{ padding:'8px', color:T.muted, whiteSpace:'nowrap' }}>O{entry.game_orbit} A{entry.game_arc}</td>
                      <td style={{ padding:'8px', color:T.faint, whiteSpace:'nowrap' }}>{entry.entry_type}</td>
                      <td style={{ padding:'8px', color:T.ivory }}>{entry.description}</td>
                      <td style={{ padding:'8px', textAlign:'right', color:Number(entry.amount)>=0?T.mint:T.red, fontFamily:'monospace', whiteSpace:'nowrap' }}>
                        {Number(entry.amount)>0?'+':''}{fm(Number(entry.amount))}
                      </td>
                      <td style={{ padding:'8px', textAlign:'right', color:T.muted, fontFamily:'monospace', whiteSpace:'nowrap' }}>{fm(Number(entry.balance_after))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </PanelBox>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          RECORDS TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'records' && (
        <div>
          <SectionHeader stamp="COMPANY RECORDS">Activity Log</SectionHeader>
          <PanelBox>
            {ledger && ledger.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ fontSize:'12px', color:T.muted, marginBottom:'8px' }}>
                  Showing key events from the company ledger. Full financial detail in the Finance tab.
                </div>
                {ledger.slice(0, 30).map((entry: any) => (
                  <div key={entry.id} style={{ display:'flex', gap:'16px', padding:'8px 0', borderBottom:`1px dotted ${T.border}`, fontSize:'12px' }}>
                    <span style={{ color:T.faint, whiteSpace:'nowrap', fontFamily:'monospace' }}>O{entry.game_orbit}/A{entry.game_arc}</span>
                    <span style={{ color:T.gold, whiteSpace:'nowrap', textTransform:'uppercase', fontSize:'10px', letterSpacing:'0.05em' }}>{entry.entry_type.replace(/_/g,' ')}</span>
                    <span style={{ color:T.ivory, flex:1 }}>{entry.description}</span>
                  </div>
                ))}
                {ledger.length > 30 && <div style={{ fontSize:'11px', color:T.faint, marginTop:'8px' }}>Showing 30 of {ledger.length} records.</div>}
              </div>
            ) : (
              <div style={{ fontSize:'12px', color:T.faint }}>
                Company records will appear here as your manufacturing firm grows. Events such as factory leases, model designs, production plans, and Arc reports are logged automatically.
              </div>
            )}
          </PanelBox>

          {/* Arc reports log */}
          {allReports && allReports.length > 0 && (
            <PanelBox style={{ marginTop:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Arc Reports</div>
              {allReports.slice(0, 10).map((r: any) => (
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px dotted ${T.border}`, fontSize:'12px' }}>
                  <span style={{ color:T.muted, fontFamily:'monospace' }}>O{r.world_orbit} / A{r.world_arc}</span>
                  <span style={{ color:T.ivory }}>Produced: {r.units_produced} · Sold: {r.units_sold}</span>
                  <span style={{ color:Number(r.net_profit)>=0?T.mint:T.red, fontFamily:'monospace' }}>{Number(r.net_profit)>0?'+':''}{fm(Number(r.net_profit))}</span>
                </div>
              ))}
            </PanelBox>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          EQUITY TAB
      ═══════════════════════════════════════════════════════ */}
      {deskTab === 'equity' && (
        <div>
          <SectionHeader stamp="EQUITY DESK">Ownership &amp; Equity</SectionHeader>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Current Ownership</div>
              <FieldRow label="Owner"           value={characterName || 'You'} />
              <FieldRow label="Ownership"       value="100%" valueColor={T.gold} />
              <FieldRow label="Legal Structure" value={company.legalStructure || company.legal_structure_id || 'Sole Trader'} />
              <FieldRow label="Company Value"   value={fm(finances?.company_value || 0)} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize:'13px', fontWeight:700, color:T.ivory, marginBottom:'12px' }}>Share Issuance</div>
              <div style={{ fontSize:'12px', color:T.faint, lineHeight:1.8 }}>
                <div>Share issuance — <span style={{ color:T.red }}>Locked</span></div>
                <div>IPO — <span style={{ color:T.red }}>Locked</span></div>
                <div>Investor system — Coming later</div>
              </div>
              <div style={{ marginTop:'16px', fontSize:'11px', color:T.faint, fontStyle:'italic' }}>
                Equity and investor features will be added in a future phase. For now, this company is fully owned by you.
              </div>
            </PanelBox>
          </div>
        </div>
      )}

    </div>
  );
}
