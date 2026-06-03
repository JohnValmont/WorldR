export interface NpcCompany {
  id: string;
  name: string;
  sector: string;
  state: string;
  type: 'NPC Corporation' | 'State-Owned Enterprise' | 'Local Business';
  canIssue: string;
  futureExchangeStatus: string;
}

export const NPC_COMPANIES: NpcCompany[] = [
  {
    id: 'npc-crownbridge',
    name: 'Crownbridge Retailers',
    sector: 'Retail & Consumer',
    state: 'Drennport State',
    type: 'NPC Corporation',
    canIssue: 'retail restock, office supply, delivery contracts',
    futureExchangeStatus: 'listable later',
  },
  {
    id: 'npc-kovath',
    name: 'Kovath Ironworks',
    sector: 'Manufacturing',
    state: 'Ironvale State',
    type: 'NPC Corporation',
    canIssue: 'parts handling, industrial freight contracts',
    futureExchangeStatus: 'listable later',
  },
  {
    id: 'npc-saltgate',
    name: 'Saltgate Counting House',
    sector: 'Port & Trade',
    state: 'Westport State',
    type: 'NPC Corporation',
    canIssue: 'port shuttle, dock transfer contracts',
    futureExchangeStatus: 'private NPC firm',
  },
  {
    id: 'npc-drennport-bank',
    name: 'Drennport Commercial Bank',
    sector: 'Finance',
    state: 'Drennport State',
    type: 'NPC Corporation',
    canIssue: 'finance documents/courier contracts later',
    futureExchangeStatus: 'listed later',
  },
  {
    id: 'npc-westport-dock',
    name: 'Westport Dock Authority',
    sector: 'Port & Trade', // SOE usually has sector but mapped to Port / State-Owned Enterprise
    state: 'Westport State',
    type: 'State-Owned Enterprise',
    canIssue: 'port contracts, dock logistics',
    futureExchangeStatus: 'SOE security later',
  },
  {
    id: 'npc-greenmere-fresh',
    name: 'Greenmere Fresh Supply',
    sector: 'Agriculture & Food',
    state: 'Greenmere State',
    type: 'NPC Corporation',
    canIssue: 'produce delivery, farm collection contracts',
    futureExchangeStatus: 'listable later',
  },
  {
    id: 'npc-ironvale-machine',
    name: 'Ironvale Machine Works',
    sector: 'Manufacturing',
    state: 'Ironvale State',
    type: 'NPC Corporation',
    canIssue: 'industrial parts and machinery movement',
    futureExchangeStatus: 'listable later',
  },
  {
    id: 'npc-drennia-rail',
    name: 'Drennia Rail Freight',
    sector: 'Shipping & Logistics',
    state: 'Drennport State',
    type: 'State-Owned Enterprise',
    canIssue: 'rail-adjacent freight contracts later',
    futureExchangeStatus: 'SOE security later',
  },
  // Small local firms
  { id: 'npc-drennport-office', name: 'Drennport Office Suppliers', sector: 'Retail & Consumer', state: 'Drennport State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-greenmere-coop', name: 'Greenmere Farm Co-op', sector: 'Agriculture & Food', state: 'Greenmere State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-westport-warehouse', name: 'Westport Warehouse Guild', sector: 'Port & Trade', state: 'Westport State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-ironvale-parts', name: 'Ironvale Parts Depot', sector: 'Manufacturing', state: 'Ironvale State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-drennport-stationers', name: 'Drennport Stationers', sector: 'Retail & Consumer', state: 'Drennport State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-westport-fish', name: 'Westport Fish Market Co.', sector: 'Agriculture & Food', state: 'Westport State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-greenmere-parish', name: 'Greenmere Parish Traders', sector: 'Agriculture & Food', state: 'Greenmere State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
  { id: 'npc-ironvale-tool', name: 'Ironvale Tool Depot', sector: 'Manufacturing', state: 'Ironvale State', type: 'Local Business', canIssue: '', futureExchangeStatus: '' },
];
