// ─── WORLDr Business Core System ──────────────────────────────────────────────
// v2: Added Vehicle, Fleet, Logistics contracts, vehicle-based bid evaluation.
// Still backed by localStorage for v1, designed for backend swap.

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
  if (company.companyCash < spec.cost) return { success: false, message: `Insufficient company cash. Need ₯${spec.cost.toLocaleString()}.` };
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
    purchasedAt: new Date().toISOString(),
  };
  saveVehicle(vehicle);
  return { success: true, message: `Purchased ${type} for ₯${spec.cost.toLocaleString()}.` };
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
  if (companies[cIdx].companyCash < cost) return { success: false, message: `Insufficient funds. Cost: ₯${cost.toLocaleString()}.` };
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

// ─── Contract ─────────────────────────────────────────────────────────────────
export interface Contract {
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
}

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
  saveContract({ ...contract, id: `ctr_${Date.now()}`, issuerType: 'player', status: 'open', bids: [], createdAt: new Date().toISOString() });
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
  const rec = { id: `rec_${Date.now()}`, type, summary, createdAt: new Date().toISOString() };
  const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
  localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));
}

// ─── Net Worth ────────────────────────────────────────────────────────────────
export function calcCompanyValue(company: Company): number {
  const fleet = getFleet(company.id);
  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  return company.companyCash + vehicleAssetValue;
}

export function calcNetWorth(playerCash: number, company: Company | null): number {
  if (!company) return playerCash;
  return playerCash + calcCompanyValue(company);
}

// ─── NPC Companies ────────────────────────────────────────────────────────────
export const NPC_COMPANIES: Company[] = [
  {
    id: 'npc-drennport-bank', ownerCharacterId: 'npc', ownerName: 'State Board',
    name: 'Drennport Commercial Bank', legalStructure: 'Corporation', state: 'Drennport State', sector: 'Finance',
    registeredAt: new Date().toISOString(), companyCash: 5000000, monthlyRevenue: 100000, monthlyCosts: 20000, profit: 80000,
    capacity: 100, reputation: 'Established', reliability: 'Ironclad', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-saltgate', ownerCharacterId: 'npc', ownerName: 'Fen Arras',
    name: 'Saltgate Counting House', legalStructure: 'Private Company', state: 'Westport State', sector: 'Finance / Trade Services',
    registeredAt: new Date().toISOString(), companyCash: 250000, monthlyRevenue: 15000, monthlyCosts: 5000, profit: 10000,
    capacity: 20, reputation: 'Known', reliability: 'Proven', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-kovath', ownerCharacterId: 'npc', ownerName: 'Director Kovath',
    name: 'Kovath Ironworks', legalStructure: 'Corporation', state: 'Ironvale State', sector: 'Manufacturing',
    registeredAt: new Date().toISOString(), companyCash: 120000, monthlyRevenue: 40000, monthlyCosts: 32000, profit: 8000,
    capacity: 50, reputation: 'Durable', reliability: 'Solid', debt: 100000, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-greenmere-fresh', ownerCharacterId: 'npc', ownerName: 'Ysella Murn',
    name: 'Greenmere Fresh Supply', legalStructure: 'Private Company', state: 'Greenmere State', sector: 'Agriculture & Food',
    registeredAt: new Date().toISOString(), companyCash: 15000, monthlyRevenue: 6000, monthlyCosts: 4000, profit: 2000,
    capacity: 10, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-crownbridge', ownerCharacterId: 'npc', ownerName: 'Thel Vance',
    name: 'Crownbridge Retailers', legalStructure: 'Private Company', state: 'Drennport State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 8000, monthlyRevenue: 2500, monthlyCosts: 2000, profit: 500,
    capacity: 5, reputation: 'New', reliability: 'Unproven', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  }
];

// ─── Starter Logistics Contracts (v1 — bigger money scale) ───────────────────
export const STARTER_LOGISTICS_CONTRACTS: Contract[] = [
  {
    id: 'ctr-drennport-office', issuerType: 'npc', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'Drennport Office Supply Run', description: 'Regular delivery of paper, ink, and binding materials from the warehouse district to our main retail front.',
    cargo: 'Office supplies',
    requiredSector: 'Shipping & Logistics', originState: 'Drennport State', destinationState: 'Drennport State',
    payment: 18000, deadlineDays: 1, penalty: 4000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-greenmere-produce', issuerType: 'npc', issuerCompanyId: 'npc-greenmere-fresh', issuerName: 'Greenmere Fresh Supply',
    title: 'Greenmere Produce Delivery', description: 'Transport 2 tons of root vegetables to Drennport outer markets before spoilage. Time-sensitive.',
    cargo: 'Produce',
    requiredSector: 'Shipping & Logistics', originState: 'Greenmere State', destinationState: 'Drennport State',
    payment: 42000, deadlineDays: 3, penalty: 10000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-ironvale-parts', issuerType: 'npc', issuerCompanyId: 'npc-kovath', issuerName: 'Kovath Ironworks',
    title: 'Ironvale Parts Handling', description: 'Sorting and boxing of cast iron parts for railway shipment. Requires 2-capacity vehicle.',
    cargo: 'Machine parts',
    requiredSector: 'Shipping & Logistics', originState: 'Ironvale State', destinationState: 'Drennport State',
    payment: 65000, deadlineDays: 3, penalty: 18000, requiredCapacity: 2, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-westport-dock', issuerType: 'npc', issuerCompanyId: 'npc-saltgate', issuerName: 'Saltgate Counting House',
    title: 'Westport Dock Transfer', description: 'Move import crates from the dock warehouse to the counting house bonded storage.',
    cargo: 'Import crates',
    requiredSector: 'Shipping & Logistics', originState: 'Westport State', destinationState: 'Westport State',
    payment: 25000, deadlineDays: 1, penalty: 6000, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-state-retail-restock', issuerType: 'npc', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'State Retail Restock', description: 'Deliver retail goods from Westport distribution centre to Drennport chain outlets.',
    cargo: 'Retail goods',
    requiredSector: 'Shipping & Logistics', originState: 'Westport State', destinationState: 'Drennport State',
    payment: 72000, deadlineDays: 4, penalty: 20000, requiredCapacity: 2, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
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
    bids: [...contract.bids, { companyId, amount: bidAmount, note: '', timestamp: new Date().toISOString() }],
    ...(accepted ? { awardedToCompanyId: companyId } : {}),
  };
  saveContract(updated);

  if (accepted) {
    addRecord(`Won "${contract.title}" with a bid of ₯${bidAmount.toLocaleString()}.`, 'contract');
  }

  return {
    accepted,
    message: accepted
      ? `Bid accepted. Your bid of ₯${bidAmount.toLocaleString()} was accepted for "${contract.title}".`
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
    addRecord(
      `Completed "${contract.title}" on time. Payment received: ₯${bidAmount.toLocaleString()}. Operating cost: ₯${operatingCost.toLocaleString()}.`,
      'contract'
    );
    return { success: true, message: `Contract completed. Net payment: ₯${netPayment.toLocaleString()} (₯${bidAmount.toLocaleString()} minus ₯${operatingCost.toLocaleString()} operating cost).`, netPayment };
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
    addRecord(`Failed to complete "${contract.title}". Penalty deducted: ₯${contract.penalty.toLocaleString()}. Reason: ${reason}.`, 'failure');
    return { success: false, message: `Contract failed — ${reason}. Penalty of ₯${contract.penalty.toLocaleString()} deducted.` };
  }
}

function improveReliability(current: string): string {
  const scale = ['Bad', 'Unproven', 'Unreliable', 'Reliable', 'Proven', 'Solid', 'Ironclad'];
  const idx = scale.indexOf(current);
  if (idx < 0 || idx >= scale.length - 1) return current;
  return scale[idx + 1];
}

function worsenReliability(current: string): string {
  const scale = ['Bad', 'Unproven', 'Unreliable', 'Reliable', 'Proven', 'Solid', 'Ironclad'];
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
