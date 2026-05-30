// ── Political Party Type Definitions ─────────────────────────────────────────

export type RegisteredPoliticalParty = {
  partyId: string;
  partyAbbreviation: string;
  partyName: string;
  partyDescription: string;
  partyLogoId: string;
  /** Array of selected ideology IDs (exactly 2, no opposites) */
  ideologyIds: string[];
  colorId: string;
  leaderName: string;
  createdAt: string;
};

export type PartyColor = {
  id: string;
  name: string;
  hex: string;
};

export type PartyLogoOption = {
  id: string;
  name: string;
};

export type Ideology = {
  id: string;
  name: string;
  description: string;
  /** Voter/social groups that generally view this ideology favorably */
  favorable: string;
  /** Voter/social groups that may view this ideology less favorably */
  lessFavorable: string;
};

export type IdeologyPair = {
  pairId: string;
  pairLabel: string;
  left: Ideology;
  right: Ideology;
};
