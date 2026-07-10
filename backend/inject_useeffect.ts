import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

const t1 = `  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
    if (deskTab === 'market' || deskTab === 'sales') {
      loadMarketData();
    }
  }, [deskTab, loadBootstrap, loadMarketData]);`;

const r1 = `  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
    if (deskTab === 'market' || deskTab === 'sales') {
      loadMarketData();
    }
    if (deskTab === 'sales') {
      loadLeaderboard();
    }
  }, [deskTab, loadBootstrap, loadMarketData, loadLeaderboard]);`;

if (c.includes(t1)) {
  c = c.replace(t1, r1);
  fs.writeFileSync(p, c, 'utf-8');
  console.log("Success");
} else {
  // Try line by line replace
  const lines = c.split('\n');
  const out = [];
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (deskTab === 'market' || deskTab === 'sales') {") && lines[i+1].includes("loadMarketData();")) {
      out.push(lines[i]);
      out.push(lines[i+1]);
      out.push(lines[i+2]);
      out.push(`    if (deskTab === 'sales') {`);
      out.push(`      loadLeaderboard();`);
      out.push(`    }`);
      out.push(`  }, [deskTab, loadBootstrap, loadMarketData, loadLeaderboard]);`);
      i += 3;
      found = true;
    } else {
      out.push(lines[i]);
    }
  }
  if (found) {
    fs.writeFileSync(p, out.join('\n'), 'utf-8');
    console.log("Success fallback");
  } else {
    console.log("Failed completely");
  }
}
