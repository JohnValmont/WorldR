/**
 * Administrations — pure rules (docs/NATIONS_SIMULATION.md, "Administrations").
 * Who governs a nation right now, what that government is called, and how the
 * nation changed while it was in office. No database access here.
 */
import { CARETAKER_SUFFIX, ELECTED_SUFFIX, TERM_ORDINALS } from '../constants/administrations';

export type AdministrationKind = 'elected' | 'caretaker';

export interface AdministrationIdentity {
  kind: AdministrationKind;
  headName: string;
  headTitle: string;
  headCharacterId: string | null;
  partyId: string | null;
  partyName: string | null;
  partyColor: string | null;
  /** Other governing parties, by name (the lead party is not repeated). */
  coalition: string[];
}

/** The nation's numbers at one moment. Display only. */
export interface AdministrationSnapshot {
  arc: number;
  rating: number | null;
  tier: string | null;
  gdpYearly: number | null;
  unemployment: number | null;
  population: number | null;
  debt: number | null;
  approval: number | null;
}

const ROMAN = /^[IVXLCDM]+$/;

/**
 * The name a government is known by: the head's family name ("John Dumb" -> "Dumb").
 * Regnal names keep the numeral ("Aldric IV"), and one-word names are used whole.
 */
export function familyName(fullName: string): string {
  const words = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Unnamed';
  if (words.length === 1) return words[0];
  const last = words[words.length - 1];
  if (ROMAN.test(last)) return words.slice(-2).join(' ');
  return last;
}

/** "First", "Second"... then "11th", "12th". */
export function termOrdinal(n: number): string {
  if (n >= 1 && n <= TERM_ORDINALS.length) return TERM_ORDINALS[n - 1];
  const v = Math.max(1, Math.round(n));
  const tail = v % 100 >= 11 && v % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[v % 10] ?? 'th';
  return `${v}${tail}`;
}

/**
 * "Dumb Administration", "Second Dumb Administration", "Ostrin Caretaker Government".
 * termNumber counts this head's separate governments of the same kind, this one included.
 */
export function administrationName(kind: AdministrationKind, headName: string, termNumber = 1): string {
  const base = `${familyName(headName)} ${kind === 'caretaker' ? CARETAKER_SUFFIX : ELECTED_SUFFIX}`;
  return termNumber > 1 ? `${termOrdinal(termNumber)} ${base}` : base;
}

/**
 * Who governs. A government that commands Parliament (a lead party in a formed
 * or minority coalition) is led by its head of government. Otherwise the head
 * of state leads a caretaker government until one forms.
 */
export function resolveAdministration(input: {
  headOfState: { title: string; name: string };
  headOfGovernmentTitle: string;
  leadParty: { id: string; name: string; color: string | null; npcLeader: string | null } | null;
  premier: { characterId: string | null; name: string | null } | null;
  coalitionPartyNames: string[];
}): AdministrationIdentity {
  const lead = input.leadParty;
  const headName = lead ? (input.premier?.name || lead.npcLeader || null) : null;
  if (!lead || !headName) {
    return {
      kind: 'caretaker', headName: input.headOfState.name, headTitle: input.headOfState.title, headCharacterId: null,
      partyId: null, partyName: null, partyColor: null, coalition: [],
    };
  }
  return {
    kind: 'elected', headName, headTitle: input.headOfGovernmentTitle, headCharacterId: input.premier?.characterId ?? null,
    partyId: lead.id, partyName: lead.name, partyColor: lead.color,
    coalition: input.coalitionPartyNames.filter(n => n !== lead.name),
  };
}

/** Same government? A new head, a new lead party or a change of kind starts a new administration. */
export function sameAdministration(a: Pick<AdministrationIdentity, 'kind' | 'headName' | 'headCharacterId' | 'partyId'>,
  b: Pick<AdministrationIdentity, 'kind' | 'headName' | 'headCharacterId' | 'partyId'>): boolean {
  if (a.kind !== b.kind) return false;
  if ((a.partyId ?? null) !== (b.partyId ?? null)) return false;
  if (a.headCharacterId || b.headCharacterId) return a.headCharacterId === b.headCharacterId;
  return a.headName === b.headName;
}

export interface AdministrationChange {
  rating: number | null;
  gdpGrowth: number | null;
  unemployment: number | null;
  population: number | null;
  debt: number | null;
  approval: number | null;
}

const diff = (a: number | null, b: number | null) => (a == null || b == null ? null : b - a);

/**
 * How the nation changed between two snapshots: rating points, GDP growth (a
 * fraction, 0.05 = +5%), unemployment (fraction points), population, debt and
 * approval points.
 */
export function administrationChange(start: AdministrationSnapshot, end: AdministrationSnapshot): AdministrationChange {
  return {
    rating: diff(start.rating, end.rating),
    gdpGrowth: start.gdpYearly && end.gdpYearly != null ? end.gdpYearly / start.gdpYearly - 1 : null,
    unemployment: diff(start.unemployment, end.unemployment),
    population: diff(start.population, end.population),
    debt: diff(start.debt, end.debt),
    approval: diff(start.approval, end.approval),
  };
}

/** Whole months in office: an administration that took office this month has served 0. */
export function monthsInOffice(startArc: number, endArc: number | null, currentArc: number): number {
  return Math.max(0, (endArc ?? currentArc) - startArc);
}

/**
 * When the next election is, for screens. During formation the next election
 * belongs to the next term, so it is an estimate until the new term starts.
 */
export function electionOutlook(input: {
  arc: number;
  phase: string;
  pollingArc: number;
  formationEndArc: number;
  termMonths: number;
  firstTermCut: number;
}): { phase: string; electionArc: number; monthsToElection: number; estimated: boolean; formationEndArc: number | null } {
  if (input.phase === 'formation' || input.arc > input.pollingArc) {
    const next = input.pollingArc + input.termMonths - input.firstTermCut;
    return { phase: 'formation', electionArc: next, monthsToElection: Math.max(0, next - input.arc), estimated: true, formationEndArc: input.formationEndArc };
  }
  return { phase: input.phase, electionArc: input.pollingArc, monthsToElection: Math.max(0, input.pollingArc - input.arc), estimated: false, formationEndArc: null };
}
