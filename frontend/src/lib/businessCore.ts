// ─── WORLDr Business Core System ──────────────────────────────────────────────
// v2: Added Vehicle, Fleet, Logistics contracts, vehicle-based bid evaluation.
// Still backed by localStorage for v1, designed for backend swap.

// ─── Formatting ───────────────────────────────────────────────────────────────
export function formatMoney(value: number): string {
  return '₯' + Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0
  });
}


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
  return `${d} ${m} ${date.worldYear}`;
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


// ─── Finance History & Ledger ──────────────────────────────────────────────────
export type LedgerEntryType = 'Contract Revenue' | 'Auto Operations Revenue' | 'Other Revenue' | 'Staff Salaries' | 'Vehicle Maintenance' | 'Facility Leases' | 'Penalties' | 'Taxes' | 'Capital Injected' | 'Owner Drawings' | 'Loans Received' | 'Loan Repayments' | 'Asset Purchases' | 'Asset Sales';

export interface LedgerEntry {
  id: string;
  companyId: string;
  gameMonth: number;
  gameYear: number;
  gameDateStr: string;
  type: LedgerEntryType;
  description: string;
  incomeAmount: number;
  expenseAmount: number;
  balanceAfter: number;
  timestamp: string;
}

export interface MonthlyFinanceSnapshot {
  id: string;
  companyId: string;
  gameMonth: number;
  gameYear: number;
  label: string;

  startingCash: number;

  contractRevenue: number;
  autoOperationsRevenue: number;
  otherOperatingRevenue: number;
  totalOperatingRevenue: number;

  contractOperatingCosts: number;
  autoOperationsCosts: number;
  staffSalaries: number;
  vehicleMaintenance: number;
  facilityLeases: number;
  penalties: number;
  taxes: number;
  totalOperatingExpenses: number;

  netProfit: number;

  capitalInjected: number;
  ownerDrawings: number;
  loansReceived: number;
  loanRepayments: number;
  assetPurchases: number;
  assetSales: number;

  endingCash: number;
}

export function getLedger(companyId: string): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  const all: LedgerEntry[] = JSON.parse(localStorage.getItem('worldr_ledger_v1') || '[]');
  return all.filter(l => l.companyId === companyId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function saveLedgerEntry(entry: LedgerEntry): void {
  if (typeof window === 'undefined') return;
  const all: LedgerEntry[] = JSON.parse(localStorage.getItem('worldr_ledger_v1') || '[]');
  all.push(entry);
  localStorage.setItem('worldr_ledger_v1', JSON.stringify(all));
}

export function getFinanceHistory(companyId: string): MonthlyFinanceSnapshot[] {
  if (typeof window === 'undefined') return [];
  const all: MonthlyFinanceSnapshot[] = JSON.parse(localStorage.getItem('worldr_finance_history_v1') || '[]');
  return all.filter(s => s.companyId === companyId).sort((a, b) => {
    if (a.gameYear !== b.gameYear) return b.gameYear - a.gameYear;
    return b.gameMonth - a.gameMonth;
  });
}

export function saveFinanceSnapshot(snapshot: MonthlyFinanceSnapshot): void {
  if (typeof window === 'undefined') return;
  const all: MonthlyFinanceSnapshot[] = JSON.parse(localStorage.getItem('worldr_finance_history_v1') || '[]');
  const existingIndex = all.findIndex(s => s.companyId === snapshot.companyId && s.gameYear === snapshot.gameYear && s.gameMonth === snapshot.gameMonth);
  if (existingIndex >= 0) all[existingIndex] = snapshot;
  else all.push(snapshot);
  localStorage.setItem('worldr_finance_history_v1', JSON.stringify(all));
}


// ─── Staff & Policies ────────────────────────────────────────────────────────
export const STAFF_WAGES = {
  'Driver': 18000,
  'Dispatcher': 28000,
  'Mechanic Crew': 30000,
  'Warehouse Worker': 22000,
  'Admin Clerk': 20000,
  'Operations Manager': 50000
} as const;

export type StaffRole = keyof typeof STAFF_WAGES;

export type WagePolicy = 'Low' | 'Standard' | 'Generous' | 'Premium';
export type MaintenancePolicy = 'Minimal' | 'Standard' | 'Preventive' | 'Premium';
export type ContractStrategy = 'Safe Local' | 'Balanced Freight' | 'Aggressive Growth';
export type CashReservePolicy = 'Conservative' | 'Growth' | 'Aggressive';

export function hireStaff(companyId: string, role: StaffRole): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server-side operation not supported.' };
  let companies: any[] = [];
  try {
    companies = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
  } catch(e) {}
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx === -1) return { success: false, message: 'Company not found.' };
  
  if (!companies[cIdx].staff) companies[cIdx].staff = {};
  companies[cIdx].staff[role] = (companies[cIdx].staff[role] || 0) + 1;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  return { success: true, message: `Hired 1 ${role}.` };
}

export function fireStaff(companyId: string, role: StaffRole): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server-side operation not supported.' };
  let companies: any[] = [];
  try {
    companies = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
  } catch(e) {}
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx === -1) return { success: false, message: 'Company not found.' };
  
  if (!companies[cIdx].staff) companies[cIdx].staff = {};
  if ((companies[cIdx].staff[role] || 0) <= 0) return { success: false, message: 'No staff in this role to dismiss.' };
  
  companies[cIdx].staff[role]--;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  return { success: true, message: `Dismissed 1 ${role}.` };
}
export interface MonthlyReport {
  gameDateStr: string;
  autoRevenue: number;
  manualRevenue: number;
  operatingCosts: number;
  totalMaintenance: number;
  facilityLeaseExpense: number;
  payrollExpense: number;
  penalties: number;
  netProfit: number;
  fleetConditionChanges: string[];
  staffCount: number;
  moraleChange: string;
  reliabilityChange: string;
  reputationChange: string;
  clientTrustChanges: string[];
  recordsCreated: string[];
}

// ─── Facilities ───────────────────────────────────────────────────────────────
export interface Facility {
  id: string;
  type: 'Office' | 'Vehicle Yard' | 'Small Depot' | 'Warehouse' | 'Freight Yard' | 'Regional Branch Office' | 'Port Warehouse' | 'Port Terminal';
  state: string;
  leaseCost: number;
  leasedAt: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export type CompanyLegalStructure = 'Sole Trader' | 'Private Company' | 'Corporation';
export type CompanyOperatingModel = 'Local Courier Operator' | 'Port Shuttle Operator' | 'Interstate Freight Beginner' | 'Industrial Parts Carrier';

export interface Company {
  id: string;
  ownerCharacterId: string;
  ownerName: string;
  name: string;
  legalStructure: CompanyLegalStructure;
  state: string;
  sector: string;
  registeredAt: string;
  companyCash: number;
  monthlyRevenue: number;
  monthlyCosts: number;
  profit: number;
  capacity: number;
  reputation: string;
  reliability: string;
  debt: number;
  status: string;
  activeContracts: string[];
  publicRecords: string[];
  riskFlags: string[];
  facilities?: Facility[];
  operatingModel?: CompanyOperatingModel;
  
  // v8 Additions
  staff?: Record<StaffRole, number>;
  wagePolicy?: WagePolicy;
  maintenancePolicy?: MaintenancePolicy;
  contractStrategy?: ContractStrategy;
  cashReservePolicy?: CashReservePolicy;
  morale?: number; // 0 to 100
  clientTrusts?: Record<string, number>; // issuerId -> trust score
  lastMonthlyReport?: MonthlyReport;
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────
export type VehicleType = 'Used Delivery Van' | 'Box Truck' | 'Used Freight Truck';

export interface Vehicle {
  id: string;
  companyId: string;
  type: VehicleType;
  capacity: number;
  condition: number;          // 0–100
  purchaseCost: number;
  monthlyMaintenance: number;
  assignedContractId?: string; // undefined = available
  assignedAutoOpPool?: string;
  purchasedAt: string;
}

export const VEHICLE_CATALOGUE: {
  type: VehicleType;
  cost: number;
  capacity: number;
  maintenance: number;
  desc: string;
}[] = [
  {
    type: 'Used Delivery Van',
    cost: 70000,
    capacity: 1,
    maintenance: 3000,
    desc: 'Best for local delivery and small cargo. Low operating cost.',
  },
  {
    type: 'Box Truck',
    cost: 160000,
    capacity: 2,
    maintenance: 7000,
    desc: 'Medium freight, produce delivery, retail restock. Versatile workhorse.',
  },
  {
    type: 'Used Freight Truck',
    cost: 280000,
    capacity: 3,
    maintenance: 12000,
    desc: 'Industrial parts, state-to-state freight. High capacity, higher upkeep.',
  },
];

export function getFleet(companyId: string): Vehicle[] {
  if (typeof window === 'undefined') return [];
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  return all.filter(v => v.companyId === companyId);
}

export function getVehicleDisplayLabel(vehicle: Vehicle): string {
  return vehicle.type;
}

export function saveVehicle(vehicle: Vehicle): void {
  if (typeof window === 'undefined') return;
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const idx = all.findIndex(v => v.id === vehicle.id);
  if (idx >= 0) all[idx] = vehicle; else all.push(vehicle);
  localStorage.setItem('worldr_fleet_v1', JSON.stringify(all));
}

export function purchaseVehicle(companyId: string, type: VehicleType): { success: boolean; message: string } {
  const spec = VEHICLE_CATALOGUE.find(v => v.type === type);
  if (!spec) return { success: false, message: 'Unknown vehicle type.' };
  const companies = getCompanies();
  const idx = companies.findIndex(c => c.id === companyId);
  if (idx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[idx];
  if (company.companyCash < spec.cost) return { success: false, message: `Insufficient company cash. Need \${formatMoney(spec.cost)}.` };
  company.companyCash -= spec.cost;
  companies[idx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  const vehicle: Vehicle = {
    id: `veh_${Date.now()}`,
    companyId,
    type,
    capacity: spec.capacity,
    condition: 100,
    purchaseCost: spec.cost,
    monthlyMaintenance: spec.maintenance,
    purchasedAt: formatGameDate(),
  };
  saveVehicle(vehicle);
  return { success: true, message: `Purchased ${type} for \${formatMoney(spec.cost)}.` };
}

export function buyVehicleFromNpc(
  companyId: string,
  type: VehicleType,
  price: number,
  condition: number,
  capacity: number,
  monthlyMaintenance: number,
  sourceName: string
): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server env' };
  
  const companies = getCompanies();
  const idx = companies.findIndex(c => c.id === companyId);
  if (idx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[idx];
  
  if (company.companyCash < price) {
    return { success: false, message: 'Insufficient company cash. Inject capital or choose a cheaper vehicle.' };
  }
  
  company.companyCash -= price;
  companies[idx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  const vehicle: Vehicle = {
    id: `veh_${Date.now()}`,
    companyId,
    type,
    capacity,
    condition,
    purchaseCost: price,
    monthlyMaintenance,
    purchasedAt: formatGameDate(),
  };
  saveVehicle(vehicle);
  
  addRecord(`${company.name} ordered a ${type} from ${sourceName} for ${formatMoney(price)}.`, 'finance');
  
  return { success: true, message: `Purchased ${type} from ${sourceName} for ${formatMoney(price)}.` };
}

export function performMaintenance(vehicleId: string, level: 'basic' | 'full'): { success: boolean; message: string } {
  const cost = level === 'basic' ? 5000 : 15000;
  const restore = level === 'basic' ? 10 : 30;
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = all.findIndex(v => v.id === vehicleId);
  if (vIdx < 0) return { success: false, message: 'Vehicle not found.' };
  const vehicle = all[vIdx];
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === vehicle.companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  if (companies[cIdx].companyCash < cost) return { success: false, message: `Insufficient funds. Cost: \${formatMoney(cost)}.` };
  companies[cIdx].companyCash -= cost;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  all[vIdx].condition = Math.min(100, vehicle.condition + restore);
  localStorage.setItem('worldr_fleet_v1', JSON.stringify(all));
  return { success: true, message: `${level === 'basic' ? 'Basic maintenance' : 'Full service'} completed. Condition restored to ${all[vIdx].condition}%.` };
}

// ─── BusinessOffer ────────────────────────────────────────────────────────────
export interface BusinessOffer {
  id: string;
  senderCompanyId: string;
  senderName: string;
  targetCompanyId: string;
  targetName: string;
  title: string;
  description: string;
  price: number;
  deadlineDays: number;
  note: string;
  status: 'sent' | 'accepted' | 'rejected' | 'countered';
  createdAt: string;
}

// ─── ContractBid ──────────────────────────────────────────────────────────────
export interface ContractBid {
  companyId: string;
  amount: number;
  note: string;
  timestamp: string;
}

export type ContractIssuerType = 'Government' | 'State-Owned Enterprise' | 'NPC Corporation' | 'Local Business' | 'Private Client' | 'Player Company';
export type ContractRouteType = 'Local' | 'Interstate' | 'International' | 'Local / Port';
export type ContractType = 'Local Delivery' | 'Interstate Freight' | 'Industrial Freight' | 'Produce Delivery' | 'Port Transfer' | 'Government Supply' | 'International Trade';
export type ContractBidType = 'Direct Accept' | 'Requires Bid';
export type ContractBaseRisk = 'Low' | 'Medium' | 'High';
export type ContractVisibility = 'public' | 'private';
export type ContractStatus = 'open' | 'awarded' | 'active' | 'completed' | 'failed' | 'Lost Bid';

export interface Contract {
  id: string;
  issuerType: ContractIssuerType;
  issuerCompanyId: string;
  issuerName: string;
  title: string;
  description: string;
  cargo: string;
  requiredSector: string;
  originState: string;
  destinationState: string;
  routeType: ContractRouteType;
  payment: number;
  operatingCostEstimate: number;
  penalty: number;
  durationMonths: number;
  requiredCapacity: number;
  contractType: ContractType;
  bidType: ContractBidType;
  baseRisk: ContractBaseRisk;
  visibility: ContractVisibility;
  status: ContractStatus;
  bids: ContractBid[];
  requiredDrivers: number;
  recommendedStaff: string[];
  awardedToCompanyId?: string;
  assignedVehicleId?: string;
  startMonth?: number;
  startYear?: number;
  dueMonth?: number;
  dueYear?: number;
  createdAt: string;
}

// ─── Owner Capital Movement ──────────────────────────────────────────────────


// ─── Company Management ───────────────────────────────────────────────────────
export function getCompanies(): Company[] {
  if (typeof window === 'undefined') return [];
  const companies: Company[] = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
  companies.forEach(company => {
    company.clientTrusts = Object.fromEntries(
      Object.entries(company.clientTrusts ?? {}).map(([issuer, value]) => [
        issuer,
        Number(value) || 0,
      ])
    );
  });
  return companies;
}

export function saveCompany(company: Company): void {
  if (typeof window === 'undefined') return;
  const companies = getCompanies();
  const index = companies.findIndex(c => c.id === company.id);
  if (index >= 0) companies[index] = company; else companies.push(company);
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
}

export function getPlayerCompany(characterId: string): Company | undefined {
  return getCompanies().find(c => c.ownerCharacterId === characterId);
}

// ─── Reserved Names ───────────────────────────────────────────────────────────
export function getReservedNames(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('worldr_reserved_business_names_v1') || '{}');
}

export function reserveName(characterId: string, name: string): void {
  if (typeof window === 'undefined') return;
  const names = getReservedNames();
  names[name.toLowerCase()] = characterId;
  localStorage.setItem('worldr_reserved_business_names_v1', JSON.stringify(names));
}

export function isNameReserved(name: string): boolean {
  return !!getReservedNames()[name.toLowerCase()];
}

// ─── Contract History ────────────────────────────────────────────────────────
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
  result: "completed" | "failed" | "cancelled" | "Lost Bid";
  trustImpact: string;
  reliabilityImpact: string;
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

// ─── Contract Management ──────────────────────────────────────────────────────
export function getContracts(): Contract[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('worldr_contracts_v1') || '[]');
}

export function saveContract(contract: Contract): void {
  if (typeof window === 'undefined') return;
  const contracts = getContracts();
  const index = contracts.findIndex(c => c.id === contract.id);
  if (index >= 0) contracts[index] = contract; else contracts.push(contract);
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
}

export function createPlayerContract(contract: Omit<Contract, 'id' | 'createdAt' | 'status' | 'bids' | 'issuerType'>): void {
  saveContract({ ...contract, id: `ctr_${Date.now()}`, issuerType: 'Player Company', status: 'open', bids: [], createdAt: formatGameDate() });
}

// ─── Business Offers ─────────────────────────────────────────────────────────
export function getBusinessOffers(): BusinessOffer[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('worldr_business_offers_v1') || '[]');
}

export function saveBusinessOffer(offer: BusinessOffer): void {
  if (typeof window === 'undefined') return;
  const offers = getBusinessOffers();
  const index = offers.findIndex(o => o.id === offer.id);
  if (index >= 0) offers[index] = offer; else offers.push(offer);
  localStorage.setItem('worldr_business_offers_v1', JSON.stringify(offers));
}

// ─── Records ─────────────────────────────────────────────────────────────────
export function addRecord(summary: string, type = 'business'): void {
  if (typeof window === 'undefined') return;
  const rec = { id: `rec_${Date.now()}`, type, summary, createdAt: formatGameDate() };
  const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
  localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));
}

// ─── Net Worth ────────────────────────────────────────────────────────────────
export function calcCompanyValue(company: Company): number {
  const fleet = getFleet(company.id);
  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  let reliabilityBonus = 0;
  if (company.reliability === 'First Delivery Completed') reliabilityBonus = 10000;
  else if (company.reliability === 'Reliable') reliabilityBonus = 50000;
  else if (company.reliability === 'Preferred Carrier') reliabilityBonus = 150000;
  
  return company.companyCash + vehicleAssetValue + reliabilityBonus - company.debt;
}

export function calcNetWorth(playerCash: number, company: Company | null): number {
  if (!company) return playerCash;
  return playerCash + calcCompanyValue(company);
}

// ─── NPC Companies ────────────────────────────────────────────────────────────
import { NPC_COMPANIES } from '../data/drenniaNpcCompanies';
export { NPC_COMPANIES };

// ─── Starter Logistics Contracts (v1 — bigger money scale) ───────────────────
export const STARTER_LOGISTICS_CONTRACTS: Contract[] = [
  {
    id: 'ctr-drennport-office', issuerType: 'Local Business', issuerCompanyId: 'npc-drennport-office', issuerName: 'Drennport Office Suppliers',
    title: 'Drennport Office Supply Run', description: 'Regular delivery of paper, ink, and binding materials from the warehouse district to our main retail front.',
    cargo: 'Paper, ink, binding materials', contractType: 'Local Delivery', bidType: 'Direct Accept',
    requiredSector: 'Retail & Consumer', originState: 'Drennport State', destinationState: 'Drennport State', routeType: 'Local',
    payment: 18000, operatingCostEstimate: 4200, penalty: 4000, durationMonths: 1, requiredCapacity: 1, requiredDrivers: 1, recommendedStaff: [], baseRisk: 'Low',
    visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-westport-dock', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-saltgate', issuerName: 'Saltgate Counting House',
    title: 'Westport Dock Transfer', description: 'Move import crates from the dock warehouse to the counting house bonded storage.',
    cargo: 'Import crates', contractType: 'Port Transfer', bidType: 'Direct Accept',
    requiredSector: 'Port & Trade', originState: 'Westport State', destinationState: 'Westport State', routeType: 'Local / Port',
    payment: 25000, operatingCostEstimate: 6250, penalty: 6000, durationMonths: 1, requiredCapacity: 1, requiredDrivers: 1, recommendedStaff: ['Dispatcher'], baseRisk: 'Low',
    visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-greenmere-produce', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-greenmere-fresh', issuerName: 'Greenmere Fresh Supply',
    title: 'Greenmere Produce Delivery', description: 'Transport 2 tons of root vegetables to Drennport outer markets before spoilage. Time-sensitive.',
    cargo: 'Root vegetables', contractType: 'Produce Delivery', bidType: 'Requires Bid',
    requiredSector: 'Agriculture & Food', originState: 'Greenmere State', destinationState: 'Drennport State', routeType: 'Interstate',
    payment: 42000, operatingCostEstimate: 11500, penalty: 10000, durationMonths: 1, requiredCapacity: 1, requiredDrivers: 1, recommendedStaff: ['Dispatcher'], baseRisk: 'Medium',
    visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-ironvale-parts', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-kovath', issuerName: 'Kovath Ironworks',
    title: 'Ironvale Parts Handling', description: 'Sorting and boxing of cast iron parts for railway shipment. Requires 2-capacity vehicle.',
    cargo: 'Cast iron parts', contractType: 'Industrial Freight', bidType: 'Requires Bid',
    requiredSector: 'Manufacturing', originState: 'Ironvale State', destinationState: 'Drennport State', routeType: 'Interstate',
    payment: 65000, operatingCostEstimate: 18000, penalty: 18000, durationMonths: 1, requiredCapacity: 2, requiredDrivers: 1, recommendedStaff: ['Dispatcher', 'Mechanic Crew'], baseRisk: 'Medium',
    visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
  {
    id: 'ctr-state-retail-restock', issuerType: 'NPC Corporation', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'State Retail Restock', description: 'Deliver retail goods from Westport distribution centre to Drennport chain outlets.',
    cargo: 'Retail goods', contractType: 'Interstate Freight', bidType: 'Requires Bid',
    requiredSector: 'Retail & Consumer', originState: 'Westport State', destinationState: 'Drennport State', routeType: 'Interstate',
    payment: 72000, operatingCostEstimate: 20000, penalty: 20000, durationMonths: 1, requiredCapacity: 2, requiredDrivers: 1, recommendedStaff: ['Dispatcher'], baseRisk: 'Medium',
    visibility: 'public', status: 'open', bids: [], createdAt: formatGameDate()
  },
];

export function initializeContractsIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const existing = getContracts();
  if (existing.length === 0) {
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(STARTER_LOGISTICS_CONTRACTS));
  }
}

// ─── Bid Evaluation (Vehicle-Gated) ──────────────────────────────────────────
export function evaluatePlayerBid(
  contractId: string,
  companyId: string,
  bidAmount: number
): { accepted: boolean; message: string } {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === contractId);
  if (!contract || contract.status !== 'open') return { accepted: false, message: 'Contract unavailable.' };

  const companies = getCompanies();
  const company = companies.find(c => c.id === companyId);
  if (!company) return { accepted: false, message: 'Company not found.' };

  if (bidAmount < contract.payment * 0.5) return { accepted: false, message: 'Bid too low. Minimum bid is 50% of listed payment.' };
  if (bidAmount > contract.payment * 1.5) return { accepted: false, message: 'Bid too high. Maximum bid is 150% of listed payment.' };

  const npcBid = Math.floor(contract.payment * (0.8 + Math.random() * 0.4)); // 80% to 120%

  const fleet = getFleet(companyId).filter(v => !v.assignedContractId && !v.assignedAutoOpPool);
  const suitableVehicle = fleet.find(v => v.capacity >= contract.requiredCapacity);

  let score = 0;
  if (company.sector === contract.requiredSector) score += 2;
  if (suitableVehicle) {
    score += 2;
    if (suitableVehicle.condition > 80) score += 2;
    else if (suitableVehicle.condition > 60) score += 1;
  } else {
    score -= 3;
  }
  
  if (bidAmount <= npcBid) score += 3;
  else if (bidAmount <= contract.payment) score += 1;
  else score -= 2;

  const trust = company.clientTrusts?.[contract.issuerCompanyId] ?? 0;
  if (trust >= 80) score += 3;
  else if (trust >= 50) score += 2;
  else if (trust <= 10) score -= 3;

  if (company.reliability === 'Proven' || company.reliability === 'Reliable' || company.reliability === 'Ironclad') score += 1;
  if (company.reliability === 'Bad' || company.reliability === 'Failing') score -= 2;

  const originDestStr = contract.originState < contract.destinationState 
    ? `${contract.originState}-${contract.destinationState}` 
    : `${contract.destinationState}-${contract.originState}`;
  const routeFam = getRouteFamiliarity(companyId).find(r => r.id === originDestStr);
  if (routeFam && routeFam.familiarity > 30) score += 1;
  if (routeFam && routeFam.familiarity > 70) score += 1;

  if (company.staff && company.staff['Dispatcher'] > 0) score += 1;

  const accepted = score >= 5;
  const updated = {
    ...contract,
    status: accepted ? ('awarded' as const) : ('Lost Bid' as const),
    bids: [...contract.bids, { companyId, amount: bidAmount, note: '', timestamp: formatGameDate() }],
    ...(accepted ? { awardedToCompanyId: companyId } : {}),
  };
  saveContract(updated);

  if (accepted) {
    addRecord(`Won bid for "${contract.title}" with a bid of ${formatMoney(bidAmount)}.`, 'contract');
    return { accepted: true, message: `Bid Won! Your bid of ${formatMoney(bidAmount)} beat the competition.` };
  } else {
    addRecord(`Lost bid for "${contract.title}". NPC competitor bid: ${formatMoney(npcBid)}.`, 'failure');
    return { accepted: false, message: `Bid Lost. Your score was too low or price too high (NPC bid: ${formatMoney(npcBid)}).` };
  }
}

// ─── Assign Vehicle to Contract ───────────────────────────────────────────────
export function assignVehicleToContract(contractId: string, vehicleId: string): { success: boolean; message: string } {
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = all.findIndex(v => v.id === vehicleId);
  if (vIdx < 0) return { success: false, message: 'Vehicle not found.' };
  if (all[vIdx].assignedContractId) return { success: false, message: 'Vehicle already assigned to a contract.' };
  all[vIdx].assignedContractId = contractId;
  localStorage.setItem('worldr_fleet_v1', JSON.stringify(all));

  const contracts = getContracts();
  const cIdx = contracts.findIndex(c => c.id === contractId);
  if (cIdx >= 0) {
    contracts[cIdx].assignedVehicleId = vehicleId;
    contracts[cIdx].status = 'active';
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
  }
  return { success: true, message: 'Vehicle assigned. Contract is now active.' };
}

// ─── Resolve Contract ─────────────────────────────────────────────────────────
function getOperatingCostRate(contract: Contract): number {
  const stateToState = contract.originState !== contract.destinationState;
  const heavy = contract.requiredCapacity >= 3;
  if (heavy) return 0.25;
  if (stateToState) return 0.20;
  return 0.15;
}

function getConditionDrop(contract: Contract): number {
  const heavy = contract.requiredCapacity >= 3;
  const stateToState = contract.originState !== contract.destinationState;
  if (heavy) return 8 + Math.floor(Math.random() * 5); // 8-12
  if (stateToState) return 5 + Math.floor(Math.random() * 4); // 5-8
  return 2 + Math.floor(Math.random() * 3); // 2-4
}

export function getClientTrustLabel(score: number): string {
  if (score >= 80) return 'Preferred Client';
  if (score >= 50) return 'Trusted';
  if (score >= 20) return 'Known';
  return 'New Relationship';
}

export function resolveContract(contractId: string): { success: boolean; message: string; netPayment?: number } {
  const contracts = getContracts();
  const cIdx = contracts.findIndex(c => c.id === contractId);
  if (cIdx < 0) return { success: false, message: 'Contract not found.' };
  const contract = contracts[cIdx];
  if (contract.status !== 'active' && contract.status !== 'awarded') return { success: false, message: 'Contract is not active.' };
  if (!contract.awardedToCompanyId) return { success: false, message: 'No company awarded.' };

  const companies = getCompanies();
  const compIdx = companies.findIndex(c => c.id === contract.awardedToCompanyId);
  if (compIdx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[compIdx];

  const fleet: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = contract.assignedVehicleId ? fleet.findIndex(v => v.id === contract.assignedVehicleId) : -1;
  const vehicle = vIdx >= 0 ? fleet[vIdx] : undefined;

  const bid = contract.bids.find(b => b.companyId === contract.awardedToCompanyId);
  const bidAmount = bid?.amount ?? contract.payment;

  let operatingRate = contract.operatingCostEstimate / contract.payment;
  // Route familiarity reduces cost
  const originDestStr = contract.originState < contract.destinationState ? `${contract.originState}-${contract.destinationState}` : `${contract.destinationState}-${contract.originState}`;
  const routeFam = getRouteFamiliarity(company.id).find(r => r.id === originDestStr)?.familiarity || 0;
  if (routeFam > 0) {
     operatingRate *= (1 - (routeFam / 200)); // up to 50% cost reduction at 100% familiarity
  }
  const operatingCost = Math.round(bidAmount * operatingRate);

  // Success chance evaluation
  let successChance = 100;
  if (contract.baseRisk === 'Medium') successChance -= 15;
  if (contract.baseRisk === 'High') successChance -= 30;
  if (vehicle) {
    if (vehicle.condition < 40) successChance -= 50;
    else if (vehicle.condition < 60) successChance -= 20;
  } else {
    successChance = 0;
  }
  
  if (company.staff && company.staff['Dispatcher'] > 0) successChance += 10;
  if (company.morale && company.morale > 80) successChance += 10;
  if (company.morale && company.morale < 30) successChance -= 20;

  const driverCount = company.staff ? (company.staff['Driver'] || 0) : 0;
  const founderOperating = (fleet.length === 1 && driverCount === 0 && fleet[0].capacity <= 2);
  const totalDriversAvailable = driverCount + (founderOperating ? 1 : 0);
  
  const hasDriver = totalDriversAvailable >= contract.requiredDrivers;
  if (!hasDriver) successChance = 0;

  const hasCapacity = vehicle ? vehicle.capacity >= contract.requiredCapacity : false;
  if (!hasCapacity) successChance = 0;

  const canAffordCost = company.companyCash >= operatingCost;
  if (!canAffordCost) successChance = 0;

  const rolled = Math.random() * 100;
  const success = rolled <= successChance;

  const conditionDrop = getConditionDrop(contract);
  
  let trustImpact = 'None';
  let reliabilityImpact = 'None';

  if (success) {
    const netPayment = bidAmount - operatingCost;
    company.companyCash += netPayment;
    
    const oldRel = company.reliability;
    company.reliability = improveReliability(company.reliability);
    if (oldRel !== company.reliability) reliabilityImpact = 'Improved';
    
    company.clientTrusts ??= {};
    const currentClientTrust = Number(company.clientTrusts[contract.issuerCompanyId] ?? 0);
    const newTrust = Math.min(100, Math.max(0, currentClientTrust + 10));
    company.clientTrusts[contract.issuerCompanyId] = newTrust;
    if (currentClientTrust !== newTrust) trustImpact = 'Improved';

    if (vIdx >= 0) {
      fleet[vIdx].condition = Math.max(0, fleet[vIdx].condition - conditionDrop);
      fleet[vIdx].assignedContractId = undefined;
      localStorage.setItem('worldr_fleet_v1', JSON.stringify(fleet));
    }
    contracts[cIdx].status = 'completed';
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
    
    const companyActiveContracts = company.activeContracts.filter(id => id !== contractId);
    company.activeContracts = companyActiveContracts;
    localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
    
    const recordText = `Completed "${contract.title}" successfully. Net profit: ${formatMoney(netPayment)}.`;
    addRecord(recordText, 'contract');
    
    let famIncrease = 5;
    if (contract.routeType === 'Local') famIncrease = 8;
    else if (contract.routeType === 'Local / Port') famIncrease = 6;
    else if (contract.routeType === 'Interstate') famIncrease = 5;
    updateRouteFamiliarity(company.id, contract.originState, contract.destinationState, famIncrease);
    
    saveContractHistory({
      id: `hist_${Date.now()}`, companyId: company.id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: 0,
      result: 'completed', trustImpact, reliabilityImpact, year: 290, month: 1, recordText
    });
    
    return { success: true, message: `Contract completed. Net payment: ${formatMoney(netPayment)}.`, netPayment };
  } else {
    company.companyCash -= contract.penalty;
    
    const oldRel = company.reliability;
    company.reliability = worsenReliability(company.reliability);
    if (oldRel !== company.reliability) reliabilityImpact = 'Decreased';
    
    company.clientTrusts ??= {};
    const currentClientTrust = Number(company.clientTrusts[contract.issuerCompanyId] ?? 0);
    const newTrust = Math.min(100, Math.max(0, currentClientTrust - 15));
    company.clientTrusts[contract.issuerCompanyId] = newTrust;
    if (currentClientTrust !== newTrust) trustImpact = 'Decreased';

    if (vIdx >= 0) {
      fleet[vIdx].assignedContractId = undefined;
      localStorage.setItem('worldr_fleet_v1', JSON.stringify(fleet));
    }
    contracts[cIdx].status = 'failed';
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
    
    const companyActiveContracts = company.activeContracts.filter(id => id !== contractId);
    company.activeContracts = companyActiveContracts;
    localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
    
    const reason = !vehicle ? 'No vehicle assigned' : !hasCapacity ? 'Vehicle capacity too low' : !hasDriver ? 'Driver shortage' : !canAffordCost ? 'Insufficient cash for ops' : 'Operational failure during transit';
    const recordText = `Failed "${contract.title}". Penalty: ${formatMoney(contract.penalty)}. Reason: ${reason}.`;
    addRecord(recordText, 'failure');
    
    saveContractHistory({
      id: `hist_${Date.now()}`, companyId: company.id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: contract.penalty,
      result: 'failed', trustImpact, reliabilityImpact, year: 290, month: 1, recordText
    });
    
    return { success: false, message: `Contract failed: ${reason}. Penalty: ${formatMoney(contract.penalty)}.` };
  }
}

function improveReliability(current: string): string {
  const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];
  const idx = scale.indexOf(current || 'Unproven');
  if (idx < 0 || idx >= scale.length - 1) return current;
  return scale[idx + 1];
}

function worsenReliability(current: string): string {
  const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];
  const idx = scale.indexOf(current || 'Unproven');
  if (idx <= 0) return 'Contract Breaker';
  return scale[idx - 1];
}

// ─── Legacy contract eval (kept for NPC simulation) ───────────────────────────
export function evaluateContractBids(contractId: string): { success: boolean; message: string; awardedTo?: string } {
  if (typeof window === 'undefined') return { success: false, message: 'No window object' };
  const contracts = getContracts();
  const contractIndex = contracts.findIndex(c => c.id === contractId);
  if (contractIndex === -1) return { success: false, message: 'Contract not found' };
  const contract = contracts[contractIndex];
  if (contract.status !== 'open') return { success: false, message: 'Contract not open' };
  if (contract.bids.length === 0) return { success: false, message: 'No bids to evaluate.' };
  let bestBid = contract.bids[0];
  for (const bid of contract.bids) {
    if (bid.amount < bestBid.amount) bestBid = bid;
  }
  const gameDate = getGameDate();
  contract.status = 'awarded';
  contract.awardedToCompanyId = bestBid.companyId;
  contract.startMonth = gameDate.worldMonth;
  contract.startYear = gameDate.worldYear;
      
  let dueM = gameDate.worldMonth + contract.durationMonths;
  let dueY = gameDate.worldYear;
  while(dueM > 12) { dueM -= 12; dueY += 1; }
  contract.dueMonth = dueM;
  contract.dueYear = dueY;

  addRecord(`Won contract bid: "${contract.title}".`, 'contract');
  contracts[contractIndex] = contract;
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
  return { success: true, message: `Awarded to ${bestBid.companyId} for ₯${bestBid.amount}`, awardedTo: bestBid.companyId };
}


// ─── Auto Operations ──────────────────────────────────────────────────────────
export type AutoOpPoolType = 'Local Delivery Pool' | 'Retail Restock Pool' | 'Port Shuttle Pool' | 'Farm Collection Pool' | 'Industrial Supply Pool' | 'Regional Freight Pool';

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
    return { success: true, message: `Vehicle assigned to ${poolType}.` };
  }
}

export function processMonthlyOperations(companyId: string): { success: boolean; message: string; report?: MonthlyReport } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[cIdx];

  const fleet = getFleet(companyId);
  const allContracts = getContracts();
  
  // 1. Validate active vehicle assignments
  const autoOpVehicles = fleet.filter(v => v.assignedAutoOpPool);
  
  const companyContracts = allContracts.filter(c => c.awardedToCompanyId === companyId);
  const activeContracts = companyContracts.filter(c => c.status === 'active' && c.assignedVehicleId);

  // Initialize fields
  if (!company.staff) company.staff = {} as Record<StaffRole, number>;
  if (!company.wagePolicy) company.wagePolicy = 'Standard';
  if (!company.maintenancePolicy) company.maintenancePolicy = 'Standard';
  if (company.morale === undefined) company.morale = 50;
  if (!company.clientTrusts) company.clientTrusts = {};

  const driverCount = company.staff['Driver'] || 0;
  const dispatcherCount = company.staff['Dispatcher'] || 0;
  const mechanicCount = company.staff['Mechanic Crew'] || 0;

  const founderOperating = (fleet.length === 1 && driverCount === 0 && fleet[0].capacity <= 2);
  const totalDriversAvailable = driverCount + (founderOperating ? 1 : 0);
  let driversUsed = 0;

  let contractRevenue = 0;
  let autoOperationsRevenue = 0;
  let contractOperatingCosts = 0;
  let autoOperationsCosts = 0;
  let penalties = 0;
  let fleetConditionChanges: string[] = [];
  let recordsCreated: string[] = [];
  
  const gameDate = getGameDate();
  const gameDateStr = formatGameDate(gameDate);

  // 2. Process active contracts
  activeContracts.forEach(contract => {
    if (driversUsed + contract.requiredDrivers > totalDriversAvailable) {
      penalties += contract.penalty;
      contract.status = 'failed';
      recordsCreated.push(`Contract Failed (No Driver): ${contract.title}. Penalty: ${formatMoney(contract.penalty)}`);
      
      saveLedgerEntry({
        id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
        gameDateStr, type: 'Penalties', description: `Failed contract: ${contract.title}`,
        incomeAmount: 0, expenseAmount: contract.penalty, balanceAfter: 0, timestamp: new Date().toISOString()
      });
      return;
    }
    
    driversUsed += contract.requiredDrivers;
    contractRevenue += contract.payment;
    contractOperatingCosts += contract.operatingCostEstimate;
    contract.status = 'completed';
    recordsCreated.push(`Contract Completed: ${contract.title}. Revenue: ${formatMoney(contract.payment)}`);
    
    updateRouteFamiliarity(companyId, contract.originState, contract.destinationState, 10);
    company.clientTrusts ??= {};
    const currentClientTrust = Number(company.clientTrusts[contract.issuerName] ?? 0);
    company.clientTrusts[contract.issuerName] = Math.min(100, Math.max(0, currentClientTrust + 10));

    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Contract Revenue', description: `Completed: ${contract.title}`,
      incomeAmount: contract.payment, expenseAmount: 0, balanceAfter: 0, timestamp: new Date().toISOString()
    });
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Contract Operating Costs' as any, description: `Op Costs: ${contract.title}`,
      incomeAmount: 0, expenseAmount: contract.operatingCostEstimate, balanceAfter: 0, timestamp: new Date().toISOString()
    });
    
    const vehicle = fleet.find(v => v.id === contract.assignedVehicleId);
    if (vehicle) {
      vehicle.assignedContractId = undefined;
      let wear = Math.floor(Math.random() * 4) + 1;
      if (mechanicCount > 0) wear = Math.max(1, wear - 1);
      if (company.maintenancePolicy === 'Minimal') wear = Math.floor(wear * 1.35);
      else if (company.maintenancePolicy === 'Preventive') wear = Math.floor(wear * 0.75);
      else if (company.maintenancePolicy === 'Premium') wear = Math.floor(wear * 0.55);
      const oldCond = vehicle.condition;
      vehicle.condition = Math.max(0, vehicle.condition - wear);
      fleetConditionChanges.push(`${vehicle.type} (Contract) condition: ${oldCond}% → ${vehicle.condition}%`);
      saveVehicle(vehicle);
    }
  });

  // 3. Process auto operations
  autoOpVehicles.forEach(v => {
    if (driversUsed >= totalDriversAvailable) {
      fleetConditionChanges.push(`${v.type} stayed idle (Driver Shortage)`);
      return;
    }
    driversUsed++;

    let baseRevenue = v.capacity * 8000;
    let opCost = v.capacity * 2000;

    if (v.assignedAutoOpPool === 'Local Delivery Pool') {
      baseRevenue = v.capacity * 18000;
      opCost = v.capacity * 4500;
    } else if (v.assignedAutoOpPool === 'Port Shuttle Pool') {
      baseRevenue = v.capacity * 28000;
      opCost = v.capacity * 8000;
    } else if (v.assignedAutoOpPool === 'Regional Freight Pool') {
      baseRevenue = v.capacity * 38000;
      opCost = v.capacity * 12000;
    }
    
    if (dispatcherCount > 0) baseRevenue *= 1.08;
    if ((company.morale || 50) >= 80) baseRevenue *= 1.05;
    else if ((company.morale || 50) <= 20) baseRevenue *= 0.92;
    
    autoOperationsRevenue += Math.floor(baseRevenue);
    autoOperationsCosts += opCost;
    
    let wear = Math.floor(Math.random() * 4) + 1;
    if (mechanicCount > 0) wear = Math.max(1, wear - 1);
    if (company.maintenancePolicy === 'Minimal') wear = Math.floor(wear * 1.35);
    else if (company.maintenancePolicy === 'Preventive') wear = Math.floor(wear * 0.75);
    else if (company.maintenancePolicy === 'Premium') wear = Math.floor(wear * 0.55);
    const oldCond = v.condition;
    v.condition = Math.max(0, v.condition - wear);
    fleetConditionChanges.push(`${v.type} (Auto) condition: ${oldCond}% → ${v.condition}%`);
    saveVehicle(v);
  });

  if (autoOperationsRevenue > 0) {
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Auto Operations Revenue', description: `Monthly auto operations`,
      incomeAmount: autoOperationsRevenue, expenseAmount: 0, balanceAfter: 0, timestamp: new Date().toISOString()
    });
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Auto Operations Costs' as any, description: `Auto operations costs`,
      incomeAmount: 0, expenseAmount: autoOperationsCosts, balanceAfter: 0, timestamp: new Date().toISOString()
    });
  }

  // 8. Deduct staff wages
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

  // 9. Calculate Vehicle Maintenance
  let vehicleMaintenanceExpense = 0;
  fleet.forEach(v => {
    let base = v.monthlyMaintenance || 0;
    if (company.maintenancePolicy === 'Minimal') base = Math.floor(base * 0.5);
    else if (company.maintenancePolicy === 'Preventive') base = Math.floor(base * 1.5);
    else if (company.maintenancePolicy === 'Premium') base = Math.floor(base * 2.0);
    vehicleMaintenanceExpense += base;
  });

  // 10. Calculate Facility Leases
  let facilityLeaseExpense = 0;
  if (company.facilities) {
    company.facilities.forEach(f => {
      facilityLeaseExpense += f.leaseCost || 0;
    });
  }

  // 11. Final Ledgers
  if (vehicleMaintenanceExpense > 0) {
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Vehicle Maintenance', description: `Monthly fleet maintenance`,
      incomeAmount: 0, expenseAmount: vehicleMaintenanceExpense, balanceAfter: 0, timestamp: new Date().toISOString()
    });
  }
  if (facilityLeaseExpense > 0) {
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Facility Leases', description: `Monthly facility leases`,
      incomeAmount: 0, expenseAmount: facilityLeaseExpense, balanceAfter: 0, timestamp: new Date().toISOString()
    });
  }
  if (payrollExpense > 0) {
    saveLedgerEntry({
      id: crypto.randomUUID(), companyId, gameMonth: gameDate.worldMonth, gameYear: gameDate.worldYear,
      gameDateStr, type: 'Staff Salaries', description: `Monthly payroll`,
      incomeAmount: 0, expenseAmount: payrollExpense, balanceAfter: 0, timestamp: new Date().toISOString()
    });
  }

  const totalRevenue = autoOperationsRevenue + contractRevenue;
  const totalOperatingCosts = autoOperationsCosts + contractOperatingCosts;
  const totalExpenses = totalOperatingCosts + vehicleMaintenanceExpense + facilityLeaseExpense + payrollExpense + penalties;
  const netProfit = totalRevenue - totalExpenses;

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
    autoRevenue: autoOperationsRevenue,
    manualRevenue: contractRevenue,
    operatingCosts: totalOperatingCosts,
    totalMaintenance: vehicleMaintenanceExpense,
    facilityLeaseExpense,
    payrollExpense,
    penalties,
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
  company.monthlyRevenue = totalRevenue;
  company.monthlyCosts = totalExpenses;
  company.profit = netProfit;

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  addRecord(`${company.name} closed month ${dateStr}. Net Result: ${formatMoney(netProfit)}.`);

  return { success: true, message: `Monthly operations processed successfully.`, report };
}

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

export function getRouteFamiliarityPercent(companyId: string, origin: string, dest: string): number {
  const routes = getRouteFamiliarity(companyId);
  const id = origin < dest ? `${origin}-${dest}` : `${dest}-${origin}`;
  const route = routes.find(r => r.id === id);
  return route?.familiarity ?? 0;
}

export function updateRouteFamiliarity(companyId: string, origin: string, dest: string, amount: number): RouteFamiliarity {
  if (typeof window === 'undefined') return { id: '', companyId, familiarity: 0 };
  const all: RouteFamiliarity[] = JSON.parse(localStorage.getItem('worldr_route_familiarity_v1') || '[]');
  const id = origin < dest ? `${origin}-${dest}` : `${dest}-${origin}`;
  let route = all.find(r => r.companyId === companyId && r.id === id);
  if (!route) {
    route = { id, companyId, familiarity: 0 };
    all.push(route);
  }
  route.familiarity = Math.min(100, Math.max(0, route.familiarity + amount));
  localStorage.setItem('worldr_route_familiarity_v1', JSON.stringify(all));
  return route;
}

export function acceptDirectContract(contractId: string, companyId: string, vehicleId: string): { success: boolean; message: string } {
  const contracts = getContracts();
  const cIdx = contracts.findIndex(c => c.id === contractId);
  if (cIdx < 0) return { success: false, message: 'Contract not found.' };
  if (contracts[cIdx].bidType !== 'Direct Accept') return { success: false, message: 'Not a direct accept contract.' };
  
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
  
  const gameDate = getGameDate();
  contracts[cIdx].startMonth = gameDate.worldMonth;
  contracts[cIdx].startYear = gameDate.worldYear;
  
  let dueM = gameDate.worldMonth + contracts[cIdx].durationMonths;
  let dueY = gameDate.worldYear;
  while(dueM > 12) { dueM -= 12; dueY += 1; }
  contracts[cIdx].dueMonth = dueM;
  contracts[cIdx].dueYear = dueY;

  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));

  addRecord(`Directly accepted "${contracts[cIdx].title}".`, 'contract');
  return { success: true, message: 'Contract directly accepted and vehicle assigned.' };
}

export function leaseFacility(
  companyId: string,
  type: Facility['type'],
  state: string,
  leaseCost: number
): { success: boolean; message: string } {
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[cIdx];

  // Initialize facilities if not present
  if (!company.facilities) company.facilities = [];

  if (company.companyCash < leaseCost) {
    return { success: false, message: `Insufficient company cash. Need ${formatMoney(leaseCost)} for first month's lease.` };
  }

  const facilityId = `fac_${Date.now()}`;
  const facility: Facility = {
    id: facilityId,
    type,
    state,
    leaseCost,
    leasedAt: formatGameDate()
  };

  company.companyCash -= leaseCost;
  company.facilities.push(facility);
  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  const prose = `${company.name} leased a ${type} in ${state} State for ${formatMoney(leaseCost)} per month.`;
  addRecord(prose, 'business');

  return { success: true, message: `Leased ${type} in ${state} State successfully. First month's payment of ${formatMoney(leaseCost)} deducted.` };
}


// ─── Capital Movement ────────────────────────────────────────────────────────
export function injectCapital(companyId: string, amount: number): { success: boolean; message: string; newPersonalCash?: number } {
  if (typeof window === 'undefined') return { success: false, message: 'Server env' };
  if (amount <= 0 || isNaN(amount)) return { success: false, message: 'Amount must be greater than zero.' };
  
  const cfStr = localStorage.getItem('worldr_citizen_file_v1');
  if (!cfStr) return { success: false, message: 'No citizen file found.' };
  const cf = JSON.parse(cfStr);
  const personalCash = cf.wealth ?? cf.personalMoney ?? 0;
  
  if (personalCash < amount) return { success: false, message: 'Cannot inject more than personal cash in hand.' };
  
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  cf.wealth = personalCash - amount;
  cf.personalMoney = personalCash - amount;
  localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(cf));
  
  companies[cIdx].companyCash += amount;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  const recordText = `Founder injected ${formatMoney(amount)} into ${companies[cIdx].name} as owner capital.`;
  addRecord(recordText, 'finance');
  
  return { success: true, message: `Injected ${formatMoney(amount)} into ${companies[cIdx].name} as owner capital.`, newPersonalCash: cf.wealth };
}

export function ownerDrawings(companyId: string, amount: number): { success: boolean; message: string; newPersonalCash?: number } {
  if (typeof window === 'undefined') return { success: false, message: 'Server env' };
  if (amount <= 0 || isNaN(amount)) return { success: false, message: 'Amount must be greater than zero.' };
  
  const cfStr = localStorage.getItem('worldr_citizen_file_v1');
  if (!cfStr) return { success: false, message: 'No citizen file found.' };
  const cf = JSON.parse(cfStr);
  const personalCash = cf.wealth ?? cf.personalMoney ?? 0;
  
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  if (companies[cIdx].companyCash < amount) return { success: false, message: 'Cannot withdraw more than company cash.' };
  
  companies[cIdx].companyCash -= amount;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
  
  cf.wealth = personalCash + amount;
  cf.personalMoney = personalCash + amount;
  localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(cf));
  
  const recordText = `Founder withdrew ${formatMoney(amount)} from ${companies[cIdx].name} as owner drawings.`;
  addRecord(recordText, 'finance');
  
  return { success: true, message: `Withdrew ${formatMoney(amount)} from ${companies[cIdx].name} as owner drawings.`, newPersonalCash: cf.wealth };
}
