const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// 1. Fix SubTab type definition
page = page.replace(
  `type SubTab = 'overview' | 'start' | 'companies' | 'contracts' | 'registry' | 'finance' | 'equity';`,
  `type SubTab = 'overview' | 'start' | 'companies' | 'registry';`
);

// 2. Fix SUB_TABS array
page = page.replace(
  `const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'contracts',  label: 'Contracts',    requiresCompany: true },
    { id: 'registry',   label: 'Registry' },
    { id: 'finance',    label: 'Finance',      requiresCompany: true },
    { id: 'equity',     label: 'Equity',       requiresCompany: true },
  ];`,
  `const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'registry',   label: 'Registry' }
  ];`
);

// 3. Fix rendering block (removing missing components)
// We'll replace the entire block of rendering conditionals.
const renderRegex = /\{\/\* ─── Tab Content ─── \*\/\}\s*<div style=\{\{ flex: 1, overflowY: 'auto', padding: '24px' \}\}>[\s\S]*?(?=<\/div>\s*<\/div>\s*\)$)/;
const newRender = `{/* ─── Tab Content ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activeTab === 'overview'  && <OverviewTab company={company} playerCash={playerCash} netWorth={netWorth} onStartBusiness={() => setActiveTab('start')} onViewContracts={() => setActiveTab('companies')} onViewRegistry={() => setActiveTab('registry')} />}
        {activeTab === 'start'     && <StartBusinessTab step={step} setStep={setStep} selectedSector={selectedSector} setSelectedSector={setSelectedSector} selectedHQ={selectedHQ} setSelectedHQ={setSelectedHQ} companyNameInput={companyNameInput} setCompanyNameInput={setCompanyNameInput} nameError={nameError} setNameError={setNameError} startError={startError} playerCash={playerCash} company={company} onRegister={handleRegisterCompany} checkName={checkName} chosenCapital={chosenCapital} setChosenCapital={setChosenCapital} />}
        {activeTab === 'companies' && company && <CompanyDeskTab company={company} fleet={fleet} contracts={contracts} playerCash={playerCash} characterName={characterName} onTabChange={setActiveTab} onRefresh={refreshAll} />}
        {activeTab === 'registry'  && <RegistryTab company={company} />}
      </div>`;

page = page.replace(renderRegex, newRender);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
