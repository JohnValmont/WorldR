const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

c = c.replace(
  "{activeTab === 'registry' && <RegistryTab company={company} />}",
  "{activeTab === 'market' && <MarketTab playerCash={playerCash} onRefresh={onRefresh} />}\n        {activeTab === 'registry' && <RegistryTab company={company} />}"
);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Done chunk 5 market route');
