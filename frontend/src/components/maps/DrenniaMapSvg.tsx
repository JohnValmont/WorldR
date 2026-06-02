import React from "react";

export type DrenniaGameplayState =
  | "Drennport State"
  | "Ironvale State"
  | "Greenmere State"
  | "Westport State";

export type DrenniaRoomPin = {
  id: string;
  title: string;
  state: DrenniaGameplayState;
  type: "politics" | "business" | "work" | "community" | "debate";
  x: number;
  y: number;
  participants?: number;
  npc?: string;
};

type Props = {
  selectedState?: DrenniaGameplayState | null;
  selectedRoomId?: string | null;
  roomPins?: DrenniaRoomPin[];
  onStateSelect?: (state: DrenniaGameplayState) => void;
  onRoomSelect?: (roomId: string) => void;
};

const STATE_META: Record<DrenniaGameplayState, { labelX: number; labelY: number; fill: string; stroke: string }> = {
  "Drennport State": { labelX: 725, labelY: 330, fill: "rgba(47, 112, 121, 0.52)", stroke: "rgba(214,179,95,0.34)" },
  "Ironvale State": { labelX: 430, labelY: 150, fill: "rgba(123, 98, 57, 0.46)", stroke: "rgba(214,179,95,0.26)" },
  "Greenmere State": { labelX: 445, labelY: 460, fill: "rgba(45, 103, 70, 0.48)", stroke: "rgba(214,179,95,0.24)" },
  "Westport State": { labelX: 205, labelY: 350, fill: "rgba(40, 112, 94, 0.42)", stroke: "rgba(214,179,95,0.22)" }
};

const FALLBACK_ROOM_PINS: DrenniaRoomPin[] = [
  { id: "drennport-youth-debate", title: "Drennport Youth Debate", state: "Drennport State", type: "debate", x: 735, y: 330, participants: 6, npc: "Mara Velden" },
  { id: "civic-order-local-meeting", title: "Civic Order Local Meeting", state: "Drennport State", type: "politics", x: 665, y: 260, participants: 4, npc: "Jonas Kest" },
  { id: "temporary-clerk-contract", title: "Temporary Clerk Contract", state: "Drennport State", type: "work", x: 805, y: 405, participants: 4, npc: "Harlan Graye" },
  { id: "workers-renewal-forum", title: "Workers’ Renewal Forum", state: "Ironvale State", type: "politics", x: 385, y: 165, participants: 5, npc: "Sera Dunne" },
  { id: "greenmere-water-dispute", title: "Greenmere Water Dispute", state: "Greenmere State", type: "community", x: 485, y: 470, participants: 5, npc: "Corin Vale" },
  { id: "westport-business-circle", title: "Westport Business Circle", state: "Westport State", type: "business", x: 220, y: 390, participants: 3, npc: "Elric Voss" }
];

function pinColor(type: DrenniaRoomPin["type"]) {
  switch (type) {
    case "politics": return "#D6B35F";
    case "business": return "#2AC58B";
    case "work": return "#6D8797";
    case "community": return "#B9853D";
    case "debate": return "#F4EBD6";
    default: return "#D6B35F";
  }
}

export function DrenniaMapSvg({
  selectedState = null,
  selectedRoomId = null,
  roomPins = FALLBACK_ROOM_PINS,
  onStateSelect,
  onRoomSelect
}: Props) {
  const countryPath = "M 448.6 279.5 L 411 295.5 L 345.9 282.7 L 253.4 282.7 L 208.9 295.5 L 143.8 289.1 L 106.2 308.4 L 68.5 356.6 L 89 424 L 61.6 462.6 L 75.3 494.7 L 133.6 517.2 L 157.5 562.2 L 229.5 542.9 L 256.8 559 L 321.9 542.9 L 274 494.7 L 308.2 465.8 L 260.3 411.2 L 270.5 369.4 L 339 350.2 L 448.6 382.3 L 482.9 411.2 L 616.4 427.3 L 633.6 440.1 L 753.4 436.9 L 804.8 420.8 L 832.2 398.3 L 856.2 398.3 L 873.3 379.1 L 869.9 340.5 L 887 324.5 L 893.8 279.5 L 931.5 260.2 L 938.4 208.8 L 904.1 186.3 L 904.1 154.2 L 856.2 128.5 L 832.2 131.7 L 794.5 102.8 L 780.8 106 L 753.4 73.9 L 722.6 80.3 L 684.9 57.8 L 623.3 61 L 609.6 70.7 L 565.1 70.7 L 547.9 89.9 L 500 96.4 L 517.1 138.1 L 411 215.2 L 448.6 279.5 Z";

  const stateRegions: Array<{ id: DrenniaGameplayState; d: string }> = [
    {
      id: "Westport State",
      d: "M 55 90 C 190 60 320 85 405 160 L 390 565 C 250 590 110 535 50 420 Z"
    },
    {
      id: "Ironvale State",
      d: "M 315 55 C 520 5 730 70 835 170 L 620 305 C 510 275 395 260 300 285 Z"
    },
    {
      id: "Greenmere State",
      d: "M 300 285 C 430 270 535 290 630 335 L 725 570 C 585 620 410 610 260 570 L 390 565 Z"
    },
    {
      id: "Drennport State",
      d: "M 620 305 L 835 170 C 960 230 990 390 895 520 C 845 590 785 600 725 570 Z"
    }
  ];

  return (
    <svg
      viewBox="0 0 1000 620"
      role="img"
      aria-label="Interactive map of Drennia"
      className="w-full h-full"
      style={{ display: "block", minHeight: 420 }}
    >
      <defs>
        <radialGradient id="drenniaSeaGlow" cx="62%" cy="34%" r="65%">
          <stop offset="0%" stopColor="#17302A" stopOpacity="0.85" />
          <stop offset="65%" stopColor="#08120F" stopOpacity="1" />
          <stop offset="100%" stopColor="#050B09" stopOpacity="1" />
        </radialGradient>

        <filter id="stateGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#D6B35F" floodOpacity="0.32" />
        </filter>

        <clipPath id="drenniaCountryClip">
          <path d={countryPath} />
        </clipPath>
      </defs>

      <rect width="1000" height="620" fill="url(#drenniaSeaGlow)" rx="28" />

      <g opacity="0.22">
        <path d="M 20 485 C 140 420 250 430 350 505 C 455 584 640 585 780 515 C 865 472 935 485 980 530" fill="none" stroke="#8BA49B" strokeWidth="2" strokeDasharray="8 14" />
        <path d="M 40 120 C 190 170 295 115 455 118 C 630 122 740 160 960 98" fill="none" stroke="#8BA49B" strokeWidth="1.5" strokeDasharray="6 16" />
      </g>

      <path d={countryPath} fill="rgba(244,235,214,0.05)" stroke="rgba(244,235,214,0.50)" strokeWidth="4" />

      <g clipPath="url(#drenniaCountryClip)">
        {stateRegions.map((region) => {
          const meta = STATE_META[region.id];
          const selected = selectedState === region.id;
          return (
            <g key={region.id}>
              <path
                d={region.d}
                fill={meta.fill}
                stroke={selected ? "#D6B35F" : meta.stroke}
                strokeWidth={selected ? 4 : 2}
                filter={selected ? "url(#stateGlow)" : undefined}
                onClick={() => onStateSelect?.(region.id)}
                style={{ cursor: "pointer", transition: "180ms ease" }}
              />
              <text
                x={meta.labelX}
                y={meta.labelY}
                textAnchor="middle"
                fill={selected ? "#F4EBD6" : "#D9CFB8"}
                fontSize="23"
                fontWeight="800"
                style={{ pointerEvents: "none", letterSpacing: "0.02em" }}
              >
                {region.id.replace(" State", "")}
              </text>
            </g>
          );
        })}
      </g>

      <path d={countryPath} fill="none" stroke="rgba(244,235,214,0.70)" strokeWidth="3" />

      <g aria-label="Capital marker Drennport">
        <circle cx="811.6" cy="323.3" r="9" fill="#D6B35F" stroke="#08120F" strokeWidth="4" />
        <circle cx="811.6" cy="323.3" r="18" fill="none" stroke="#D6B35F" strokeOpacity="0.32" strokeWidth="3" />
        <text x="833.6" y="311.3" fill="#F4EBD6" fontSize="19" fontWeight="800">Drennport</text>
        <text x="833.6" y="333.3" fill="#B9B09B" fontSize="12" letterSpacing="0.12em">CAPITAL</text>
      </g>

      {roomPins.map((pin) => {
        const color = pinColor(pin.type);
        const active = selectedRoomId === pin.id;
        return (
          <g
            key={pin.id}
            transform={`translate(${pin.x} ${pin.y})`}
            onClick={() => onRoomSelect?.(pin.id)}
            style={{ cursor: "pointer" }}
          >
            <circle r={active ? 17 : 14} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2">
              <animate attributeName="r" values="10;18;10" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r="6" fill={color} stroke="#07100D" strokeWidth="3" />
            <title>{`${pin.title} — ${pin.state} — ${pin.participants ?? 0} present${pin.npc ? ` · ${pin.npc} watching` : ""}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default DrenniaMapSvg;
