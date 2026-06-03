import { type Company } from '../lib/businessCore';

export const NPC_COMPANIES: Company[] = [
  {
    id: 'npc-crownbridge', ownerCharacterId: 'npc', ownerName: 'Thel Vance',
    name: 'Crownbridge Retailers', legalStructure: 'Corporation', state: 'Drennport State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 800000, monthlyRevenue: 250000, monthlyCosts: 200000, profit: 50000,
    capacity: 50, reputation: 'Established', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-kovath', ownerCharacterId: 'npc', ownerName: 'Director Kovath',
    name: 'Kovath Ironworks', legalStructure: 'Corporation', state: 'Ironvale State', sector: 'Manufacturing',
    registeredAt: new Date().toISOString(), companyCash: 1200000, monthlyRevenue: 400000, monthlyCosts: 320000, profit: 80000,
    capacity: 100, reputation: 'Established', reliability: 'Solid', debt: 100000, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-saltgate', ownerCharacterId: 'npc', ownerName: 'Fen Arras',
    name: 'Saltgate Counting House', legalStructure: 'Corporation', state: 'Westport State', sector: 'Port & Trade',
    registeredAt: new Date().toISOString(), companyCash: 2500000, monthlyRevenue: 150000, monthlyCosts: 50000, profit: 100000,
    capacity: 80, reputation: 'Known', reliability: 'Proven', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-drennport-bank', ownerCharacterId: 'npc', ownerName: 'State Board',
    name: 'Drennport Commercial Bank', legalStructure: 'Corporation', state: 'Drennport State', sector: 'Finance',
    registeredAt: new Date().toISOString(), companyCash: 50000000, monthlyRevenue: 1000000, monthlyCosts: 200000, profit: 800000,
    capacity: 200, reputation: 'Established', reliability: 'Ironclad', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-westport-dock', ownerCharacterId: 'npc', ownerName: 'State Authority',
    name: 'Westport Dock Authority', legalStructure: 'Corporation', state: 'Westport State', sector: 'Port / State-Owned Enterprise',
    registeredAt: new Date().toISOString(), companyCash: 10000000, monthlyRevenue: 500000, monthlyCosts: 400000, profit: 100000,
    capacity: 500, reputation: 'Established', reliability: 'Ironclad', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-greenmere-fresh', ownerCharacterId: 'npc', ownerName: 'Ysella Murn',
    name: 'Greenmere Fresh Supply', legalStructure: 'Corporation', state: 'Greenmere State', sector: 'Agriculture & Food',
    registeredAt: new Date().toISOString(), companyCash: 150000, monthlyRevenue: 60000, monthlyCosts: 40000, profit: 20000,
    capacity: 30, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-ironvale-machine', ownerCharacterId: 'npc', ownerName: 'Tarlok',
    name: 'Ironvale Machine Works', legalStructure: 'Corporation', state: 'Ironvale State', sector: 'Manufacturing',
    registeredAt: new Date().toISOString(), companyCash: 300000, monthlyRevenue: 120000, monthlyCosts: 90000, profit: 30000,
    capacity: 60, reputation: 'Known', reliability: 'Reliable', debt: 50000, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-drennia-rail', ownerCharacterId: 'npc', ownerName: 'State Authority',
    name: 'Drennia Rail Freight', legalStructure: 'Corporation', state: 'Drennport State', sector: 'Logistics / State-Owned Enterprise',
    registeredAt: new Date().toISOString(), companyCash: 25000000, monthlyRevenue: 800000, monthlyCosts: 700000, profit: 100000,
    capacity: 1000, reputation: 'Established', reliability: 'Ironclad', debt: 5000000, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  // Small local firms (for context / minor contract issuers)
  {
    id: 'npc-drennport-office', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Drennport Office Suppliers', legalStructure: 'Private Company', state: 'Drennport State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 20000, monthlyRevenue: 10000, monthlyCosts: 8000, profit: 2000,
    capacity: 5, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-greenmere-coop', ownerCharacterId: 'npc', ownerName: 'Farmers Board',
    name: 'Greenmere Farm Co-op', legalStructure: 'Private Company', state: 'Greenmere State', sector: 'Agriculture & Food',
    registeredAt: new Date().toISOString(), companyCash: 50000, monthlyRevenue: 20000, monthlyCosts: 18000, profit: 2000,
    capacity: 15, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-westport-guild', ownerCharacterId: 'npc', ownerName: 'Guild Master',
    name: 'Westport Warehouse Guild', legalStructure: 'Private Company', state: 'Westport State', sector: 'Shipping & Logistics',
    registeredAt: new Date().toISOString(), companyCash: 80000, monthlyRevenue: 40000, monthlyCosts: 35000, profit: 5000,
    capacity: 25, reputation: 'Local', reliability: 'Proven', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-ironvale-parts', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Ironvale Parts Depot', legalStructure: 'Private Company', state: 'Ironvale State', sector: 'Manufacturing',
    registeredAt: new Date().toISOString(), companyCash: 15000, monthlyRevenue: 8000, monthlyCosts: 7000, profit: 1000,
    capacity: 4, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-drennport-stationers', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Drennport Stationers', legalStructure: 'Private Company', state: 'Drennport State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 12000, monthlyRevenue: 6000, monthlyCosts: 5000, profit: 1000,
    capacity: 3, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-westport-fish', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Westport Fish Market Co.', legalStructure: 'Private Company', state: 'Westport State', sector: 'Agriculture & Food',
    registeredAt: new Date().toISOString(), companyCash: 30000, monthlyRevenue: 15000, monthlyCosts: 12000, profit: 3000,
    capacity: 8, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-greenmere-parish', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Greenmere Parish Traders', legalStructure: 'Private Company', state: 'Greenmere State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 10000, monthlyRevenue: 5000, monthlyCosts: 4000, profit: 1000,
    capacity: 2, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  },
  {
    id: 'npc-ironvale-tool', ownerCharacterId: 'npc', ownerName: 'Local Owner',
    name: 'Ironvale Tool Depot', legalStructure: 'Private Company', state: 'Ironvale State', sector: 'Retail & Consumer',
    registeredAt: new Date().toISOString(), companyCash: 18000, monthlyRevenue: 9000, monthlyCosts: 7500, profit: 1500,
    capacity: 4, reputation: 'Local', reliability: 'Reliable', debt: 0, status: 'Active', activeContracts: [], publicRecords: [], riskFlags: []
  }
];
