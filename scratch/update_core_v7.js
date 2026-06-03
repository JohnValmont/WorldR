const fs = require('fs');

let c = fs.readFileSync('frontend/src/lib/businessCore.ts', 'utf8');

const gameDateSystem = `
// ─── Game Date System ────────────────────────────────────────────────────────
export interface GameDate {
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  turn: number;
}

const INITIAL_GAME_DATE: GameDate = {
  worldYear: 2026,
  worldMonth: 6,
  worldDay: 3,
  turn: 1
};

export function getGameDate(): GameDate {
  if (typeof window === 'undefined') return INITIAL_GAME_DATE;
  const stored = localStorage.getItem('worldr_game_date_v1');
  return stored ? JSON.parse(stored) : INITIAL_GAME_DATE;
}

export function formatGameDate(date: GameDate = getGameDate()): string {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = date.worldDay.toString().padStart(2, '0');
  const m = monthNames[date.worldMonth - 1];
  return \`\${d} \${m} \${date.worldYear}\`;
}

export function advanceGameDate(months: number = 1): void {
  if (typeof window === 'undefined') return;
  const date = getGameDate();
  date.worldMonth += months;
  while (date.worldMonth > 12) {
    date.worldMonth -= 12;
    date.worldYear += 1;
  }
  date.turn += 1;
  localStorage.setItem('worldr_game_date_v1', JSON.stringify(date));
}
`;

if (!c.includes('export interface GameDate')) {
  c = c.replace('// ─── Facilities', gameDateSystem + '\\n// ─── Facilities');
}

c = c.split('new Date().toISOString()').join('formatGameDate()');

c = c.replace(
  "issuerType: 'npc' | 'player' | 'government' | 'international';",
  "issuerType: 'Government' | 'State-Owned Enterprise' | 'NPC Corporation' | 'Local Business' | 'Private Client' | 'Player Company';"
);

// We need to replace STARTER_LOGISTICS_CONTRACTS and NPC_COMPANIES.
// The easiest way is to find their indices.
let startIdx = c.indexOf('// ─── NPC Companies');
let endIdx = c.indexOf('// ─── Bid Evaluation');
if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `// ─── NPC Companies ────────────────────────────────────────────────────────────
import { NPC_COMPANIES } from '../data/drenniaNpcCompanies';
export { NPC_COMPANIES };

// ─── Starter Logistics Contracts (v1 — bigger money scale) ───────────────────
export const STARTER_LOGISTICS_CONTRACTS: Contract[] = [
  {
    id: 'ctr-drennport-office', issuerType: 'Local Business', issuerCompanyId: 'npc-drennport-office', issuerName: 'Drennport Office Suppliers',
    title: 'Drennport Office Supply Run', description: 'Regular delivery of paper, ink, and binding materials from the warehouse district to our main retail front.',
    cargo: 'Paper, ink, binding materials', contractType: 'Local Delivery', bidType: 'direct',
    requiredSector: 'Retail & Consumer', originState: 'Drennport State', destinationState: 'Drennport State',
    payment: 18000, deadlineDays: 1, penalty: 4000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-westport-dock', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-saltgate', issuerName: 'Saltgate Counting House',
    title: 'Westport Dock Transfer', description: 'Move import crates from the dock warehouse to the counting house bonded storage.',
    cargo: 'Import crates', contractType: 'Port Transfer', bidType: 'direct',
    requiredSector: 'Port & Trade', originState: 'Westport State', destinationState: 'Westport State',
    payment: 25000, deadlineDays: 1, penalty: 6000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-greenmere-produce', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-greenmere-fresh', issuerName: 'Greenmere Fresh Supply',
    title: 'Greenmere Produce Delivery', description: 'Transport 2 tons of root vegetables to Drennport outer markets before spoilage. Time-sensitive.',
    cargo: 'Root vegetables', contractType: 'Produce Delivery', bidType: 'bid',
    requiredSector: 'Agriculture & Food', originState: 'Greenmere State', destinationState: 'Drennport State',
    payment: 42000, deadlineDays: 3, penalty: 10000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-ironvale-parts', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-kovath', issuerName: 'Kovath Ironworks',
    title: 'Ironvale Parts Handling', description: 'Sorting and boxing of cast iron parts for railway shipment. Requires 2-capacity vehicle.',
    cargo: 'Cast iron parts', contractType: 'Industrial Freight', bidType: 'bid',
    requiredSector: 'Manufacturing', originState: 'Ironvale State', destinationState: 'Drennport State',
    payment: 65000, deadlineDays: 3, penalty: 18000, requiredCapacity: 2, visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-state-retail-restock', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'State Retail Restock', description: 'Deliver retail goods from Westport distribution centre to Drennport chain outlets.',
    cargo: 'Retail goods', contractType: 'Interstate Freight', bidType: 'bid',
    requiredSector: 'Retail & Consumer', originState: 'Westport State', destinationState: 'Drennport State',
    payment: 72000, deadlineDays: 4, penalty: 20000, requiredCapacity: 2, visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
];

export function initializeContractsIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const existing = getContracts();
  if (existing.length === 0) {
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(STARTER_LOGISTICS_CONTRACTS));
  }
}

`;
  c = c.substring(0, startIdx) + replacement + c.substring(endIdx);
}

c = c.replace(
  "const netIncome = totalGross - totalCost - totalMaintenance - facilityLeaseCost;",
  "const netIncome = totalGross - totalCost - totalMaintenance - facilityLeaseCost;\\n  advanceGameDate(1);"
);

const capitalFunctions = `
// ─── Capital Movement ────────────────────────────────────────────────────────
export function injectCapital(companyId: string, amount: number, playerCashRef: { cash: number }): { success: boolean; message: string } {
  if (amount <= 0) return { success: false, message: 'Amount must be greater than zero.' };
  if (playerCashRef.cash < amount) return { success: false, message: 'Insufficient personal cash.' };
  
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  playerCashRef.cash -= amount;
  companies[cIdx].companyCash += amount;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  const recordText = \`Founder injected \${formatMoney(amount)} into \${companies[cIdx].name} as owner capital.\`;
  addRecord(recordText, 'finance');
  
  return { success: true, message: \`Successfully injected \${formatMoney(amount)} into company.\` };
}

export function ownerDrawings(companyId: string, amount: number, playerCashRef: { cash: number }): { success: boolean; message: string } {
  if (amount <= 0) return { success: false, message: 'Amount must be greater than zero.' };
  
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  if (companies[cIdx].companyCash < amount) return { success: false, message: 'Insufficient company cash.' };
  
  companies[cIdx].companyCash -= amount;
  playerCashRef.cash += amount;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  const recordText = \`Founder withdrew \${formatMoney(amount)} from \${companies[cIdx].name} as owner drawings.\`;
  addRecord(recordText, 'finance');
  
  return { success: true, message: \`Successfully withdrew \${formatMoney(amount)} from company.\` };
}
`;

if (!c.includes('export function injectCapital')) {
  c = c + "\\n" + capitalFunctions;
}

fs.writeFileSync('frontend/src/lib/businessCore.ts', c);
console.log("Success");
