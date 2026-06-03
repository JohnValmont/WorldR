const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\lib\\businessCore.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add new Interfaces
const newInterfaces = `
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
  fleetMaintenance: number;
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
`;

// Inject right before Facilities
code = code.replace(/\/\/ ─── Facilities ───────────────────────────────────────────────────────────────/, newInterfaces + '\n// ─── Facilities ───────────────────────────────────────────────────────────────');

// 2. Update Company Interface
const companyInterfaceOld = `export interface Company {
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
}`;

const companyInterfaceNew = `export interface Company {
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
}`;

code = code.replace(companyInterfaceOld, companyInterfaceNew);

// 3. Update Contract Interface to add Required Staff
const contractInterfaceRegex = /export interface Contract \{[^]*?\}/;
let contractInterfaceStr = code.match(contractInterfaceRegex)[0];
contractInterfaceStr = contractInterfaceStr.replace(/  bids: ContractBid\[\];\r?\n/, `  bids: ContractBid[];\n  requiredCapacity?: number;\n  requiredDrivers?: number;\n  recommendedStaff?: string[];\n`);
code = code.replace(contractInterfaceRegex, contractInterfaceStr);

fs.writeFileSync(file, code);
console.log('Types injected');
