const fs = require('fs');

let pp = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/ProcurementPanel.tsx', 'utf8');
const ppHandlers = `  const [procuringComponent, setProcuringComponent] = React.useState<{ id: string, name: string, units: number, cost: number } | null>(null);

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
pp = pp.replace(ppHandlers, '');
pp = pp.replace('return (', ppHandlers + '\n\n  return (');
fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/ProcurementPanel.tsx', pp);

let mo = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/ManufacturingOverview.tsx', 'utf8');
const moHandlers = `  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(\`Month processed: Net \${fm(res.data.netProfit)}\`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process month.', false);
    }
  };`;
mo = mo.replace(moHandlers, '');
mo = mo.replace('return (', moHandlers + '\n\n  return (');
fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/ManufacturingOverview.tsx', mo);
