/**
 * Administrations (docs/NATIONS_SIMULATION.md, "Administrations"): who governs,
 * what the government is called, the caretaker rule, and the record of change.
 * Pure rules only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as A from '../src/api/services/administration.rules';
import { CARETAKER_SUFFIX, ELECTED_SUFFIX } from '../src/api/constants/administrations';
import { STARTER_NATIONS } from '../src/api/constants/nations';

const HEAD_OF_STATE = { title: 'President', name: 'Halvard Ostrin' };
const LEAD = { id: 'p1', name: 'Forge Accord', color: '#C9A227', npcLeader: 'Mara Quill' };

describe('Administration names', () => {
  it('names a government after the family name of its head', () => {
    assert.strictEqual(A.administrationName('elected', 'John Dumb'), `Dumb ${ELECTED_SUFFIX}`);
    assert.strictEqual(A.administrationName('caretaker', 'Halvard Ostrin'), `Ostrin ${CARETAKER_SUFFIX}`);
  });
  it('keeps regnal numerals and one-word names whole', () => {
    assert.strictEqual(A.familyName('Aldric IV'), 'Aldric IV');
    assert.strictEqual(A.familyName('Cher'), 'Cher');
    assert.strictEqual(A.familyName('  Ana   de  Souza '), 'Souza');
  });
  it('numbers a returning head\'s later governments', () => {
    assert.strictEqual(A.administrationName('elected', 'John Dumb', 2), `Second Dumb ${ELECTED_SUFFIX}`);
    assert.strictEqual(A.termOrdinal(11), '11th');
    assert.strictEqual(A.termOrdinal(22), '22nd');
  });
  it('every starter nation has a head of state who can lead a caretaker government', () => {
    for (const n of STARTER_NATIONS) {
      assert.ok(n.headOfState.name.trim().length > 1, n.shortName);
      assert.ok(A.administrationName('caretaker', n.headOfState.name).endsWith(CARETAKER_SUFFIX));
    }
  });
});

describe('Who governs', () => {
  it('with no government, the head of state leads a caretaker government', () => {
    const a = A.resolveAdministration({ headOfState: HEAD_OF_STATE, headOfGovernmentTitle: 'Premier', leadParty: null, premier: null, coalitionPartyNames: [] });
    assert.strictEqual(a.kind, 'caretaker');
    assert.strictEqual(a.headName, HEAD_OF_STATE.name);
    assert.strictEqual(a.headTitle, HEAD_OF_STATE.title);
    assert.strictEqual(a.partyId, null);
  });
  it('a government is led by the player premier, else the lead party\'s computer leader', () => {
    const player = A.resolveAdministration({ headOfState: HEAD_OF_STATE, headOfGovernmentTitle: 'Premier', leadParty: LEAD, premier: { characterId: 'c1', name: 'John Dumb' }, coalitionPartyNames: ['Forge Accord', 'The Ledger'] });
    assert.strictEqual(player.kind, 'elected');
    assert.strictEqual(player.headName, 'John Dumb');
    assert.deepStrictEqual(player.coalition, ['The Ledger']);
    const npc = A.resolveAdministration({ headOfState: HEAD_OF_STATE, headOfGovernmentTitle: 'Premier', leadParty: LEAD, premier: null, coalitionPartyNames: ['Forge Accord'] });
    assert.strictEqual(npc.headName, 'Mara Quill');
    assert.strictEqual(npc.headCharacterId, null);
  });
  it('a lead party with nobody to lead it still falls back to the caretaker', () => {
    const a = A.resolveAdministration({ headOfState: HEAD_OF_STATE, headOfGovernmentTitle: 'Premier', leadParty: { ...LEAD, npcLeader: null }, premier: null, coalitionPartyNames: [] });
    assert.strictEqual(a.kind, 'caretaker');
  });
  it('a new head, lead party or kind is a new administration; a reshuffled coalition is not', () => {
    const base = { kind: 'elected' as const, headName: 'Mara Quill', headCharacterId: null, partyId: 'p1' };
    assert.ok(A.sameAdministration(base, { ...base }));
    assert.ok(!A.sameAdministration(base, { ...base, headName: 'Oren Vale' }));
    assert.ok(!A.sameAdministration(base, { ...base, partyId: 'p2' }));
    assert.ok(!A.sameAdministration(base, { ...base, kind: 'caretaker' }));
    // A player keeps their administration even if they rename themselves.
    const p = { ...base, headCharacterId: 'c1', headName: 'John Dumb' };
    assert.ok(A.sameAdministration(p, { ...p, headName: 'John Q. Dumb' }));
  });
});

describe('The record', () => {
  const start: A.AdministrationSnapshot = { arc: 400, rating: 50, tier: 'Middle power', gdpYearly: 300e9, unemployment: 0.06, population: 9e6, debt: 150e9, approval: 50 };
  it('reports growth as a ratio and other changes as differences', () => {
    const end = { ...start, arc: 436, rating: 55, gdpYearly: 330e9, unemployment: 0.045, approval: 44 };
    const c = A.administrationChange(start, end);
    assert.ok(Math.abs((c.gdpGrowth ?? 0) - 0.1) < 1e-9);
    assert.ok(Math.abs((c.unemployment ?? 0) + 0.015) < 1e-9);
    assert.strictEqual(c.rating, 5);
    assert.strictEqual(c.approval, -6);
  });
  it('missing numbers stay unknown rather than zero', () => {
    const c = A.administrationChange({ ...start, rating: null, gdpYearly: null }, start);
    assert.strictEqual(c.rating, null);
    assert.strictEqual(c.gdpGrowth, null);
  });
  it('counts whole months in office', () => {
    assert.strictEqual(A.monthsInOffice(400, null, 400), 0);
    assert.strictEqual(A.monthsInOffice(400, null, 412), 12);
    assert.strictEqual(A.monthsInOffice(400, 406, 412), 6);
  });
});

describe('Election outlook', () => {
  it('before election day it counts down to the election', () => {
    const o = A.electionOutlook({ arc: 390, phase: 'campaign', pollingArc: 399, formationEndArc: 401, termMonths: 48, firstTermCut: 0 });
    assert.strictEqual(o.monthsToElection, 9);
    assert.strictEqual(o.estimated, false);
  });
  it('while a government forms, the next election is a term away, never "0 months"', () => {
    const o = A.electionOutlook({ arc: 400, phase: 'formation', pollingArc: 399, formationEndArc: 401, termMonths: 48, firstTermCut: 6 });
    assert.strictEqual(o.phase, 'formation');
    assert.strictEqual(o.electionArc, 399 + 48 - 6);
    assert.ok(o.monthsToElection > 0);
    assert.strictEqual(o.estimated, true);
    assert.strictEqual(o.formationEndArc, 401);
  });
});
