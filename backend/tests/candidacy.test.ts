/**
 * Standing for election (docs/POLITICS_FLOOR.md, "Your race"): the filing
 * window, the district ranking and where an undecided member is put up.
 * Pure rules only, ratio-based.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as C from '../src/api/services/candidacy.rules';

const DATES = { filingOpens: 'May, Year 36', campaignStarts: 'August, Year 36', electionDay: 'February, Year 37', nextFiling: null };
const opt = (id: string, seats: number, partyShare: number, extra: Partial<C.DistrictOption> = {}): C.DistrictOption =>
  ({ id, name: id, region: null, seats, partyShare, projectedSeats: 0, sitting: 0, takenBy: null, mine: false, ...extra });

describe('Filing window', () => {
  it('is open only during filing, to stand or to change district', () => {
    assert.deepStrictEqual(C.standWindow({ phase: 'filing', hasParty: true, standing: false, ...DATES }), { open: true, action: 'stand', lockReason: null });
    assert.strictEqual(C.standWindow({ phase: 'filing', hasParty: true, standing: true, ...DATES }).action, 'change');
  });
  it('is visible but locked at every other time, always with a reason', () => {
    for (const phase of ['governing', 'campaign', 'polling', 'formation'] as const) {
      for (const standing of [false, true]) {
        const w = C.standWindow({ phase, hasParty: true, standing, ...DATES });
        assert.strictEqual(w.open, false, phase);
        assert.ok(w.lockReason && w.lockReason.length > 20, phase);
      }
    }
  });
  it('says when filing opens before it does', () => {
    assert.ok(C.standWindow({ phase: 'governing', hasParty: true, standing: false, ...DATES }).lockReason!.includes(DATES.filingOpens));
  });
  it('needs a party first', () => {
    const w = C.standWindow({ phase: 'filing', hasParty: false, standing: false, ...DATES });
    assert.strictEqual(w.open, false);
    assert.match(w.lockReason!, /party/i);
  });
});

describe('District ranking', () => {
  it('the seat line falls as districts get bigger', () => {
    assert.ok(Math.abs(C.seatLine(1) - 0.5) < 1e-9);
    assert.ok(C.seatLine(9) < C.seatLine(3));
  });
  it('ranks by share against the seat line, not raw share', () => {
    // 20% in a 9-seat district (line 10%) beats 30% in a 1-seat district (line 50%).
    const r = C.rankDistricts([opt('small', 1, 0.3), opt('big', 9, 0.2)]);
    assert.strictEqual(r[0].id, 'big');
    assert.ok(r[0].ratio / r[1].ratio > 3);
  });
  it('recommends the best district no colleague holds; your own counts as yours', () => {
    const r = C.rankDistricts([opt('a', 5, 0.4, { takenBy: 'Bea' }), opt('b', 5, 0.3, { mine: true }), opt('c', 5, 0.2)]);
    assert.strictEqual(r.find(d => d.recommended)?.id, 'b');
    assert.strictEqual(r.filter(d => d.recommended).length, 1);
  });
  it('labels chances from strong to long shot', () => {
    assert.strictEqual(C.chanceBand(1.5).label, 'Strong');
    assert.strictEqual(C.chanceBand(1.0).label, 'Likely');
    assert.strictEqual(C.chanceBand(0.8).label, 'Close');
    assert.strictEqual(C.chanceBand(0.2).label, 'Long shot');
  });
});

describe('Undecided members', () => {
  it('are put up in their best open district, never one a colleague holds', () => {
    const pick = C.draftDistrict([opt('a', 5, 0.4, { takenBy: 'Bea' }), opt('b', 5, 0.1), opt('c', 3, 0.2)]);
    assert.strictEqual(pick?.id, 'c');
  });
  it('get no district when every one is taken', () => {
    assert.strictEqual(C.draftDistrict([opt('a', 5, 0.4, { takenBy: 'Bea' })]), null);
  });
  it('reads months the way players do', () => {
    assert.strictEqual(C.polArcLabel(36 * 12 + 4), 'May, Year 36');
  });
});

describe('Nobody waits without a district (owner decision 2026-11-19)', () => {
  it('places unplaced members whenever an election lies ahead, not only once the campaign starts', () => {
    for (const phase of ['governing', 'filing', 'campaign'] as const) assert.strictEqual(C.placesUnfiledMembers(phase), true, phase);
  });
  it('waits for the new term during election day and coalition talks (no cycle for the next election yet)', () => {
    for (const phase of ['polling', 'formation'] as const) assert.strictEqual(C.placesUnfiledMembers(phase), false, phase);
  });
  const N = { partyName: 'Labour', districtName: 'Ironvale', partyShare: 0.234, filingArc: 36 * 12 + 4, campaignArc: 36 * 12 + 7, pollingArc: 37 * 12 + 1 };
  it('tells a member placed early where they stand and when they can still change it', () => {
    const g = C.draftNotice({ ...N, phase: 'governing' });
    assert.ok(g.includes('Ironvale') && g.includes('23%') && g.includes('May, Year 36') && g.includes('July, Year 36'), g);
    const f = C.draftNotice({ ...N, phase: 'filing' });
    assert.ok(f.includes('until August, Year 36'), f);
  });
  it('tells a member placed at the campaign that filing has closed and when votes are counted', () => {
    const c = C.draftNotice({ ...N, phase: 'campaign' });
    assert.ok(c.startsWith('Filing has closed') && c.includes('February, Year 37'), c);
  });
});
