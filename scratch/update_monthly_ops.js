const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\lib\\businessCore.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Inject hireStaff and fireStaff just before processMonthlyOperations
const staffFunctions = `
export function hireStaff(companyId: string, role: StaffRole, playerCashRef: { cash: number }): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  const company = companies[cIdx];
  if (!company.staff) company.staff = {} as Record<StaffRole, number>;
  
  const baseWage = STAFF_WAGES[role];
  if (company.companyCash < baseWage) {
    return { success: false, message: \`Insufficient company cash to hire \${role}. Need \${formatMoney(baseWage)} for first month's wage.\` };
  }

  company.companyCash -= baseWage;
  company.staff[role] = (company.staff[role] || 0) + 1;
  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  addRecord(\`\${company.name} hired 1 \${role}. Monthly payroll increased by \${formatMoney(baseWage)}.\`);

  return { success: true, message: \`Successfully hired 1 \${role}.\` };
}

export function fireStaff(companyId: string, role: StaffRole): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  const company = companies[cIdx];
  if (!company.staff || !company.staff[role] || company.staff[role] === 0) {
    return { success: false, message: \`No \${role}s to dismiss.\` };
  }

  company.staff[role] -= 1;
  
  // Decrease morale slightly
  company.morale = Math.max(0, (company.morale || 50) - 2);

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  addRecord(\`\${company.name} dismissed 1 \${role}. Payroll decreased, but staff morale weakened.\`);

  return { success: true, message: \`Successfully dismissed 1 \${role}.\` };
}
`;

// 2. Replace runMonthlyAutoOperations
const processMonthlyOps = `
export function processMonthlyOperations(companyId: string): { success: boolean; message: string; report?: MonthlyReport } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[cIdx];

  const fleet = getFleet(companyId);
  
  // Initialization of new fields
  if (!company.staff) company.staff = {} as Record<StaffRole, number>;
  if (!company.wagePolicy) company.wagePolicy = 'Standard';
  if (!company.maintenancePolicy) company.maintenancePolicy = 'Standard';
  if (!company.contractStrategy) company.contractStrategy = 'Balanced Freight';
  if (!company.cashReservePolicy) company.cashReservePolicy = 'Growth';
  if (company.morale === undefined) company.morale = 50;
  if (!company.clientTrusts) company.clientTrusts = {};

  const driverCount = company.staff['Driver'] || 0;
  const dispatcherCount = company.staff['Dispatcher'] || 0;
  const mechanicCount = company.staff['Mechanic Crew'] || 0;

  // Active vehicles
  const autoOpVehicles = fleet.filter(v => v.assignedAutoOpPool);
  
  let autoRevenue = 0;
  let operatingCosts = 0;
  let fleetConditionChanges: string[] = [];

  // Founder exception
  const founderOperating = (fleet.length === 1 && driverCount === 0 && fleet[0].capacity <= 2);
  const totalDriversAvailable = driverCount + (founderOperating ? 1 : 0);
  
  let driversUsed = 0;

  // Process Auto Operations
  autoOpVehicles.forEach(v => {
    if (driversUsed >= totalDriversAvailable) {
      fleetConditionChanges.push(\`\${v.type} stayed idle (Driver Shortage)\`);
      return; // Skip if no driver
    }
    driversUsed++;

    let baseRevenue = v.capacity * 8000;
    
    // Dispatcher Bonus
    if (dispatcherCount > 0) baseRevenue *= 1.08;
    
    // Morale Bonus
    if (company.morale >= 80) baseRevenue *= 1.05;
    else if (company.morale <= 20) baseRevenue *= 0.92;

    const opCost = v.capacity * 2000;
    
    // Facility bonuses could be applied here
    
    autoRevenue += Math.floor(baseRevenue);
    operatingCosts += opCost;
    
    // Vehicle wear
    let wear = Math.floor(Math.random() * 4) + 1; // 1-4
    if (mechanicCount > 0) wear = Math.max(1, wear - 1);
    
    if (company.maintenancePolicy === 'Minimal') wear = Math.floor(wear * 1.35);
    else if (company.maintenancePolicy === 'Preventive') wear = Math.floor(wear * 0.75);
    else if (company.maintenancePolicy === 'Premium') wear = Math.floor(wear * 0.55);

    const oldCond = v.condition;
    v.condition = Math.max(0, v.condition - wear);
    fleetConditionChanges.push(\`\${v.type} condition: \${oldCond}% → \${v.condition}%\`);
    saveVehicle(v);
  });

  // Calculate Fixed Costs
  const facilityLeaseExpense = (company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0);
  
  let totalMaintenance = fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0);
  if (company.maintenancePolicy === 'Minimal') totalMaintenance *= 0.70;
  else if (company.maintenancePolicy === 'Preventive') totalMaintenance *= 1.30;
  else if (company.maintenancePolicy === 'Premium') totalMaintenance *= 1.60;
  totalMaintenance = Math.floor(totalMaintenance);

  let payrollMultiplier = 1.0;
  if (company.wagePolicy === 'Low') payrollMultiplier = 0.8;
  else if (company.wagePolicy === 'Generous') payrollMultiplier = 1.2;
  else if (company.wagePolicy === 'Premium') payrollMultiplier = 1.45;

  let basePayroll = 0;
  Object.keys(company.staff).forEach(k => {
    const role = k as StaffRole;
    basePayroll += (company.staff![role] || 0) * STAFF_WAGES[role];
  });
  const payrollExpense = Math.floor(basePayroll * payrollMultiplier);

  const netProfit = autoRevenue - operatingCosts - fleetMaintenance - facilityLeaseExpense - payrollExpense;

  let recordsCreated: string[] = [];
  
  company.companyCash += netProfit;

  let moraleChangeStr = "Stable";
  let reliabilityChangeStr = "Unchanged";
  let reputationChangeStr = "Unchanged";
  
  // Apply changes to morale, reputation
  if (company.wagePolicy === 'Low') {
    company.morale = Math.max(0, company.morale - 1);
    moraleChangeStr = "Dropped (Low Wages)";
  } else if (company.wagePolicy === 'Generous' && netProfit > 0) {
    company.morale = Math.min(100, company.morale + 1);
    moraleChangeStr = "Improved (Generous Wages)";
  } else if (company.wagePolicy === 'Premium' && company.companyCash >= payrollExpense) {
    company.morale = Math.min(100, company.morale + 1);
    moraleChangeStr = "Improved (Premium Wages)";
  }

  if (company.companyCash < 0) {
    company.morale = Math.max(0, company.morale - 2);
    moraleChangeStr = "Dropped (Cash Insolvency)";
  }

  // Update Game Date
  const dateStr = formatGameDate();
  advanceGameDate(1);
  
  // Build Report
  const report: MonthlyReport = {
    gameDateStr: dateStr,
    autoRevenue,
    manualRevenue: 0,
    operatingCosts,
    fleetMaintenance: totalMaintenance,
    facilityLeaseExpense,
    payrollExpense,
    penalties: 0,
    netProfit,
    fleetConditionChanges,
    staffCount: Object.values(company.staff).reduce((a,b)=>a+b,0),
    moraleChange: moraleChangeStr,
    reliabilityChange: reliabilityChangeStr,
    reputationChange: reputationChangeStr,
    clientTrustChanges: [],
    recordsCreated
  };

  company.lastMonthlyReport = report;
  company.monthlyRevenue = autoRevenue;
  company.monthlyCosts = operatingCosts + totalMaintenance + facilityLeaseExpense + payrollExpense;
  company.profit = netProfit;

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  addRecord(\`\${company.name} closed month \${dateStr}. Net Result: \${formatMoney(netProfit)}.\`);

  return { success: true, message: \`Monthly operations processed. Net result: \${formatMoney(netProfit)}\`, report };
}
`;

// we need to replace runMonthlyAutoOperations entirely.
let runAutoStart = code.indexOf('export function runMonthlyAutoOperations');
let runAutoEnd = code.indexOf('export interface RouteFamiliarity', runAutoStart);

if (runAutoStart !== -1 && runAutoEnd !== -1) {
  code = code.slice(0, runAutoStart) + staffFunctions + processMonthlyOps + "\n" + code.slice(runAutoEnd);
} else {
  console.error("Could not find bounds for replacement.");
}

// I also need to make sure the fleetMaintenance variable in processMonthlyOps is defined as totalMaintenance.
// Let me fix that.
code = code.replace(/fleetMaintenance/g, 'totalMaintenance');

fs.writeFileSync(file, code);
console.log('Monthly Ops injected');
