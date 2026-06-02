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
  { id: "drennport-youth-debate", title: "Drennport Youth Debate", state: "Drennport State", type: "debate", x: 735, y: 330, participants: 6, npc: "Mara Velden" },
  { id: "civic-order-local-meeting", title: "Civic Order Local Meeting", state: "Drennport State", type: "politics", x: 665, y: 260, participants: 4, npc: "Jonas Kest" },
  { id: "temporary-clerk-contract", title: "Temporary Clerk Contract", state: "Drennport State", type: "work", x: 805, y: 405, participants: 4, npc: "Harlan Graye" },
  { id: "workers-renewal-forum", title: "Workers’ Renewal Forum", state: "Ironvale State", type: "politics", x: 385, y: 165, participants: 5, npc: "Sera Dunne" },
  { id: "greenmere-water-dispute", title: "Greenmere Water Dispute", state: "Greenmere State", type: "community", x: 485, y: 470, participants: 5, npc: "Corin Vale" },
  { id: "westport-business-circle", title: "Westport Business Circle", state: "Westport State", type: "business", x: 220, y: 390, participants: 3, npc: "Elric Voss" }
];
