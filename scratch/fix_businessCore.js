const fs = require('fs');
let c = fs.readFileSync('frontend/src/lib/businessCore.ts', 'utf8');
const startIdx = c.indexOf('export function runMonthlyAutoOperations(');
const endIdx = c.indexOf('\n// ─── Routes Tab Logic', startIdx);
if (startIdx < 0 || endIdx < 0) { console.error('Could not find bounds'); process.exit(1); }
const newFunc = `export function runMonthlyAutoOperations(companyId: string): { success: boolean; message: string; results: any[] } {
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.', results: [] };
  const company = companies[cIdx];

  const fleet = getFleet(companyId);
  if (fleet.length === 0) return { success: false, message: 'No vehicles in fleet.', results: [] };

  const results: any[] = [];
  let totalGross = 0;
  let totalCost = 0;
  let totalMaintenance = 0;

  const poolStats: Record<string, { gross: number, cost: number, maintenance: number, condDrop: number }> = {};
  let idleMaintenance = 0;
  let contractMaintenance = 0;

  fleet.forEach(v => {
    const maint = v.monthlyMaintenance || 0;
    totalMaintenance += maint;

    if (v.assignedAutoOpPool) {
      const pool = v.assignedAutoOpPool;
      if (!poolStats[pool]) poolStats[pool] = { gross: 0, cost: 0, maintenance: 0, condDrop: 0 };
      
      let demandMod = 1.0;
      let baseDemand = 10000;
      let condDrop = 3;
      let costRate = 0.25;

      if (pool === 'Port Shuttle Pool') {
        demandMod = 1.2;
        baseDemand = 18000;
        condDrop = 4;
        costRate = 0.30;
      } else if (pool === 'Local Delivery Pool') {
        demandMod = 1.0;
        baseDemand = 12000;
        condDrop = 2;
        costRate = 0.25;
      }

      const hasWestportDepot = (company.facilities || []).some(f => f.state === 'Westport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
      const hasDrennportDepot = (company.facilities || []).some(f => f.state === 'Drennport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
      
      if (pool === 'Port Shuttle Pool' && hasWestportDepot) {
        demandMod *= 1.35;
      }
      if (pool === 'Local Delivery Pool' && hasDrennportDepot) {
        demandMod *= 1.25;
      }

      const relMod = company.reliability === 'Preferred Carrier' ? 1.2 : company.reliability === 'Reliable' ? 1.1 : 1.0;
      const condMod = v.condition / 100;

      const gross = Math.round(baseDemand * v.capacity * demandMod * relMod * condMod);
      const cost = Math.round(gross * costRate);

      poolStats[pool].gross += gross;
      poolStats[pool].cost += cost;
      poolStats[pool].maintenance += maint;
      poolStats[pool].condDrop += condDrop;

      totalGross += gross;
      totalCost += cost;

      v.condition = Math.max(0, v.condition - condDrop);
    } else if (v.assignedContractId) {
      contractMaintenance += maint;
    } else {
      idleMaintenance += maint;
    }

    saveVehicle(v);
  });

  Object.keys(poolStats).forEach(pool => {
    const stats = poolStats[pool];
    const net = stats.gross - stats.cost - stats.maintenance;
    const label = net >= 0 ? 'Net profit' : 'Operating loss';
    const recordText = \`\${company.name} completed recurring work in \${pool}. Gross revenue: \${formatMoney(stats.gross)}. Operating cost: \${formatMoney(stats.cost)}. Maintenance expense: \${formatMoney(stats.maintenance)}. \${label}: \${formatMoney(Math.abs(net))}.\`;
    addRecord(recordText, 'auto_op');
    results.push({ pool, ...stats, net, recordText });
  });

  if (idleMaintenance > 0 || contractMaintenance > 0) {
    const totalOtherMaint = idleMaintenance + contractMaintenance;
    const recordText = \`\${company.name} paid monthly fleet maintenance for vehicles not in auto operations: \${formatMoney(totalOtherMaint)}.\`;
    addRecord(recordText, 'business');
    results.push({ pool: 'Other Maintenance', gross: 0, cost: 0, maintenance: totalOtherMaint, net: -totalOtherMaint, recordText });
  }

  const facilityLeaseCost = (company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0);
  if (facilityLeaseCost > 0) {
    const leaseRecordText = \`\${company.name} paid monthly lease expenses for properties/facilities: \${formatMoney(facilityLeaseCost)}.\`;
    addRecord(leaseRecordText, 'business');
    results.push({ pool: 'Facility Leases', gross: 0, cost: 0, maintenance: 0, leaseCost: facilityLeaseCost, net: -facilityLeaseCost, recordText: leaseRecordText });
  }

  const netIncome = totalGross - totalCost - totalMaintenance - facilityLeaseCost;
  company.companyCash += netIncome;
  company.monthlyRevenue = totalGross;
  company.monthlyCosts = totalCost + totalMaintenance + facilityLeaseCost;
  company.profit = netIncome;
  
  if (company.reputation === 'New' && totalGross > 0) company.reputation = 'Known Locally';
  else if (company.reputation === 'Known Locally' && totalGross > 100000) company.reputation = 'Trusted Carrier';

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  let finalMessage = '';
  if (Object.keys(poolStats).length === 0) {
    finalMessage = 'No active auto operations. Fleet maintenance and leases remain due in monthly finance, but no dispatch revenue was generated.';
  } else {
    const label = netIncome >= 0 ? 'Net profit' : 'Operating loss';
    finalMessage = \`Operations processed. Gross revenue: \${formatMoney(totalGross)}. Operating cost: \${formatMoney(totalCost)}. Fleet maintenance: \${formatMoney(totalMaintenance)}.\`;
    if (facilityLeaseCost > 0) finalMessage += \` Facility lease: \${formatMoney(facilityLeaseCost)}.\`;
    finalMessage += \` \${label}: \${formatMoney(Math.abs(netIncome))}.\`;
  }

  return { success: true, message: finalMessage, results };
}`;
fs.writeFileSync('frontend/src/lib/businessCore.ts', c.substring(0, startIdx) + newFunc + c.substring(endIdx));
console.log('Replaced');
