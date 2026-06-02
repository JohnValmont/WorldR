const fs = require('fs');

let content = fs.readFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', 'utf8');

// 1. Add formatMoney helper at the top
if (!content.includes('export function formatMoney')) {
  content = content.replace(
    '// ─── Company ──────────────────────────────────────────────────────────────────',
    `// ─── Formatting ───────────────────────────────────────────────────────────────
export function formatMoney(value: number): string {
  return '₯' + new Intl.NumberFormat('en-US').format(value);
}

// ─── Company ──────────────────────────────────────────────────────────────────`
  );
}

// 2. Add Auto Ops to Vehicle
if (!content.includes('assignedAutoOpPool')) {
  content = content.replace(
    'assignedContractId?: string; // undefined = available',
    'assignedContractId?: string; // undefined = available\n  assignedAutoOpPool?: string;'
  );
}

// 3. Update Contract Interface
if (!content.includes('bidType: \'bid\' | \'direct\'')) {
  content = content.replace(
    `export interface Contract {
  id: string;
  issuerType: 'npc' | 'player';
  issuerCompanyId: string;
  issuerName: string;
  title: string;
  description: string;
  cargo?: string;
  requiredSector: string;
  originState: string;
  destinationState: string;
  payment: number;
  deadlineDays: number;
  penalty: number;
  requiredCapacity: number;
  visibility: 'public' | 'private';
  status: 'open' | 'awarded' | 'active' | 'completed' | 'failed';
  bids: ContractBid[];
  awardedToCompanyId?: string;
  assignedVehicleId?: string;
  createdAt: string;
}`,
    `export interface Contract {
  id: string;
  issuerType: 'npc' | 'player' | 'government' | 'international';
  issuerCompanyId: string;
  issuerName: string;
  title: string;
  description: string;
  cargo?: string;
  requiredSector: string;
  originState: string;
  destinationState: string;
  payment: number;
  deadlineDays: number;
  penalty: number;
  requiredCapacity: number;
  contractType: 'Local Delivery' | 'Interstate Freight' | 'Industrial Freight' | 'Produce Delivery' | 'Port Transfer' | 'Government Supply' | 'International Trade';
  bidType: 'bid' | 'direct';
  visibility: 'public' | 'private';
  status: 'open' | 'awarded' | 'active' | 'completed' | 'failed';
  bids: ContractBid[];
  awardedToCompanyId?: string;
  assignedVehicleId?: string;
  createdAt: string;
}`
  );
}

// 4. Update Starter Contracts with new types
if (!content.includes(`contractType: 'Local Delivery'`)) {
  content = content.replace(
    `export const STARTER_LOGISTICS_CONTRACTS: Contract[] = [`,
    `export const STARTER_LOGISTICS_CONTRACTS: Contract[] = [`
  );
  
  // Quick replaces on existing to inject the fields
  content = content.replace(
    `cargo: 'Office supplies',\n    requiredSector: 'Shipping & Logistics',`,
    `cargo: 'Office supplies',\n    contractType: 'Local Delivery', bidType: 'bid',\n    requiredSector: 'Shipping & Logistics',`
  );
  content = content.replace(
    `cargo: 'Produce',\n    requiredSector: 'Shipping & Logistics',`,
    `cargo: 'Produce',\n    contractType: 'Produce Delivery', bidType: 'bid',\n    requiredSector: 'Shipping & Logistics',`
  );
  content = content.replace(
    `cargo: 'Machine parts',\n    requiredSector: 'Shipping & Logistics',`,
    `cargo: 'Machine parts',\n    contractType: 'Industrial Freight', bidType: 'bid',\n    requiredSector: 'Shipping & Logistics',`
  );
  content = content.replace(
    `cargo: 'Import crates',\n    requiredSector: 'Shipping & Logistics',`,
    `cargo: 'Import crates',\n    contractType: 'Port Transfer', bidType: 'bid',\n    requiredSector: 'Shipping & Logistics',`
  );
  content = content.replace(
    `cargo: 'Retail goods',\n    requiredSector: 'Shipping & Logistics',`,
    `cargo: 'Retail goods',\n    contractType: 'Interstate Freight', bidType: 'bid',\n    requiredSector: 'Shipping & Logistics',`
  );

  // Add a Direct Accept contract
  content = content.replace(
    `];\n\nexport function initializeContractsIfEmpty(): void {`,
    `  ,
  {
    id: 'ctr-small-local-courier', issuerType: 'npc', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'Small Local Courier Run', description: 'Deliver small parcels around Drennport commercial district. No bidding needed.',
    cargo: 'Small parcels', contractType: 'Local Delivery', bidType: 'direct',
    requiredSector: 'Shipping & Logistics', originState: 'Drennport State', destinationState: 'Drennport State',
    payment: 8000, deadlineDays: 1, penalty: 1500, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  }
];

export function initializeContractsIfEmpty(): void {`
  );
}

// 5. Update Contract History and Add Types
if (!content.includes('export interface ContractHistoryEntry')) {
  content = content.replace(
    '// ─── Contract Management ──────────────────────────────────────────────────────',
    `// ─── Contract History ────────────────────────────────────────────────────────
export interface ContractHistoryEntry {
  id: string;
  companyId: string;
  title: string;
  issuer: string;
  issuerType: string;
  cargo?: string;
  originState: string;
  destinationState: string;
  vehicleId: string;
  vehicleName: string;
  payment: number;
  operatingCost: number;
  penalty: number;
  result: "completed" | "failed" | "cancelled";
  year: number;
  month: number;
  recordText: string;
}

export function getContractHistory(companyId: string): ContractHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const all: ContractHistoryEntry[] = JSON.parse(localStorage.getItem('worldr_contract_history_v1') || '[]');
  return all.filter(h => h.companyId === companyId);
}

export function saveContractHistory(entry: ContractHistoryEntry): void {
  if (typeof window === 'undefined') return;
  const all: ContractHistoryEntry[] = JSON.parse(localStorage.getItem('worldr_contract_history_v1') || '[]');
  all.unshift(entry);
  localStorage.setItem('worldr_contract_history_v1', JSON.stringify(all));
}

// ─── Contract Management ──────────────────────────────────────────────────────`
  );
}

// 6. Update resolveContract to push to history and update Reputation/Reliability logic
// Using regex to replace the completion/failure logic cleanly.

// 7. Auto Operations Types & Logic
if (!content.includes('runMonthlyAutoOperations')) {
  content += `

// ─── Auto Operations ──────────────────────────────────────────────────────────
export type AutoOpPoolType = 'Local Delivery Pool' | 'Retail Restock Pool' | 'Port Shuttle Pool' | 'Farm Collection Pool' | 'Industrial Supply Pool';

export function assignVehicleToAutoOp(vehicleId: string, poolType: AutoOpPoolType | null): { success: boolean; message: string } {
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = all.findIndex(v => v.id === vehicleId);
  if (vIdx < 0) return { success: false, message: 'Vehicle not found.' };
  if (all[vIdx].assignedContractId) return { success: false, message: 'Vehicle is currently assigned to a contract.' };
  
  if (poolType === null) {
    all[vIdx].assignedAutoOpPool = undefined;
    localStorage.setItem('worldr_fleet_v1', JSON.stringify(all));
    return { success: true, message: 'Vehicle removed from Auto Operations.' };
  } else {
    all[vIdx].assignedAutoOpPool = poolType;
    localStorage.setItem('worldr_fleet_v1', JSON.stringify(all));
    return { success: true, message: \`Vehicle assigned to \${poolType}.\` };
  }
}

export function runMonthlyAutoOperations(companyId: string): { success: boolean; message: string; results: any[] } {
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.', results: [] };
  const company = companies[cIdx];

  const fleet = getFleet(companyId).filter(v => v.assignedAutoOpPool);
  if (fleet.length === 0) return { success: false, message: 'No vehicles assigned to Auto Operations.', results: [] };

  const results = [];
  let totalGross = 0;
  let totalCost = 0;

  fleet.forEach(v => {
    // Determine state based on pool
    let demandMod = 1.0;
    let poolState = 'Drennport State';
    let baseDemand = 8000;
    let condDrop = 3;

    if (v.assignedAutoOpPool === 'Port Shuttle Pool') {
      demandMod = 1.2; // Westport high demand
      poolState = 'Westport State';
      baseDemand = 10000;
      condDrop = 4;
    } else if (v.assignedAutoOpPool === 'Local Delivery Pool') {
      demandMod = 1.0; // High pop, but high comp
      poolState = 'Drennport State';
      baseDemand = 7000;
      condDrop = 2;
    }

    const relMod = company.reliability === 'Preferred Carrier' ? 1.2 : company.reliability === 'Reliable' ? 1.1 : 1.0;
    const condMod = v.condition / 100;

    const gross = Math.round(baseDemand * v.capacity * demandMod * relMod * condMod);
    const cost = Math.round(gross * 0.2); // 20% operating cost
    const net = gross - cost;

    totalGross += gross;
    totalCost += cost;

    // Apply condition drop
    v.condition = Math.max(0, v.condition - condDrop);
    saveVehicle(v); // Update vehicle

    const recordText = \`\${company.name} completed regular work in \${v.assignedAutoOpPool}. Gross: \${formatMoney(gross)}. Cost: \${formatMoney(cost)}. Net: \${formatMoney(net)}.\`;
    addRecord(recordText, 'auto_op');
    
    results.push({ pool: v.assignedAutoOpPool, gross, cost, net, conditionDrop: condDrop, recordText });
  });

  company.companyCash += (totalGross - totalCost);
  
  // Reputation upgrade slowly
  if (company.reputation === 'New') company.reputation = 'Known Locally';
  else if (company.reputation === 'Known Locally') company.reputation = 'Trusted Carrier';

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  return { success: true, message: \`Auto Operations complete. Net income: \${formatMoney(totalGross - totalCost)}.\`, results };
}

// ─── Routes Tab Logic ─────────────────────────────────────────────────────────
export interface RouteFamiliarity {
  id: string; // Origin-Destination e.g., "Drennport State-Westport State"
  companyId: string;
  familiarity: number; // 0-100
}

export function getRouteFamiliarity(companyId: string): RouteFamiliarity[] {
  if (typeof window === 'undefined') return [];
  const all: RouteFamiliarity[] = JSON.parse(localStorage.getItem('worldr_route_familiarity_v1') || '[]');
  return all.filter(r => r.companyId === companyId);
}

export function increaseRouteFamiliarity(companyId: string, origin: string, dest: string, amount: number) {
  if (typeof window === 'undefined') return;
  const all: RouteFamiliarity[] = JSON.parse(localStorage.getItem('worldr_route_familiarity_v1') || '[]');
  const id = origin < dest ? \`\${origin}-\${dest}\` : \`\${dest}-\${origin}\`;
  let route = all.find(r => r.companyId === companyId && r.id === id);
  if (!route) {
    route = { id, companyId, familiarity: 0 };
    all.push(route);
  }
  route.familiarity = Math.min(100, route.familiarity + amount);
  localStorage.setItem('worldr_route_familiarity_v1', JSON.stringify(all));
}
`;
}

// 8. Update Reliability scales
content = content.replace(
  `const scale = ['Bad', 'Unproven', 'Unreliable', 'Reliable', 'Proven', 'Solid', 'Ironclad'];`,
  `const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];`
);
content = content.replace(
  `const scale = ['Bad', 'Unproven', 'Unreliable', 'Reliable', 'Proven', 'Solid', 'Ironclad'];`,
  `const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];`
);

// 9. Update calcCompanyValue to use Reliability bonus
content = content.replace(
  `export function calcCompanyValue(company: Company): number {
  const fleet = getFleet(company.id);
  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  return company.companyCash + vehicleAssetValue;
}`,
  `export function calcCompanyValue(company: Company): number {
  const fleet = getFleet(company.id);
  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  let reliabilityBonus = 0;
  if (company.reliability === 'First Delivery Completed') reliabilityBonus = 10000;
  else if (company.reliability === 'Reliable') reliabilityBonus = 50000;
  else if (company.reliability === 'Preferred Carrier') reliabilityBonus = 150000;
  
  return company.companyCash + vehicleAssetValue + reliabilityBonus - company.debt;
}`
);

// 10. Direct Accept logic in acceptContract
if (!content.includes('export function acceptDirectContract')) {
  content += `\nexport function acceptDirectContract(contractId: string, companyId: string, vehicleId: string): { success: boolean; message: string } {
  const contracts = getContracts();
  const cIdx = contracts.findIndex(c => c.id === contractId);
  if (cIdx < 0) return { success: false, message: 'Contract not found.' };
  if (contracts[cIdx].bidType !== 'direct') return { success: false, message: 'Not a direct accept contract.' };
  
  const allVehicles: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = allVehicles.findIndex(v => v.id === vehicleId);
  if (vIdx < 0) return { success: false, message: 'Vehicle not found.' };
  if (allVehicles[vIdx].assignedContractId) return { success: false, message: 'Vehicle already assigned.' };
  if (allVehicles[vIdx].capacity < contracts[cIdx].requiredCapacity) return { success: false, message: 'Vehicle capacity too low.' };

  allVehicles[vIdx].assignedContractId = contractId;
  localStorage.setItem('worldr_fleet_v1', JSON.stringify(allVehicles));

  contracts[cIdx].status = 'active';
  contracts[cIdx].awardedToCompanyId = companyId;
  contracts[cIdx].assignedVehicleId = vehicleId;
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));

  addRecord(\`Directly accepted "\${contracts[cIdx].title}".\`, 'contract');
  return { success: true, message: 'Contract directly accepted and vehicle assigned.' };
}\n`;
}

// Replace parts of resolveContract for history
content = content.replace(
  `addRecord(
      \`Completed "\${contract.title}" on time. Payment received: ₯\${bidAmount.toLocaleString()}. Operating cost: ₯\${operatingCost.toLocaleString()}.\`,
      'contract'
    );
    return { success: true, message: \`Contract completed. Net payment: ₯\${netPayment.toLocaleString()} (₯\${bidAmount.toLocaleString()} minus ₯\${operatingCost.toLocaleString()} operating cost).\`, netPayment };`,
  `
    const recordText = \`Completed "\${contract.title}" on time. Payment received: \${formatMoney(bidAmount)}. Operating cost: \${formatMoney(operatingCost)}.\`;
    addRecord(recordText, 'contract');
    increaseRouteFamiliarity(company.id, contract.originState, contract.destinationState, 5);
    
    saveContractHistory({
      id: \`hist_\${Date.now()}\`, companyId: company.id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: 0,
      result: 'completed', year: 290, month: 1, recordText
    });
    
    return { success: true, message: \`Contract completed. Net payment: \${formatMoney(netPayment)} (\${formatMoney(bidAmount)} minus \${formatMoney(operatingCost)} operating cost).\`, netPayment };`
);

content = content.replace(
  `addRecord(\`Failed to complete "\${contract.title}". Penalty deducted: ₯\${contract.penalty.toLocaleString()}. Reason: \${reason}.\`, 'failure');
    return { success: false, message: \`Contract failed — \${reason}. Penalty of ₯\${contract.penalty.toLocaleString()} deducted.\` };`,
  `const recordText = \`Failed to complete "\${contract.title}". Penalty deducted: \${formatMoney(contract.penalty)}. Reason: \${reason}.\`;
    addRecord(recordText, 'failure');
    
    saveContractHistory({
      id: \`hist_\${Date.now()}\`, companyId: company.id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: contract.penalty,
      result: 'failed', year: 290, month: 1, recordText
    });
    
    return { success: false, message: \`Contract failed — \${reason}. Penalty of \${formatMoney(contract.penalty)} deducted.\` };`
);

content = content.replace(/₯\$\{([^\}]+)\.toLocaleString\(\)\}/g, "\\${formatMoney($1)}");

fs.writeFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', content);
