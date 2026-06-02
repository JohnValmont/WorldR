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

// ─── Contract Resolution Engine ───────────────────────────────────────────────

export function evaluateContractBids(contractId: string): { success: boolean; message: string; awardedTo?: string } {
  if (typeof window === 'undefined') return { success: false, message: 'No window object' };

  const contracts = getContracts();
  const contractIndex = contracts.findIndex(c => c.id === contractId);
  if (contractIndex === -1) return { success: false, message: 'Contract not found' };

  const contract = contracts[contractIndex];
  if (contract.status !== 'open') return { success: false, message: 'Contract is not open for bids' };

  const companies = getCompanies();
  const allCompanies = [...companies, ...NPC_COMPANIES];

  // If no bids, simulate some NPC bids if it's an NPC issuer
  if (contract.bids.length === 0 && contract.issuerType === 'npc') {
    // Pick 1-2 random NPC companies that match the sector
    const matchingNPCs = NPC_COMPANIES.filter(c => c.sector === contract.requiredSector && c.id !== contract.issuerCompanyId);
    if (matchingNPCs.length > 0) {
      const numBids = Math.floor(Math.random() * 2) + 1; // 1 or 2 bids
      for (let i = 0; i < Math.min(numBids, matchingNPCs.length); i++) {
        const npc = matchingNPCs[i];
        // NPC bids somewhere between 80% and 100% of max payment
        const bidAmount = Math.floor(contract.payment * (0.8 + Math.random() * 0.2));
        contract.bids.push({
          companyId: npc.id,
          amount: bidAmount,
          note: 'Standard market rate.',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  if (contract.bids.length === 0) {
    return { success: false, message: 'No bids to evaluate.' };
  }

  // Score each bid
  let bestBid: ContractBid | null = null;
  let bestScore = -9999;

  for (const bid of contract.bids) {
    const bidder = allCompanies.find(c => c.id === bid.companyId);
    if (!bidder) continue;

    let score = 0;

    // Base score is based on how much lower the bid is than the max payment
    // Every 10% below max gives +10 points
    const discountPercent = (contract.payment - bid.amount) / contract.payment;
    score += discountPercent * 100;

    // Sector match is critical
    if (bidder.sector === contract.requiredSector) {
      score += 50;
    } else {
      score -= 100; // Heavy penalty for wrong sector
    }

    // Capacity check
    if (bidder.capacity >= contract.requiredCapacity) {
      score += 20;
    } else {
      score -= 50; // Penalty for insufficient capacity
    }

    // Reputation bonus
    if (bidder.reputation === 'Established') score += 30;
    else if (bidder.reputation === 'Known' || bidder.reputation === 'Local') score += 15;
    else if (bidder.reputation === 'New') score += 0;

    // Reliability bonus
    if (bidder.reliability === 'Ironclad') score += 30;
    else if (bidder.reliability === 'Proven') score += 20;
    else if (bidder.reliability === 'Reliable') score += 10;
    else if (bidder.reliability === 'Unproven') score += 0;

    // Add some random variance (0 to 20 points)
    score += Math.floor(Math.random() * 20);

    if (score > bestScore) {
      bestScore = score;
      bestBid = bid;
    }
  }

  if (!bestBid) {
    return { success: false, message: 'Could not determine a winner.' };
  }

  // Award the contract
  contract.status = 'awarded';
  contract.awardedToCompanyId = bestBid.companyId;

  // Save contract
  contracts[contractIndex] = contract;
  localStorage.setItem('worldr_contracts_v1', JSON.stringify(contracts));

  // Update company if it's a player company
  const winningCompanyIndex = companies.findIndex(c => c.id === bestBid!.companyId);
  if (winningCompanyIndex !== -1) {
    const winningCompany = companies[winningCompanyIndex];
    if (!winningCompany.activeContracts.includes(contract.id)) {
      winningCompany.activeContracts.push(contract.id);
      companies[winningCompanyIndex] = winningCompany;
      localStorage.setItem('worldr_companies_v1', JSON.stringify(companies));

      // Create a record for the player
      const rec = {
        id: `rec_awarded_${Date.now()}`, type: 'contract',
        summary: `Awarded contract "${contract.title}" issued by ${contract.issuerName} for ₯${bestBid.amount}.`,
        createdAt: new Date().toISOString()
      };
      const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
      localStorage.setItem('worldr_records_v1', JSON.stringify([rec, ...recs]));
    }
  }

  const winnerName = allCompanies.find(c => c.id === bestBid!.companyId)?.name || 'Unknown Company';

  return { 
    success: true, 
    message: `Contract awarded to ${winnerName} for ₯${bestBid.amount}.`,
    awardedTo: bestBid.companyId
  };
}

