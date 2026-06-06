"use client";

import React, { useState } from 'react';
import { manufacturingApi } from '../../../lib/api';

// Theme constants
const T = {
  gold: '#d4af37',
  muted: '#888888',
  faint: '#555555',
  ivory: '#fffff0',
  paper: '#0a0a0a',
  border: '#333333',
  mint: '#36d399',
  red: '#b85555',
};

// Reusable Atoms
function SectionHeader({ children, stamp }: { children: React.ReactNode; stamp?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: T.gold, margin: 0, letterSpacing: '0.05em' }}>{children}</h2>
      {stamp && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '2px' }}>{stamp}</div>}
    </div>
  );
}

function PanelBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: '16px', borderRadius: '2px', ...style }}>
      {children}
    </div>
  );
}

function FieldRow({ label, value, valueColor = T.ivory }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dotted ${T.border}`, fontSize: '12px' }}>
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 500, fontFamily: typeof value === 'number' || String(value).startsWith('₯') ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function GoldButton({ children, onClick, disabled = false, style = {} }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      style={{
        background: disabled ? 'transparent' : 'rgba(212, 175, 55, 0.1)',
        color: disabled ? T.faint : T.gold,
        border: `1px solid ${disabled ? T.border : T.gold}`,
        padding: '8px 16px',
        fontSize: '11px',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color = T.gold, disabled = false, style = {} }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      style={{
        background: 'transparent',
        color: disabled ? T.faint : color,
        border: `1px solid ${disabled ? T.border : color}`,
        padding: '6px 12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      {children}
    </button>
  );
}

const formatMoney = (val: number) => `₯${Math.round(val).toLocaleString()}`;

// ─────────────────────────────────────────────────────────────────────────────

type MfgTab = 'overview' | 'design' | 'production' | 'inventory' | 'staff' | 'finance';

export default function ManufacturingDeskTab({ 
  company, mfgData, playerCash, characterName, onRefresh, isAdmin 
}: any) {
  const [deskTab, setDeskTab] = useState<MfgTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);

  // States for sub-forms
  const [bootstrapData, setBootstrapData] = useState<any>(null);

  // Design form states
  const [modelName, setModelName] = useState('');
  const [dClass, setDClass] = useState('Compact Car');
  const [dPlatform, setDPlatform] = useState('economy');
  const [dEngine, setDEngine] = useState('standard-i4');
  const [dDrivetrain, setDDrivetrain] = useState('fwd');
  const [dInterior, setDInterior] = useState('basic');
  const [dSafety, setDSafety] = useState('standard');
  const [dQuality, setDQuality] = useState('standard');
  
  // Production plan states
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [planModelId, setPlanModelId] = useState<string>('');
  const [planTarget, setPlanTarget] = useState<number>(0);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadBootstrap = async () => {
    if (bootstrapData) return;
    try {
      const res = await manufacturingApi.getBootstrap();
      setBootstrapData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production') {
      loadBootstrap();
    }
  }, [deskTab]);

  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased successfully.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease', false);
    }
  };

  const handleHireFire = async (role: string, action: 'hire'|'fire') => {
    try {
      if (action === 'hire') {
        await manufacturingApi.hireStaff(company.id, role);
      } else {
        await manufacturingApi.fireStaff(company.id, role);
      }
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed', false);
    }
  };

  const handleSaveDesign = async () => {
    try {
      await manufacturingApi.createModel(company.id, {
        name: modelName,
        vehicleClass: dClass,
        platform: dPlatform,
        powerUnit: dEngine,
        drivetrain: dDrivetrain,
        interiorTier: dInterior,
        safetyTier: dSafety,
        qualityTarget: dQuality
      });
      showNotif('Vehicle model designed successfully.', true);
      setModelName('');
      onRefresh();
      setDeskTab('production');
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Design failed', false);
    }
  };

  const handleSaveProductionPlan = async (lineId: string) => {
    try {
      await manufacturingApi.saveProductionPlan(company.id, {
        lineId,
        modelId: planModelId || null,
        qualitySetting: 'Standard',
        targetUnitsPerArc: planTarget
      });
      showNotif('Production plan saved.', true);
      setEditingLineId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to save plan', false);
    }
  };

  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(`Processed Arc: Net ${formatMoney(res.data.netProfit)}`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process', false);
    }
  };

  if (!mfgData) {
    return <div style={{ color: T.muted, fontSize: '12px' }}>Loading manufacturing data...</div>;
  }

  const { factories, productionLines, models, inventory, latestReport, allReports, staff, ledger, finances, homeMarket, staffRoles } = mfgData;

  const TABS: { id: MfgTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'design', label: 'R&D / Design' },
    { id: 'production', label: 'Production' },
    { id: 'inventory', label: 'Inventory & Sales' },
    { id: 'staff', label: 'Staffing' },
    { id: 'finance', label: 'Finance' },
  ];

  return (
    <div style={{ width: '100%', marginTop: '20px' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
          {notification.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const isActive = deskTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{ padding: '8px 14px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {deskTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <SectionHeader stamp="MFG DESK">Manufacturing Overview</SectionHeader>
            <FieldRow label="Active Models" value={models?.length || 0} />
            <FieldRow label="Factories" value={factories?.length || 0} />
            <FieldRow label="Active Production Lines" value={productionLines?.filter((l:any) => l.status === 'active').length || 0} />
            <FieldRow label="Total Staff" value={staff?.reduce((acc:any, s:any) => acc + s.quantity, 0) || 0} />
            <FieldRow label="Available Cash" value={formatMoney(finances?.available_cash || 0)} valueColor={T.mint} />
            <FieldRow label="Last Arc Profit" value={formatMoney(finances?.last_arc_profit || 0)} valueColor={finances?.last_arc_profit < 0 ? T.red : T.mint} />
            
            {isAdmin && (
              <div style={{ marginTop: '20px', padding: '12px', border: `1px dashed ${T.red}`, background: 'rgba(184,85,85,0.05)' }}>
                <div style={{ fontSize: '11px', color: T.red, marginBottom: '8px' }}>ADMIN CONTROLS</div>
                <GoldButton style={{ borderColor: T.red, color: T.red }} onClick={handleProcessAdmin}>Process Arc (Dev)</GoldButton>
              </div>
            )}
          </PanelBox>

          <PanelBox>
            <SectionHeader stamp="LATEST REPORT">Last Arc Results</SectionHeader>
            {latestReport ? (
              <>
                <FieldRow label="Units Produced" value={latestReport.units_produced} />
                <FieldRow label="Units Sold" value={latestReport.units_sold} />
                <FieldRow label="Gross Revenue" value={formatMoney(latestReport.gross_revenue)} valueColor={T.mint} />
                <FieldRow label="Production Cost" value={formatMoney(latestReport.production_costs)} valueColor={T.red} />
                <FieldRow label="Staff & Overheads" value={formatMoney(Number(latestReport.staff_wages) + Number(latestReport.factory_lease_costs) + Number(latestReport.factory_maintenance_costs) + Number(latestReport.inventory_storage_costs))} valueColor={T.red} />
                <FieldRow label="Net Profit" value={formatMoney(latestReport.net_profit)} valueColor={latestReport.net_profit < 0 ? T.red : T.mint} />
                <div style={{ marginTop: '12px', fontSize: '11px', color: T.muted, fontStyle: 'italic' }}>
                  "{latestReport.summary}"
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: T.faint }}>No arc reports available yet.</div>
            )}
          </PanelBox>
        </div>
      )}

      {deskTab === 'design' && (
        <div>
          <SectionHeader stamp="R&D">Design Vehicle Model</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <PanelBox>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Model Name</label>
                <input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Drennia Mk1" style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '14px' }} />
              </div>

              {bootstrapData && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Vehicle Class</label>
                    <select value={dClass} onChange={e => setDClass(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.vehicleClasses.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Platform</label>
                    <select value={dPlatform} onChange={e => setDPlatform(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.platforms.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Power Unit</label>
                    <select value={dEngine} onChange={e => setDEngine(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.powerUnits.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Drivetrain</label>
                    <select value={dDrivetrain} onChange={e => setDDrivetrain(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.drivetrains.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Interior Trim</label>
                    <select value={dInterior} onChange={e => setDInterior(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.interiorTiers.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Safety Standard</label>
                    <select value={dSafety} onChange={e => setDSafety(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.safetyTiers.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: T.muted, marginBottom: '4px' }}>Build Quality Target</label>
                    <select value={dQuality} onChange={e => setDQuality(e.target.value)} style={{ width: '100%', padding: '8px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory }}>
                      {bootstrapData.qualityTargets.map((p: any) => <option key={p.id} value={p.id} disabled={p.locked}>{p.label}</option>)}
                    </select>
                  </div>

                  <GoldButton onClick={handleSaveDesign} disabled={!modelName || modelName.length < 2}>Finalize Design</GoldButton>
                </>
              )}
            </PanelBox>

            <div>
              <SectionHeader stamp="PORTFOLIO">My Vehicle Models</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {models?.length === 0 && <div style={{ fontSize: '12px', color: T.faint }}>No models designed yet.</div>}
                {models?.map((m: any) => (
                  <PanelBox key={m.id}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold, marginBottom: '4px' }}>{m.name} <span style={{ fontSize: '11px', color: T.muted, fontWeight: 400 }}>({m.vehicle_class})</span></div>
                    <div style={{ fontSize: '11px', color: T.ivory, marginBottom: '8px' }}>Target Segment: {m.target_segment}</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x' }}>
                      <div>
                        <FieldRow label="Cost per Unit" value={formatMoney(m.manufacturing_cost_per_unit)} valueColor={T.mint} />
                        <FieldRow label="Suggested Price" value={formatMoney(m.sale_price)} valueColor={T.gold} />
                      </div>
                      <div style={{ paddingLeft: '12px', borderLeft: `1px solid ${T.border}` }}>
                        <FieldRow label="Appeal" value={m.appeal_score} />
                        <FieldRow label="Reliability" value={m.reliability_score} />
                        <FieldRow label="Performance" value={m.performance_score} />
                      </div>
                    </div>
                  </PanelBox>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {deskTab === 'production' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionHeader stamp="OPERATIONS">Production Lines</SectionHeader>
          
          {factories?.length === 0 ? (
            <PanelBox style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ color: T.gold, marginBottom: '12px' }}>You do not have any factories.</div>
              {bootstrapData && bootstrapData.factoryTypes.map((ft: any) => (
                <div key={ft.id} style={{ display: 'inline-block', margin: '0 8px' }}>
                  <GoldButton onClick={() => handleLeaseFactory(ft.id)}>
                    Lease {ft.name} ({formatMoney(ft.base_lease_cost_per_arc)}/Arc)
                  </GoldButton>
                </div>
              ))}
            </PanelBox>
          ) : (
            factories?.map((factory: any) => (
              <PanelBox key={factory.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: T.ivory }}>{factory.name}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Condition: {factory.condition}% | Capacity: {factory.capacity_per_arc} units/Arc</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: T.muted }}>
                    Lease: {formatMoney(factory.lease_cost_per_arc)}<br/>
                    Maint: {formatMoney(factory.maintenance_cost_per_arc)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {productionLines?.filter((l:any) => l.factory_id === factory.id).map((line: any) => (
                    <div key={line.id} style={{ border: `1px solid ${T.border}`, padding: '12px', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: T.gold }}>Line {line.line_number}</div>
                        <div style={{ fontSize: '11px', color: line.status === 'active' ? T.mint : T.faint }}>
                          {line.status.toUpperCase()}
                        </div>
                      </div>

                      {editingLineId === line.id ? (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '10px', color: T.muted }}>Assign Model</label>
                            <select value={planModelId} onChange={e => setPlanModelId(e.target.value)} style={{ width: '100%', padding: '6px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}>
                              <option value="">-- Halt Production --</option>
                              {models?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                          <div style={{ width: '100px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: T.muted }}>Target (Units/Arc)</label>
                            <input type="number" min={0} max={factory.capacity_per_arc} value={planTarget} onChange={e => setPlanTarget(Number(e.target.value))} style={{ width: '100%', padding: '6px', background: '#111', border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }} />
                          </div>
                          <div>
                            <GoldButton onClick={() => handleSaveProductionPlan(line.id)}>Save</GoldButton>
                            <GhostButton onClick={() => setEditingLineId(null)} style={{ marginLeft: '8px' }}>Cancel</GhostButton>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', color: T.ivory }}>
                            {line.model_name ? (
                              <>Producing: <strong style={{ color: T.gold }}>{line.model_name}</strong> ({line.target_units_per_arc} units/Arc)</>
                            ) : (
                              <span style={{ color: T.faint }}>No model assigned. Idle.</span>
                            )}
                          </div>
                          <GhostButton onClick={() => {
                            setEditingLineId(line.id);
                            setPlanModelId(line.assigned_vehicle_model_id || '');
                            setPlanTarget(line.target_units_per_arc || 0);
                          }}>Configure Line</GhostButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </PanelBox>
            ))
          )}
        </div>
      )}

      {deskTab === 'inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <SectionHeader stamp="LOGISTICS">Inventory & Sales</SectionHeader>
          
          <PanelBox>
            <div style={{ fontSize: '14px', color: T.gold, marginBottom: '16px' }}>Local Market Demand</div>
            <div style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>
              Your home market is {homeMarket ? <strong style={{ color: T.ivory }}>{homeMarket.name}</strong> : 'loading...'}. 
              Vehicles are automatically sold each Arc to fulfill local demand.
            </div>
            
            <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                  <th style={{ padding: '8px' }}>Model</th>
                  <th style={{ padding: '8px' }}>Class</th>
                  <th style={{ padding: '8px' }}>Sale Price</th>
                  <th style={{ padding: '8px' }}>In Stock</th>
                  <th style={{ padding: '8px' }}>Inventory Value</th>
                  <th style={{ padding: '8px' }}>Storage Cost/Arc</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.length === 0 && <tr><td colSpan={6} style={{ padding: '8px', color: T.faint }}>No inventory.</td></tr>}
                {inventory?.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                    <td style={{ padding: '8px', color: T.ivory }}>{inv.model_name}</td>
                    <td style={{ padding: '8px', color: T.muted }}>{inv.vehicle_class}</td>
                    <td style={{ padding: '8px', color: T.gold }}>{formatMoney(inv.sale_price)}</td>
                    <td style={{ padding: '8px', color: T.mint, fontWeight: inv.units_in_stock > 0 ? 700 : 400 }}>{inv.units_in_stock}</td>
                    <td style={{ padding: '8px', color: T.muted, fontFamily: 'monospace' }}>{formatMoney(inv.inventory_value)}</td>
                    <td style={{ padding: '8px', color: T.red, fontFamily: 'monospace' }}>{formatMoney(inv.storage_cost_per_arc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PanelBox>
        </div>
      )}

      {deskTab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <SectionHeader stamp="HR">Company Staffing</SectionHeader>
          <PanelBox>
            <div style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>
              Hire staff to operate factories and improve quality. Factories require workers to operate efficiently. Engineers improve overall production efficiency.
            </div>

            <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                  <th style={{ padding: '8px' }}>Role</th>
                  <th style={{ padding: '8px' }}>Wage / Arc</th>
                  <th style={{ padding: '8px' }}>Employed</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mfgData.staffRoles.map((roleDef: any) => {
                  const employedCount = staff?.find((s:any) => s.role === roleDef.id)?.quantity || 0;
                  return (
                    <tr key={roleDef.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                      <td style={{ padding: '8px', color: T.ivory }}>{roleDef.label}</td>
                      <td style={{ padding: '8px', color: T.red, fontFamily: 'monospace' }}>{formatMoney(roleDef.wagePerArc)}</td>
                      <td style={{ padding: '8px', color: T.mint, fontWeight: 700 }}>{employedCount}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <GhostButton color={T.red} disabled={employedCount === 0} onClick={() => handleHireFire(roleDef.id, 'fire')} style={{ marginRight: '8px' }}>Fire</GhostButton>
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

      {deskTab === 'finance' && (
        <div>
           <SectionHeader stamp="LEDGER">Financial Records</SectionHeader>
           <PanelBox>
             <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger?.length === 0 && <tr><td colSpan={5} style={{ padding: '8px', color: T.faint }}>No records.</td></tr>}
                  {ledger?.map((entry: any) => (
                    <tr key={entry.id} style={{ borderBottom: `1px solid #1a1a1a` }}>
                      <td style={{ padding: '8px', color: T.muted }}>Orbit {entry.game_orbit}, Arc {entry.game_arc}</td>
                      <td style={{ padding: '8px', color: T.faint }}>{entry.entry_type}</td>
                      <td style={{ padding: '8px', color: T.ivory }}>{entry.description}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: Number(entry.amount) >= 0 ? T.mint : T.red, fontFamily: 'monospace' }}>
                        {Number(entry.amount) > 0 ? '+' : ''}{formatMoney(Number(entry.amount))}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: T.muted, fontFamily: 'monospace' }}>{formatMoney(Number(entry.balance_after))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </PanelBox>
        </div>
      )}
    </div>
  );
}
