// ─── WORLDr Business Core System ──────────────────────────────────────────────
// Handles multiplayer-ready data for companies, contracts, bidding, and records.
// (Currently backed by localStorage for v1, designed for backend swap)

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

export interface ContractBid {
  companyId: string;
  amount: number;
  note: string;
  timestamp: string;
}

export interface Contract {
  id: string;
  issuerType: 'npc' | 'player';
  issuerCompanyId: string;
  issuerName: string;
  title: string;
  description: string;
  requiredSector: string;
  originState: string;
  destinationState: string;
  payment: number;
  deadlineDays: number;
  penalty: number;
  requiredCapacity: number;
  visibility: 'public' | 'private';
  status: 'open' | 'awarded' | 'completed' | 'failed';
  bids: ContractBid[];
  awardedToCompanyId?: string;
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
  if (index >= 0) {
    companies[index] = company;
  } else {
    companies.push(company);
  }
  localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));
}

export function getPlayerCompany(characterId: string): Company | undefined {
  return getCompanies().find(c => c.ownerCharacterId === characterId);
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
  if (index >= 0) {
    contracts[index] = contract;
  } else {
    contracts.push(contract);
  }
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));
}

// ─── NPC Data (for multiplayer feel) ──────────────────────────────────────────

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

export const STARTER_NPC_CONTRACTS: Contract[] = [
  {
    id: 'ctr-drennport-supplies', issuerType: 'npc', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'Drennport Office Supply Run', description: 'Need regular delivery of paper, ink, and binding materials from the warehouse district to our main retail front.',
    requiredSector: 'Retail & Consumer', originState: 'Drennport State', destinationState: 'Drennport State',
    payment: 120, deadlineDays: 2, penalty: 30, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-greenmere-produce', issuerType: 'npc', issuerCompanyId: 'npc-greenmere-fresh', issuerName: 'Greenmere Fresh Supply',
    title: 'Greenmere Produce Delivery', description: 'Transport of 2 tons of root vegetables to the Drennport outer markets before spoilage.',
    requiredSector: 'Shipping & Logistics', originState: 'Greenmere State', destinationState: 'Drennport State',
    payment: 160, deadlineDays: 3, penalty: 40, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-ironvale-parts', issuerType: 'npc', issuerCompanyId: 'npc-kovath', issuerName: 'Kovath Ironworks',
    title: 'Ironvale Parts Handling', description: 'Sorting and boxing of cast iron parts for railway shipment.',
    requiredSector: 'Manufacturing', originState: 'Ironvale State', destinationState: 'Ironvale State',
    payment: 190, deadlineDays: 3, penalty: 60, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-small-shop', issuerType: 'npc', issuerCompanyId: 'npc-crownbridge', issuerName: 'Crownbridge Retailers',
    title: 'Small Shop Restock', description: 'Restocking our secondary locations in the residential district.',
    requiredSector: 'Retail & Consumer', originState: 'Drennport State', destinationState: 'Drennport State',
    payment: 100, deadlineDays: 2, penalty: 20, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  },
  {
    id: 'ctr-farm-market', issuerType: 'npc', issuerCompanyId: 'npc-greenmere-fresh', issuerName: 'Greenmere Fresh Supply',
    title: 'Farm Market Supply', description: 'Setting up stalls and managing early morning produce drops.',
    requiredSector: 'Agriculture & Food', originState: 'Greenmere State', destinationState: 'Greenmere State',
    payment: 140, deadlineDays: 3, penalty: 35, requiredCapacity: 1, visibility: 'public', status: 'open', bids: [], createdAt: new Date().toISOString()
  }
];

export function initializeContractsIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const existing = getContracts();
  if (existing.length === 0) {
    localStorage.setItem('worldr_contracts_v1', JSON.stringify(STARTER_NPC_CONTRACTS));
  }
}
