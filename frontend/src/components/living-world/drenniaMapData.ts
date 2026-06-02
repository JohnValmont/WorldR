import type { DrenniaGameplayState, DrenniaRoomPin } from "../../components/maps/DrenniaMapSvg";

export const drenniaGameplayStates: Array<{
  id: DrenniaGameplayState;
  identity: string;
  mood: string;
  powerGroups: string[];
}> = [
  {
    id: "Drennport State",
    identity: "Capital politics, royal institutions, bureaucracy, universities, finance, and national media.",
    mood: "Civic politics active",
    powerGroups: ["Civic Order organizers", "civil service", "universities", "finance houses"]
  },
  {
    id: "Ironvale State",
    identity: "Factories, unions, industrial towns, manufacturing, and labour politics.",
    mood: "Workers organizing",
    powerGroups: ["unions", "factory managers", "labour organizers"]
  },
  {
    id: "Greenmere State",
    identity: "Rural communities, farms, local councils, religious/community power, and agriculture.",
    mood: "Community reputation matters",
    powerGroups: ["local councils", "farm networks", "community elders"]
  },
  {
    id: "Westport State",
    identity: "Ports, trade, companies, stock market, finance, exporters, and business patrons.",
    mood: "Business circles active",
    powerGroups: ["business patrons", "port managers", "trade houses"]
  }
];

export const drenniaRoomPins: DrenniaRoomPin[] = [
  { id: 'saltgate-trade-morning', title: 'Saltgate Trade Morning', state: 'Westport State', type: 'business', x: 185, y: 320, participants: 4, npc: 'Fen Arras Jr.' },
  { id: 'port-ledger-shift', title: 'Port Ledger Shift', state: 'Westport State', type: 'business', x: 155, y: 380, participants: 2, npc: 'Shift Supervisor' },
  { id: 'westport-business-circle', title: 'Westport Business Circle', state: 'Westport State', type: 'business', x: 225, y: 420, participants: 2, npc: 'Tira Vance' },
  { id: 'greenmere-market-day', title: 'Greenmere Market Day', state: 'Greenmere State', type: 'business', x: 490, y: 480, participants: 2, npc: 'Ysella Murn' },
  { id: 'ironvale-supplier-dispute', title: 'Ironvale Supplier Dispute', state: 'Ironvale State', type: 'business', x: 385, y: 185, participants: 2, npc: 'Director Kovath' },
  { id: 'drennport-finance-reception', title: 'Drennport Finance Reception', state: 'Drennport State', type: 'business', x: 720, y: 280, participants: 3, npc: 'Cassiel Vourne' },
];
