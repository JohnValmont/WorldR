const fs = require('fs');

let ds = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/DesignStudio.tsx', 'utf8');
const handleStartResearchStr = `  const handleStartResearch = async (programmeId: string) => {
    try {
      await manufacturingApi.startEngineeringProgramme(company.id, programmeId);
      showNotif('Engineering programme started.', true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start programme.', false);
    }
  };`;
ds = ds.replace(handleStartResearchStr, '');
ds = ds.replace('return (', handleStartResearchStr + '\n\n  return (');
fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/DesignStudio.tsx', ds);

let ft = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/FactoryTab.tsx', 'utf8');
const ftHandlers = `  const handleLeaseFactory = async (factoryTypeId: string) => {
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
ft = ft.replace(ftHandlers, '');
ft = ft.replace('return (', ftHandlers + '\n\n  return (');
fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/FactoryTab.tsx', ft);
