/**
 * First steps: the new-player checklist on the Desk (pure; tests/firstSteps.test.ts).
 * Every tick comes from a real record in the database (desk.service firstStepFacts),
 * never from the browser. The card disappears once every step is done.
 */

export type FirstStepKey = 'decision' | 'party' | 'rally' | 'vote' | 'room' | 'company';
export type FirstStepFacts = Record<FirstStepKey, boolean>;

export interface FirstStepSpec {
  key: FirstStepKey;
  title: string;
  why: string;
  /** Where the button goes: a politics tab/section (go()), or a page path starting with '/'. null = on the Desk itself. */
  go: string | null;
  cta: string;
}

/** In the order a new player should do them. */
export const FIRST_STEPS: FirstStepSpec[] = [
  { key: 'decision', title: 'Make your first decision', why: 'Each month brings situations only you can settle. They move your money, standing and voter support.', go: null, cta: 'See this month' },
  { key: 'party',    title: 'Join a party or found one', why: 'A party gives you a seat in Parliament today and a district to fight at the next election.', go: 'party', cta: 'Choose a party' },
  { key: 'rally',    title: 'Campaign once', why: 'A rally or an advert raises your party’s support with voters. Support is what elections count.', go: 'voters', cta: 'Go to Voters' },
  { key: 'vote',     title: 'Vote on a bill', why: 'Every seat votes. Your vote can tip a law that changes taxes, jobs and car prices.', go: 'chamber:floor', cta: 'Open the Chamber' },
  { key: 'room',     title: 'Say hello in your nation’s room', why: 'The other players in your nation are your rivals and your coalition partners. Deals start with a message.', go: 'corridors', cta: 'Open Corridors' },
  { key: 'company',  title: 'Found a company (optional)', why: 'Run a car maker in your own nation’s market, and feel the laws you pass in your sales.', go: '/drennia/business', cta: 'Start a business' },
];

export interface FirstStepsView {
  steps: (FirstStepSpec & { done: boolean })[];
  done: number;
  total: number;
  /** The first step not yet done, or null when all are. */
  next: FirstStepKey | null;
  complete: boolean;
}

export function firstSteps(facts: FirstStepFacts): FirstStepsView {
  const steps = FIRST_STEPS.map(s => ({ ...s, done: !!facts[s.key] }));
  const done = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done)?.key ?? null;
  return { steps, done, total: steps.length, next, complete: next === null };
}
