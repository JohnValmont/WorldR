const fs = require('fs');

const engPrioritiesStr = `const ENG_PRIORITIES = [
  { id: 'reliability',   label: 'Reliability',               icon: '🛡️', desc: 'More testing, lower risk, better reliability score.' },
  { id: 'performance',   label: 'Performance',               icon: '⚡', desc: 'Higher power output, better perf score. Heavier and costlier.' },
  { id: 'fuel_economy',  label: 'Fuel Economy',              icon: '💧', desc: 'Lightweight focus, better fuel efficiency. Reduces weight.' },
  { id: 'comfort',       label: 'Comfort',                   icon: '🛋️', desc: 'Interior refinement, better appeal score.' },
  { id: 'practicality',  label: 'Practicality/Cargo',        icon: '📦', desc: 'Better packaging, higher cargo score.' },
  { id: 'safety',        label: 'Safety Focus',              icon: '🦺', desc: 'Stiffer chassis, better safety score. Slightly heavier.' }
];`;

const budgetBucketsStr = `const BUDGET_BUCKETS_FE = [
  { id: 'powertrain',           label: 'Powertrain R&D',        defaultPct: 0.18 },
  { id: 'body',                 label: 'Body Engineering',       defaultPct: 0.15 },
  { id: 'safety',               label: 'Safety Systems',         defaultPct: 0.12 },
  { id: 'interior',             label: 'Interior & NVH',         defaultPct: 0.10 },
  { id: 'testing',              label: 'Testing Programme',       defaultPct: 0.20 },
  { id: 'production_eng',       label: 'Production Engineering', defaultPct: 0.15 },
  { id: 'prototype_validation', label: 'Prototype Validation',    defaultPct: 0.10 },
];`;

const handleStartResearchStr = `  const handleStartResearch = async (programmeId: string) => {
    try {
      await manufacturingApi.startEngineeringProgramme(company.id, programmeId);
      showNotif('Engineering programme started.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start programme.', false);
    }
  };`;

const procurementStateStr = `  const [procuringComponent, setProcuringComponent] = React.useState<{ id: string, name: string, units: number, cost: number } | null>(null);

  const handleProcureComponent = async (componentId: string, units: number) => {
    try {
      await manufacturingApi.procureComponents(company.id, { component_id: componentId, units });
      showNotif('Components procured.', true);
      setProcuringComponent(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to procure.', false);
    }
  };`;

const factoryHandlersStr = `  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased. Production lines created.', true);
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease factory.', false);
    }
  };

  const handleStartExpansion = async (factoryId: string) => {
    try {
      await manufacturingApi.startFactoryExpansion(company.id, factoryId);
      showNotif(\`Workshop expansion started. \${fm(EXPANSION_COST)} deducted. Construction completes in \${EXPANSION_DURATION} Month\${EXPANSION_DURATION > 1 ? 's' : ''}.\`, true);
      setShowExpandConfirm(false);
      setExpandingFactoryId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start expansion.', false);
      setShowExpandConfirm(false);
    }
  };`;
  
const adminHandlerStr = `  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(\`Month processed: Net \${fm(res.data.netProfit)}\`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process month.', false);
    }
  };`;
  
// Fix DesignStudio.tsx
let ds = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/DesignStudio.tsx', 'utf8');
if (!ds.includes('ENG_PRIORITIES')) {
  ds = ds.replace('export default function DesignStudio', engPrioritiesStr + '\n\n' + budgetBucketsStr + '\n\nexport default function DesignStudio');
  ds = ds.replace('const handleSaveDesign = async', handleStartResearchStr + '\n\n  const handleSaveDesign = async');
  // Also add manufacturingApi import
  ds = "import { manufacturingApi } from '@/lib/api';\n" + ds;
  // Also add FormSelect component import? FormSelect does not exist in standard ui!
  // Wait, FormSelect is not in components/ui. Let's just create a basic select instead of FormSelect!
  ds = ds.replace(/<FormSelect([^>]*)>/g, '<select className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100" $1>');
  ds = ds.replace(/<\/FormSelect>/g, '</select>');
  fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/DesignStudio.tsx', ds);
}

// Fix ProcurementPanel.tsx
let pp = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/ProcurementPanel.tsx', 'utf8');
if (!pp.includes('procuringComponent')) {
  pp = "import { manufacturingApi } from '@/lib/api';\n" + pp;
  pp = pp.replace('return (', procurementStateStr + '\n\n  return (');
  fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/ProcurementPanel.tsx', pp);
}

// Fix FactoryTab.tsx
let ft = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/FactoryTab.tsx', 'utf8');
if (!ft.includes('handleLeaseFactory')) {
  ft = "import { manufacturingApi } from '@/lib/api';\n" + ft;
  ft = ft.replace('return (', factoryHandlersStr + '\n\n  return (');
  fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/FactoryTab.tsx', ft);
}

// Fix ManufacturingOverview.tsx
let mo = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/ManufacturingOverview.tsx', 'utf8');
if (!mo.includes('handleProcessAdmin')) {
  mo = "import { manufacturingApi } from '@/lib/api';\n" + mo;
  mo = mo.replace('return (', adminHandlerStr + '\n\n  return (');
  fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/ManufacturingOverview.tsx', mo);
}

// Fix MarketSalesTab.tsx
let mst = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/MarketSalesTab.tsx', 'utf8');
// For prev implicity any, we can add :any
mst = mst.replace(/\(prev\) =>/g, '(prev: any) =>');
fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/MarketSalesTab.tsx', mst);
