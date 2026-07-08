const fs = require('fs');

const path = 'd:/WorldR/frontend/src/app/drennia/business';

// Fix imports in all files
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx'));
for (const f of files) {
  let p = path + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('@/lib/theme')) {
    c = c.replace(/@\/lib\/theme/g, '../../../lib/theme');
    fs.writeFileSync(p, c);
  }
}

// 1. FactoryTab.tsx
let ft = fs.readFileSync(path + '/FactoryTab.tsx', 'utf8');
// Remove handlers from top level
ft = ft.replace(/const handleLeaseFactory = async[\s\S]*?Failed to lease factory\.', false\);\s*\}\s*\};\s*const handleStartExpansion = async[\s\S]*?setShowExpandConfirm\(false\);\s*\}\s*\};/m, '');
// Insert them after useManufacturing()
ft = ft.replace(/marketSegments, brandResults\r?\n\s*\} = useManufacturing\(\);/, 'marketSegments, brandResults\n  } = useManufacturing();\n\n  const handleLeaseFactory = async (factoryTypeId: string) => {\n    try {\n      await manufacturingApi.leaseFactory(company.id, factoryTypeId);\n      showNotif(\'Factory leased. Production lines created.\', true);\n      onRefresh();\n      setDeskTab(\'factory\');\n    } catch (err: any) {\n      showNotif(err?.response?.data?.error || err?.response?.data?.message || \'Failed to lease factory.\', false);\n    }\n  };\n\n  const handleStartExpansion = async (factoryId: string) => {\n    try {\n      await manufacturingApi.startFactoryExpansion(company.id, factoryId);\n      showNotif(`Workshop expansion started. ${fm(EXPANSION_COST)} deducted. Construction completes in ${EXPANSION_DURATION} Month${EXPANSION_DURATION > 1 ? \'s\' : \'\'}.`, true);\n      setShowExpandConfirm(false);\n      setExpandingFactoryId(null);\n      onRefresh();\n    } catch (err: any) {\n      showNotif(err?.response?.data?.message || \'Failed to start expansion.\', false);\n      setShowExpandConfirm(false);\n    }\n  };\n');
fs.writeFileSync(path + '/FactoryTab.tsx', ft);

// 2. ProcurementPanel.tsx
let pp = fs.readFileSync(path + '/ProcurementPanel.tsx', 'utf8');
// Remove handlers from top level
pp = pp.replace(/const \[procuringComponent, setProcuringComponent\] = React\.useState[\s\S]*?Failed to procure\.', false\);\s*\}\s*\};/m, '');
// Wait, they are also declared in the useManufacturing block. Let's just remove them from useManufacturing destructure.
pp = pp.replace(/procuringComponent,\s*/g, '');
pp = pp.replace(/setProcuringComponent,\s*/g, '');
pp = pp.replace(/handleProcureComponent,\s*/g, '');
// Insert them after useManufacturing()
pp = pp.replace(/marketSegments, brandResults\r?\n\s*\} = useManufacturing\(\);/, 'marketSegments, brandResults\n  } = useManufacturing();\n\n  const [procuringComponent, setProcuringComponent] = React.useState<{ id: string, name: string, units: number, cost: number } | null>(null);\n\n  const handleProcureComponent = async (componentId: string, units: number) => {\n    try {\n      await manufacturingApi.procureComponents(company.id, { component_id: componentId, units });\n      showNotif(\'Components procured.\', true);\n      setProcuringComponent(null);\n      onRefresh();\n    } catch (err: any) {\n      showNotif(err?.response?.data?.message || \'Failed to procure.\', false);\n    }\n  };\n');
fs.writeFileSync(path + '/ProcurementPanel.tsx', pp);

// 3. ManufacturingOverview.tsx
let mo = fs.readFileSync(path + '/ManufacturingOverview.tsx', 'utf8');
// Remove handler from top level
mo = mo.replace(/const handleProcessAdmin = async[\s\S]*?Failed to process month\.', false\);\s*\}\s*\};/m, '');
mo = mo.replace(/handleProcessAdmin,\s*/g, '');
// Insert after useManufacturing()
mo = mo.replace(/marketSegments, brandResults\r?\n\s*\} = useManufacturing\(\);/, 'marketSegments, brandResults\n  } = useManufacturing();\n\n  const handleProcessAdmin = async () => {\n    try {\n      const res = await manufacturingApi.processArcAdmin(company.id);\n      showNotif(`Month processed: Net ${fm(res.data.netProfit)}`, true);\n      onRefresh();\n    } catch (err: any) {\n      showNotif(err?.response?.data?.message || \'Failed to process month.\', false);\n    }\n  };\n');
fs.writeFileSync(path + '/ManufacturingOverview.tsx', mo);

// 4. DesignStudio.tsx
let ds = fs.readFileSync(path + '/DesignStudio.tsx', 'utf8');
// Remove label="xxx" from <select>
ds = ds.replace(/<select className="([^"]*)" label="[^"]*"/g, '<select className="$1"');
fs.writeFileSync(path + '/DesignStudio.tsx', ds);
