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


// ─── Staff & Policies ────────────────────────────────────────────────────────
export type StaffRole = 'Driver' | 'Dispatcher' | 'Mechanic Crew' | 'Warehouse Worker' | 'Admin Clerk' | 'Operations Manager';

export const STAFF_WAGES: Record<StaffRole, number> = {
  'Driver': 18000,
  'Dispatcher': 28000,
  'Mechanic Crew': 30000,
  'Warehouse Worker': 22000,
  'Admin Clerk': 20000,
  'Operations Manager': 50000
};

export type WagePolicy = 'Low' | 'Standard' | 'Generous' | 'Premium';
export type MaintenancePolicy = 'Minimal' | 'Standard' | 'Preventive' | 'Premium';
export type ContractStrategy = 'Safe Local' | 'Balanced Freight' | 'Aggressive Growth';
export type CashReservePolicy = 'Conservative' | 'Growth' | 'Aggressive';

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
export interface Company {
  id: string;
  ownerCharacterId: string;
  ownerName: string;
  name: string;
  legalStructure: 'Sole Trader' | 'Private Company' | 'Corporation';
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
  operatingModel?: 'Local Courier Operator' | 'Port Shuttle Operator' | 'Interstate Freight Beginner' | 'Industrial Parts Carrier';
  
  // v8 Additions
  staff?: Record<StaffRole, number>;
  wagePolicy?: WagePolicy;
  maintenancePolicy?: MaintenancePolicy;
  contractStrategy?: ContractStrategy;
  cashReservePolicy?: CashReservePolicy;
  morale?: number; // 0 to 100
  clientTrusts?: Record<string, string>; // issuerId -> trust label
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

// Fleet management
export function getFleet(companyId: string): Vehicle[] {
  if (typeof window === 'undefined') return [];
  const all: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  return all.filter(v => v.companyId === companyId);
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

export interface Contract {
  id: string;
  issuerType: 'Government' | 'State-Owned Enterprise' | 'NPC Corporation' | 'Local Business' | 'Private Client' | 'Player Company';
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
  requiredDrivers?: number;
  recommendedStaff?: string[];
  awardedToCompanyId?: string;
  assignedVehicleId?: string;
  createdAt: string;
}

// ─── Owner Capital Movement ──────────────────────────────────────────────────


// ─── Company Management ───────────────────────────────────────────────────────
export function getCompanies(): Company[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
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

  const fleet = getFleet(companyId).filter(v => !v.assignedContractId);
  const suitableVehicle = fleet.find(v => v.capacity >= contract.requiredCapacity);

  let score = 0;
  if (company.sector === contract.requiredSector) score += 3;
  if (suitableVehicle) {
    score += 2;
    if (suitableVehicle.condition > 60) score += 1;
  } else {
    score -= 2;
  }
  if (bidAmount <= contract.payment) score += 2;
  if (company.reliability === 'Proven' || company.reliability === 'Reliable' || company.reliability === 'Ironclad') score += 1;
  if (company.reliability === 'Bad' || company.reliability === 'Failing') score -= 2;

  const accepted = score >= 4;
  const updated = {
    ...contract,
    status: accepted ? ('awarded' as const) : ('open' as const),
    bids: [...contract.bids, { companyId, amount: bidAmount, note: '', timestamp: formatGameDate() }],
    ...(accepted ? { awardedToCompanyId: companyId } : {}),
  };
  saveContract(updated);

  if (accepted) {
    addRecord(`Won "${contract.title}" with a bid of \${formatMoney(bidAmount)}.`, 'contract');
  }

  return {
    accepted,
    message: accepted
      ? `Bid accepted. Your bid of \${formatMoney(bidAmount)} was accepted for "${contract.title}".`
      : `Bid rejected. Score ${score}/10 — improve capacity, reliability, or bid lower.`,
  };
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

  const fleet: Vehicle[] = JSON.parse(localStorage.getItem('worldr_fleet_v1') || '[]');
  const vIdx = contract.assignedVehicleId ? fleet.findIndex(v => v.id === contract.assignedVehicleId) : -1;
  const vehicle = vIdx >= 0 ? fleet[vIdx] : undefined;

  const bid = contract.bids.find(b => b.companyId === contract.awardedToCompanyId);
  const bidAmount = bid?.amount ?? contract.payment;

  const operatingRate = getOperatingCostRate(contract);
  const operatingCost = Math.round(bidAmount * operatingRate);

  // Failure conditions
  const hasVehicle = !!vehicle;
  const hasCapacity = vehicle ? vehicle.capacity >= contract.requiredCapacity : false;
  const goodCondition = vehicle ? vehicle.condition > 40 : false;
  const canAffordCost = companies[compIdx].companyCash >= operatingCost;

  const success = hasVehicle && hasCapacity && goodCondition && canAffordCost;

  const conditionDrop = getConditionDrop(contract);

  if (success) {
    const netPayment = bidAmount - operatingCost;
    companies[compIdx].companyCash += netPayment;
    companies[compIdx].reliability = improveReliability(companies[compIdx].reliability);
    // Update vehicle condition
    if (vIdx >= 0) {
      fleet[vIdx].condition = Math.max(0, fleet[vIdx].condition - conditionDrop);
      fleet[vIdx].assignedContractId = undefined;
      localStorage.setItem('worldr_fleet_v1', JSON.stringify(fleet));
    }
    contracts[cIdx].status = 'completed';
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
    localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
    const companyActiveContracts = companies[compIdx].activeContracts.filter(id => id !== contractId);
    companies[compIdx].activeContracts = companyActiveContracts;
    localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
    
    const recordText = `Completed "${contract.title}" on time. Payment received: ${formatMoney(bidAmount)}. Operating cost: ${formatMoney(operatingCost)}.`;
    addRecord(recordText, 'contract');
    increaseRouteFamiliarity(companies[compIdx].id, contract.originState, contract.destinationState, 5);
    
    saveContractHistory({
      id: `hist_${Date.now()}`, companyId: companies[compIdx].id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: 0,
      result: 'completed', year: 290, month: 1, recordText
    });
    
    return { success: true, message: `Contract completed. Net payment: ${formatMoney(netPayment)} (${formatMoney(bidAmount)} minus ${formatMoney(operatingCost)} operating cost).`, netPayment };
  } else {
    companies[compIdx].companyCash -= contract.penalty;
    companies[compIdx].reliability = worsenReliability(companies[compIdx].reliability);
    if (vIdx >= 0) {
      fleet[vIdx].assignedContractId = undefined;
      localStorage.setItem('worldr_fleet_v1', JSON.stringify(fleet));
    }
    contracts[cIdx].status = 'failed';
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
    localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
    const reason = !hasVehicle ? 'no vehicle assigned' : !hasCapacity ? 'vehicle capacity too low' : !goodCondition ? 'vehicle condition too low' : 'insufficient cash for operating cost';
    const recordText = `Failed to complete "${contract.title}". Penalty deducted: ${formatMoney(contract.penalty)}. Reason: ${reason}.`;
    addRecord(recordText, 'failure');
    
    saveContractHistory({
      id: `hist_${Date.now()}`, companyId: companies[compIdx].id, title: contract.title, issuer: contract.issuerName, issuerType: contract.issuerType,
      cargo: contract.cargo, originState: contract.originState, destinationState: contract.destinationState,
      vehicleId: vehicle?.id || '', vehicleName: vehicle?.type || 'Unknown', payment: bidAmount, operatingCost, penalty: contract.penalty,
      result: 'failed', year: 290, month: 1, recordText
    });
    
    return { success: false, message: `Contract failed — ${reason}. Penalty of ${formatMoney(contract.penalty)} deducted.` };
  }
}

function improveReliability(current: string): string {
  const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];
  const idx = scale.indexOf(current);
  if (idx < 0 || idx >= scale.length - 1) return current;
  return scale[idx + 1];
}

function worsenReliability(current: string): string {
  const scale = ['Contract Breaker', 'Late Delivery Record', 'Unproven', 'First Delivery Completed', 'Reliable', 'Preferred Carrier'];
  const idx = scale.indexOf(current);
  if (idx <= 0) return 'Bad';
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
  contract.status = 'awarded';
  contract.awardedToCompanyId = bestBid.companyId;
  contracts[contractIndex] = contract;
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
  return { success: true, message: `Awarded to ${bestBid.companyId} for ₯${bestBid.amount}`, awardedTo: bestBid.companyId };
}


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
    return { success: true, message: `Vehicle assigned to ${poolType}.` };
  }
}


export function hireStaff(companyId: string, role: StaffRole, playerCashRef: { cash: number }): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  const company = companies[cIdx];
  if (!company.staff) company.staff = {} as Record<StaffRole, number>;
  
  const baseWage = STAFF_WAGES[role];
  if (company.companyCash < baseWage) {
    return { success: false, message: `Insufficient company cash to hire ${role}. Need ${formatMoney(baseWage)} for first month's wage.` };
  }

  company.companyCash -= baseWage;
  company.staff[role] = (company.staff[role] || 0) + 1;
  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  addRecord(`${company.name} hired 1 ${role}. Monthly payroll increased by ${formatMoney(baseWage)}.`);

  return { success: true, message: `Successfully hired 1 ${role}.` };
}

export function fireStaff(companyId: string, role: StaffRole): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  
  const company = companies[cIdx];
  if (!company.staff || !company.staff[role] || company.staff[role] === 0) {
    return { success: false, message: `No ${role}s to dismiss.` };
  }

  company.staff[role] -= 1;
  
  // Decrease morale slightly
  company.morale = Math.max(0, (company.morale || 50) - 2);

  companies[cIdx] = company;
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

  addRecord(`${company.name} dismissed 1 ${role}. Payroll decreased, but staff morale weakened.`);

  return { success: true, message: `Successfully dismissed 1 ${role}.` };
}

export function processMonthlyOperations(companyId: string): { success: boolean; message: string; report?: MonthlyReport } {
  if (typeof window === 'undefined') return { success: false, message: 'Server environment' };
  const companies = getCompanies();
  const cIdx = companies.findIndex(c => c.id === companyId);
  if (cIdx < 0) return { success: false, message: 'Company not found.' };
  const company = companies[cIdx];

  const fleet = getFleet(companyId);
  
  if (fleet.length === 0) {
    return { success: false, message: 'No fleet available. Purchase or order a vehicle through Procurement before running logistics operations.' };
  }

  const hasAssigned = fleet.some(v => v.assignedAutoOpPool || v.assignedContractId);
  if (!hasAssigned) {
    return { success: false, message: 'Your fleet is idle. Assign a vehicle to an auto operation or contract before dispatching.' };
  }
  
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
      fleetConditionChanges.push(`${v.type} stayed idle (Driver Shortage)`);
      return; // Skip if no driver
    }
    driversUsed++;

    let baseRevenue = v.capacity * 8000;
    
    // Dispatcher Bonus
    if (dispatcherCount > 0) baseRevenue *= 1.08;
    
    // Morale Bonus
    if ((company.morale || 50) >= 80) baseRevenue *= 1.05;
    else if ((company.morale || 50) <= 20) baseRevenue *= 0.92;

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
    fleetConditionChanges.push(`${v.type} condition: ${oldCond}% → ${v.condition}%`);
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

  const netProfit = autoRevenue - operatingCosts - totalMaintenance - facilityLeaseExpense - payrollExpense;

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
    totalMaintenance: totalMaintenance,
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
  
  addRecord(`${company.name} closed month ${dateStr}. Net Result: ${formatMoney(netProfit)}.`);

  return { success: true, message: `Monthly operations processed. Net result: ${formatMoney(netProfit)}`, report };
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

export function increaseRouteFamiliarity(companyId: string, origin: string, dest: string, amount: number) {
  if (typeof window === 'undefined') return;
  const all: RouteFamiliarity[] = JSON.parse(localStorage.getItem('worldr_route_familiarity_v1') || '[]');
  const id = origin < dest ? `${origin}-${dest}` : `${dest}-${origin}`;
  let route = all.find(r => r.companyId === companyId && r.id === id);
  if (!route) {
    route = { id, companyId, familiarity: 0 };
    all.push(route);
  }
  route.familiarity = Math.min(100, route.familiarity + amount);
  localStorage.setItem('worldr_route_familiarity_v1', JSON.stringify(all));
}

export function acceptDirectContract(contractId: string, companyId: string, vehicleId: string): { success: boolean; message: string } {
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
