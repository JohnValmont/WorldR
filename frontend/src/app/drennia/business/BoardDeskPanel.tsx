"use client";

import React, { useState } from "react";
import { manufacturingApi } from "../../../lib/api";

// ─── Board positions definition ───────────────────────────────────────────────
const BOARD_POSITIONS = [
  {
    id: "ceo",
    title: "CEO",
    fullTitle: "Chief Executive Officer",
    icon: "👑",
    color: "#d4af37",
    description:
      "Leads the entire company. Sets vision, approves major strategy, and is ultimately responsible for all results. The owner of the company holds this seat by default.",
    responsibilities: [
      "Set company-wide strategic direction",
      "Approve major capital investments",
      "Represent the company externally",
      "Final sign-off on all C-suite decisions",
    ],
    hint: null,
  },
  {
    id: "cfo",
    title: "CFO",
    fullTitle: "Chief Financial Officer",
    icon: "💰",
    color: "#36d399",
    description:
      "Oversees all financial operations — cash flow, debt management, capital allocation, and financial reporting. Flags risks before they become crises.",
    responsibilities: [
      "Monitor and manage available cash & debt",
      "Approve ledger entries and expense categories",
      "Produce monthly financial health reports",
      "Identify and mitigate solvency risks",
    ],
    hint: "Coming soon — Finance automation",
  },
  {
    id: "coo",
    title: "COO",
    fullTitle: "Chief Operating Officer",
    icon: "⚙️",
    color: "#6ea8fe",
    description:
      "Responsible for smooth day-to-day operations: production efficiency, factory uptime, procurement scheduling, and workforce planning.",
    responsibilities: [
      "Oversee production line throughput & efficiency",
      "Coordinate procurement with production targets",
      "Manage factory maintenance schedules",
      "Ensure operational KPIs are met each arc",
    ],
    hint: "Coming soon — Operations automation",
  },
  {
    id: "cso",
    title: "CSO",
    fullTitle: "Chief Sales Officer",
    icon: "📊",
    color: "#f4b942",
    description:
      "Commands all sales and market allocation strategy. When activated, the CSO reads your Market Intelligence data each arc and automatically distributes both your upcoming production vehicles and existing inventory across markets — prioritising markets where your brand awareness is highest and demand is strongest.",
    responsibilities: [
      "Analyse market demand signals each arc",
      "Auto-allocate inventory to markets by demand score",
      "Adjust marketing tiers based on brand awareness",
      "Maximise revenue per unit across all active markets",
    ],
    highlight: true,
    hint: "Auto-allocation feature — in development",
    badge: "FLAGSHIP ROLE",
  },
  {
    id: "cmo",
    title: "CMO",
    fullTitle: "Chief Marketing Officer",
    icon: "📣",
    color: "#c084fc",
    description:
      "Owns brand strategy, awareness campaigns, and marketing tier decisions. Works alongside the CSO to ensure spending produces measurable awareness gains in target markets.",
    responsibilities: [
      "Set and optimise marketing tiers per market",
      "Track brand awareness & trust movement",
      "Approve advertising spend each arc",
      "Design seasonal or launch-specific campaigns",
    ],
    hint: "Coming soon — Marketing automation",
  },
  {
    id: "cto",
    title: "CTO",
    fullTitle: "Chief Technology Officer",
    icon: "🔬",
    color: "#38bdf8",
    description:
      "Drives the R&D pipeline. Prioritises which models enter development, allocates engineering budget, and ensures prototype quality gates are met.",
    responsibilities: [
      "Oversee vehicle model development pipeline",
      "Allocate engineering budgets by stage",
      "Approve technology and platform choices",
      "Track engineering culture and knowledge scores",
    ],
    hint: "Coming soon — R&D automation",
  },
  {
    id: "chro",
    title: "CHRO",
    fullTitle: "Chief Human Resources Officer",
    icon: "🧑‍💼",
    color: "#f87171",
    description:
      "Manages the workforce: hiring, firing, wage management, and ensuring the right roles are filled at the right levels to support production and sales goals.",
    responsibilities: [
      "Oversee headcount across all roles",
      "Recommend hiring adjustments based on production plans",
      "Manage wage budgets",
      "Ensure staffing ratios meet efficiency targets",
    ],
    hint: "Coming soon — HR automation",
  },
  {
    id: "cpo",
    title: "CPO",
    fullTitle: "Chief Procurement Officer",
    icon: "📦",
    color: "#fb923c",
    description:
      "Manages the entire supply chain: raw material sourcing, component purchasing, supplier negotiations, and keeping procurement costs in line with production needs.",
    responsibilities: [
      "Manage component and materials sourcing",
      "Optimise procurement spend each arc",
      "Identify supply chain bottlenecks",
      "Maintain procurement forecasts aligned with production",
    ],
    hint: "Coming soon — Procurement automation",
  },
];

// ─── Tiny status badge ────────────────────────────────────────────────────────
function StatusPill({ status, name }: { status: string, name?: string }) {
  if (status === "active") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(54,211,153,0.12)",
          border: "1px solid rgba(54,211,153,0.35)",
          color: "#36d399",
          fontSize: 10,
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderRadius: 4,
          padding: "3px 8px",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#36d399",
            display: "inline-block",
          }}
        />
        {name ? `Occupied — ${name}` : "Occupied"}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#666",
        fontSize: 9,
        fontFamily: "monospace",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        borderRadius: 4,
        padding: "2px 7px",
      }}
    >
      Vacant
    </span>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function BoardDeskPanel({ companyId, companyName, staff, onRefresh }: { companyId: string, companyName: string, staff: any[], onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>("cso");
  const [isHiring, setIsHiring] = useState(false);

  const getDeterministicName = (roleId: string) => {
    if (!companyId) return "Unknown";
    let seed = roleId.charCodeAt(0);
    for (let i = 0; i < companyId.length; i++) {
      seed += companyId.charCodeAt(i);
    }
    const firstNames = ["James", "Emma", "Oliver", "Sophia", "William", "Isabella", "Elias", "Mia", "Alexander", "Charlotte", "Julian", "Amelia", "Sebastian", "Harper", "Arthur", "Evelyn"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas"];
    const first = firstNames[seed % firstNames.length];
    const last = lastNames[(seed * 7) % lastNames.length];
    return `${first} ${last}`;
  };

  const handleHire = async (roleId: string) => {
    if (isHiring) return;
    setIsHiring(true);
    try {
      await manufacturingApi.hireStaff(companyId, roleId, 1);
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Failed to hire executive.');
    } finally {
      setIsHiring(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1e1e2a",
          paddingBottom: 16,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#d4af37",
            }}
          >
            📋 Board of Directors
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "#555",
              letterSpacing: "0.08em",
            }}
          >
            — {companyName}
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#777",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 680,
          }}
        >
          Your executive board governs every pillar of the company. Each C-Suite seat
          can eventually be filled to unlock automation for that domain. The{" "}
          <span style={{ color: "#f4b942", fontWeight: 700 }}>CSO</span> is the
          first seat with planned automation — auto-allocating inventory across
          markets based on live demand intelligence.
        </p>
      </div>

      {/* Position Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BOARD_POSITIONS.map((pos) => {
          const isOpen = expanded === pos.id;
          const isHighlight = pos.highlight;
          const isHired = pos.id === 'ceo' || (staff && staff.some((s: any) => s.role === pos.id && s.quantity > 0));
          const status = isHired ? "active" : "vacant";
          const execName = isHired && pos.id !== 'ceo' ? getDeterministicName(pos.id) : undefined;

          return (
            <div
              key={pos.id}
              style={{
                border: isHighlight
                  ? "1px solid rgba(244,185,66,0.4)"
                  : "1px solid #1e1e2a",
                borderRadius: 8,
                background: isHighlight
                  ? "linear-gradient(135deg, rgba(244,185,66,0.06) 0%, rgba(10,10,15,0.95) 60%)"
                  : "rgba(10,10,15,0.8)",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Card header (always visible) */}
              <button
                onClick={() => setExpanded(isOpen ? null : pos.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  padding: "14px 18px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {/* Icon bubble */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 8,
                    background: `${pos.color}18`,
                    border: `1px solid ${pos.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {pos.icon}
                </div>

                {/* Titles */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: pos.color,
                        fontFamily: "monospace",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {pos.title}
                    </span>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      {pos.fullTitle}
                    </span>
                    {pos.badge && (
                      <span
                        style={{
                          fontSize: 8,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          background: "rgba(244,185,66,0.15)",
                          border: "1px solid rgba(244,185,66,0.4)",
                          color: "#d4af37",
                          borderRadius: 4,
                          padding: "1px 6px",
                        }}
                      >
                        {pos.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusPill status={status} name={execName} />
                    {pos.hint && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#555",
                          fontStyle: "italic",
                        }}
                      >
                        {pos.hint}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <span
                  style={{
                    fontSize: 12,
                    color: "#444",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                >
                  ▾
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 18px 18px 74px",
                    borderTop: "1px solid #1a1a24",
                    paddingTop: 14,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "#aaa",
                      margin: "0 0 12px",
                      lineHeight: 1.65,
                    }}
                  >
                    {pos.description}
                  </p>

                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#555",
                      marginBottom: 8,
                    }}
                  >
                    Key Responsibilities
                  </div>

                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {pos.responsibilities.map((r, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        <span style={{ color: pos.color, flexShrink: 0, marginTop: 2 }}>›</span>
                        {r}
                      </li>
                    ))}
                  </ul>

                  {/* CSO — special "coming soon" action block */}
                  {pos.id === "cso" && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        background: "rgba(244,185,66,0.06)",
                        border: "1px solid rgba(244,185,66,0.25)",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>🤖</span>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#d4af37",
                            marginBottom: 3,
                          }}
                        >
                          Auto-Allocation Engine — In Development
                        </div>
                        <div style={{ fontSize: 11, color: "#777", lineHeight: 1.55 }}>
                          When the CSO is activated, they will read your Market
                          Intelligence each arc and automatically distribute both
                          your upcoming production units and existing inventory
                          across all markets, weighted by brand awareness, demand
                          strength, and existing market share. You will be able to
                          review and override the suggested allocation before it
                          is locked.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hire Action */}
                  {pos.id === "cso" && !isHired && (
                    <div style={{ marginTop: 16 }}>
                      <button
                        onClick={() => handleHire(pos.id)}
                        disabled={isHiring}
                        style={{
                          background: `linear-gradient(135deg, ${pos.color}10 0%, ${pos.color}20 100%)`,
                          color: pos.color,
                          border: `1px solid ${pos.color}50`,
                          padding: "6px 16px",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          fontWeight: 700,
                          cursor: isHiring ? "not-allowed" : "pointer",
                          borderRadius: "4px",
                          opacity: isHiring ? 0.7 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {isHiring ? "HIRING..." : `HIRE ${pos.title} — $35,000 / MONTH`}
                      </button>
                    </div>
                  )}

                  {/* All other vacant seats */}
                  {status === "vacant" && pos.id !== "cso" && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid #1e1e2a",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "#4a4a5a",
                        fontStyle: "italic",
                      }}
                    >
                      This seat is currently vacant. Automation features for this role are planned for a future update.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
