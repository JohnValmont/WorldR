const fs = require('fs');

const path = 'd:/WorldR/frontend/src/app/drennia/business';

// 1. Fix imports in all files
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx'));
for (const f of files) {
  let p = path + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('../../../lib/theme')) {
    c = c.replace(/\.\.\/\.\.\/\.\.\/lib\/theme/g, '@/lib/theme');
    fs.writeFileSync(p, c);
  }
}

// 2. Fix DesignStudio FormSelect and missing constants
let ds = fs.readFileSync(path + '/DesignStudio.tsx', 'utf8');
// Replace ALL FormSelect occurrences
ds = ds.replace(/<FormSelect/g, '<select className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100" ');
ds = ds.replace(/<\/FormSelect>/g, '</select>');

// Add missing any typing
ds = ds.replace(/\(p\) =>/g, '(p: any) =>');
ds = ds.replace(/\(b\) =>/g, '(b: any) =>');
ds = ds.replace(/\(flag, i\) =>/g, '(flag: any, i: any) =>');

// Re-inject ENG_PRIORITIES and BUDGET_BUCKETS_FE if they are missing
if (!ds.includes('const ENG_PRIORITIES =')) {
  ds = `const ENG_PRIORITIES = [
  { id: 'reliability',   label: 'Reliability',               icon: '🛡️', desc: 'More testing, lower risk, better reliability score.' },
  { id: 'performance',   label: 'Performance',               icon: '⚡', desc: 'Higher power output, better perf score. Heavier and costlier.' },
  { id: 'fuel_economy',  label: 'Fuel Economy',              icon: '💧', desc: 'Lightweight focus, better fuel efficiency. Reduces weight.' },
  { id: 'comfort',       label: 'Comfort',                   icon: '🛋️', desc: 'Interior refinement, better appeal score.' },
  { id: 'practicality',  label: 'Practicality/Cargo',        icon: '📦', desc: 'Better packaging, higher cargo score.' },
  { id: 'safety',        label: 'Safety Focus',              icon: '🦺', desc: 'Stiffer chassis, better safety score. Slightly heavier.' }
];\n` + ds;
}
if (!ds.includes('const BUDGET_BUCKETS_FE =')) {
  ds = `const BUDGET_BUCKETS_FE = [
  { id: 'powertrain',           label: 'Powertrain R&D',        defaultPct: 0.18 },
  { id: 'body',                 label: 'Body Engineering',       defaultPct: 0.15 },
  { id: 'safety',               label: 'Safety Systems',         defaultPct: 0.12 },
  { id: 'interior',             label: 'Interior & NVH',         defaultPct: 0.10 },
  { id: 'testing',              label: 'Testing Programme',       defaultPct: 0.20 },
  { id: 'production_eng',       label: 'Production Engineering', defaultPct: 0.15 },
  { id: 'prototype_validation', label: 'Prototype Validation',    defaultPct: 0.10 },
];\n` + ds;
}
if (!ds.includes('const handleStartResearch =')) {
  ds = `\n  const handleStartResearch = async (programmeId: string) => {
    try {
      await manufacturingApi.startEngineeringProgramme(company.id, programmeId);
      showNotif('Engineering programme started.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start programme.', false);
    }
  };\n` + ds;
}

fs.writeFileSync(path + '/DesignStudio.tsx', ds);

// 3. Fix ManufacturingDeskTab.tsx unused variables in ctxValue
let mfg = fs.readFileSync(path + '/ManufacturingDeskTab.tsx', 'utf8');
mfg = mfg.replace(/refreshCompany,\s*/g, '');
mfg = mfg.replace(/toggleLineStatus,\s*/g, '');
mfg = mfg.replace(/handleDeleteLine,\s*/g, '');
mfg = mfg.replace(/handleSaveLinePlan,\s*/g, '');
mfg = mfg.replace(/buildNewLine,\s*/g, '');
mfg = mfg.replace(/handleExpandFactory,\s*/g, '');
mfg = mfg.replace(/handleMarketAllocations,\s*/g, '');
fs.writeFileSync(path + '/ManufacturingDeskTab.tsx', mfg);

// 4. Fix FactoryTab missing handlers
let ft = fs.readFileSync(path + '/FactoryTab.tsx', 'utf8');
if (!ft.includes('const handleLeaseFactory =')) {
  ft = `\n  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased. Production lines created.', true);
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease factory.', false);
    }
  };\n` + ft;
}
if (!ft.includes('const handleStartExpansion =')) {
  ft = `\n  const handleStartExpansion = async (factoryId: string) => {
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
  };\n` + ft;
}
fs.writeFileSync(path + '/FactoryTab.tsx', ft);

