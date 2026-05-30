// ── Mock Registered Parties — Abbreviation Conflict Testing Only ──────────────
//
// Developer note: Temporary local uniqueness check.
// True global party abbreviation uniqueness must be enforced by
// backend/database before multiplayer launch.
//
// These entries are NOT shown as real party cards in the UI.
// They exist solely to test the abbreviation uniqueness validator.

export const MOCK_REGISTERED_ABBREVIATIONS: string[] = [
  'NRP',
  'LPU',
  'FCP',
];
