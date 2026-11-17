/**
 * Delete every real player account and everything those players own, while
 * keeping the computer-run world (NPC parties, NPC companies, nations, the
 * world clock, market history) in place.
 *
 *   npx tsx scripts/delete-players.ts            # practice run: does it all, then rolls back
 *   npx tsx scripts/delete-players.ts --confirm  # does it for real
 *
 * Run from the backend folder. Reads DATABASE_URL from backend/.env.
 * Everything happens in ONE transaction: if any step fails, nothing changes.
 *
 * Who counts as a player: any user whose password_hash is not the system
 * marker (NO_LOGIN_PASSWORD_HASH). Admin accounts are players too and are
 * deleted; sign up again afterwards and ADMIN_EMAILS re-promotes you on boot.
 *
 * What is deleted: player users, their characters, companies they own,
 * parties they founded (is_npc = false), their loans, orders, trades, chat,
 * deals and history rows tied to them.
 *
 * What is handed back instead of deleted (the same rules the game uses when a
 * player leaves a party: floor.service onLeaveParty):
 *  - seats a player held in a computer-run party -> back to that party's NPC MPs
 *  - cabinet posts a player held -> 'Acting minister'
 *  - election candidacies in computer-run parties -> NPC candidate
 *  - shares a player (or a player company) held in a surviving company, including
 *    shares locked in open sell orders -> back to that company's owner, so the
 *    company's total share count does not change.
 *
 * Player-founded parties are removed the way dissolveParty does it: they leave
 * every coalition's member list and their seats go with them until the next
 * election. The practice run prints which governments that touches.
 */
import { db } from '../src/config/database';
import { NO_LOGIN_PASSWORD_HASH } from '../src/api/constants/world';

const CONFIRM = process.argv.includes('--confirm');
const ACTING_MINISTER = 'Acting minister'; // same text floor.service onLeaveParty writes

class PracticeRunRollback extends Error {}

const n = (v: any) => Number(v ?? 0);
const report: Array<[string, number]> = [];
const note = (label: string, count: number) => { report.push([label, count]); };
const affected = (r: any) => (typeof r === 'number' ? r : Array.isArray(r) ? r.length : n(r?.rowCount));

async function shareTotals(trx: any, companyIds: string[]) {
  if (!companyIds.length) return new Map<string, number>();
  const rows = await trx.raw(
    `SELECT c.id,
            COALESCE((SELECT SUM(shares) FROM company_shares s WHERE s.company_id = c.id), 0)
          + COALESCE((SELECT SUM(quantity - filled_quantity) FROM share_orders o
                      WHERE o.company_id = c.id AND o.side = 'sell' AND o.status = 'open'), 0) AS total
       FROM companies c WHERE c.id = ANY(?)`,
    [companyIds],
  );
  return new Map<string, number>(rows.rows.map((r: any) => [r.id, n(r.total)]));
}

async function run(trx: any) {
  // ── Who goes ────────────────────────────────────────────────────────────
  const users: Array<{ id: number; email: string }> = await trx('users')
    .whereRaw('password_hash IS DISTINCT FROM ?', [NO_LOGIN_PASSWORD_HASH])
    .select('id', 'email');
  const userIds = users.map((u) => u.id);
  const chars: Array<{ id: string }> = userIds.length
    ? await trx('characters').whereIn('user_id', userIds).select('id')
    : [];
  const pc = chars.map((c) => c.id);
  const companies: Array<{ id: string; name: string }> = pc.length
    ? await trx('companies').whereIn('owner_character_id', pc).select('id', 'name')
    : [];
  const pco = companies.map((c) => c.id);
  const parties: Array<{ id: string; name: string; state_id: string }> = await trx('pol_parties')
    .where({ is_npc: false }).select('id', 'name', 'state_id');
  const pp = parties.map((p) => p.id);

  console.log(`Player accounts: ${users.length}`);
  for (const u of users) console.log(`  - user #${u.id}`); // no emails in logs
  console.log(`Player characters: ${pc.length}`);
  console.log(`Player-owned companies: ${pco.length}${companies.length ? ' (' + companies.map((c) => c.name).join(', ') + ')' : ''}`);
  console.log(`Player-founded parties: ${pp.length}${parties.length ? ' (' + parties.map((p) => p.name).join(', ') + ')' : ''}`);

  if (!users.length) { console.log('No player accounts. Nothing to do.'); return; }

  // Impact on governments, so it is visible before confirming.
  if (pp.length) {
    const seats = await trx('pol_council_seats').whereIn('party_id', pp).count('* as c').first();
    const led = await trx('pol_coalitions').whereIn('lead_party_id', pp).whereNot({ status: 'dissolved' }).select('id', 'status');
    const premiers = await trx('pol_offices').whereIn('party_id', pp).where({ office: 'premier' }).count('* as c').first();
    console.log(`  Their seats (all cycles, removed until next election): ${n(seats?.c)}`);
    console.log(`  Coalitions they lead (removed): ${led.length}${led.length ? ' [' + led.map((c: any) => c.status).join(', ') + ']' : ''}`);
    console.log(`  Head-of-government records they hold (removed; the previous holder becomes current): ${n(premiers?.c)}`);
  }

  // Share totals of surviving companies, to prove nothing is lost.
  const survivorIds: string[] = (await trx('companies').whereNotIn('id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000']).select('id')).map((r: any) => r.id);
  const before = await shareTotals(trx, survivorIds);

  // ── 1. Shares in surviving companies go back to that company's owner ──────
  const holderFilter = (q: any) => q.whereIn('holder_character_id', pc).orWhereIn('holder_company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000']);
  const heldRows: any[] = await trx('company_shares as s')
    .join('companies as c', 'c.id', 's.company_id')
    .whereNotIn('s.company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000'])
    .where(holderFilter)
    .select('s.id', 's.company_id', 's.shares', 'c.owner_character_id');
  const lockedSells: any[] = await trx('share_orders as o')
    .join('companies as c', 'c.id', 'o.company_id')
    .whereNotIn('o.company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000'])
    .where({ 'o.side': 'sell', 'o.status': 'open' })
    .where((q: any) => q.whereIn('o.character_id', pc).orWhereIn('o.purchaser_company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000']))
    .select('o.company_id', trx.raw('(o.quantity - o.filled_quantity) AS remaining'), 'c.owner_character_id');

  const giveBack = new Map<string, { owner: string; shares: number }>();
  for (const r of [...heldRows.map((h) => ({ company_id: h.company_id, owner: h.owner_character_id, qty: n(h.shares) })),
                   ...lockedSells.map((o) => ({ company_id: o.company_id, owner: o.owner_character_id, qty: n(o.remaining) }))]) {
    const cur = giveBack.get(r.company_id) ?? { owner: r.owner, shares: 0 };
    cur.shares += r.qty;
    giveBack.set(r.company_id, cur);
  }
  if (heldRows.length) await trx('company_shares').whereIn('id', heldRows.map((h) => h.id)).del();
  let returned = 0;
  for (const [companyId, { owner, shares }] of giveBack) {
    if (shares <= 0) continue;
    returned += shares;
    const existing = await trx('company_shares').where({ company_id: companyId, holder_character_id: owner }).first();
    if (existing) {
      await trx('company_shares').where({ id: existing.id }).update({ shares: n(existing.shares) + shares, updated_at: trx.fn.now() });
    } else {
      await trx('company_shares').insert({ company_id: companyId, holder_character_id: owner, shares, avg_cost_basis: 0 });
    }
  }
  note('Shares handed back to surviving companies\' owners', returned);

  // ── 2. Market orders and trades involving players ─────────────────────────
  const orderIds: string[] = (await trx('share_orders')
    .whereIn('character_id', pc)
    .orWhereIn('purchaser_company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000'])
    .orWhereIn('company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000'])
    .select('id')).map((r: any) => r.id);
  note('Share trades removed', affected(await trx('share_trades')
    .whereIn('buyer_character_id', pc).orWhereIn('seller_character_id', pc)
    .orWhereIn('buy_order_id', orderIds.length ? orderIds : ['00000000-0000-0000-0000-000000000000'])
    .orWhereIn('sell_order_id', orderIds.length ? orderIds : ['00000000-0000-0000-0000-000000000000'])
    .del()));
  note('Share orders removed', affected(orderIds.length ? await trx('share_orders').whereIn('id', orderIds).del() : 0));

  // ── 3. Politics: hand back what lives on in computer-run parties ──────────
  note('Seats handed back to computer-run MPs', affected(await trx('pol_council_seats')
    .whereIn('character_id', pc).whereNotIn('party_id', pp.length ? pp : ['00000000-0000-0000-0000-000000000000'])
    .update({ character_id: null, is_npc: true })));
  note('Cabinet posts handed to an acting minister', affected(await trx('pol_cabinet_posts')
    .whereIn('holder_character_id', pc).update({ holder_character_id: null, npc_name: ACTING_MINISTER })));
  note('Candidacies handed back to computer-run candidates', affected(await trx('pol_candidates')
    .whereIn('character_id', pc).whereNotIn('party_id', pp.length ? pp : ['00000000-0000-0000-0000-000000000000'])
    .update({ character_id: null, is_npc: true })));
  await trx('pol_party_factions').whereIn('leader_character_id', pc).update({ leader_character_id: null });
  await trx('pol_bills').whereIn('tabled_by_character_id', pc).update({ tabled_by_character_id: null });
  await trx('pol_scandals').whereIn('blackmail_used_by', pc).update({ blackmail_used_by: null });
  const doomedScandals = pp.length ? (await trx('pol_scandals').whereIn('party_id', pp).select('id')).map((r: any) => r.id) : [];
  note('Coercion records removed', affected(await trx('pol_bill_coercion_actions')
    .whereIn('actor_char_id', pc).orWhereIn('target_char_id', pc)
    .orWhereIn('scandal_id', doomedScandals.length ? doomedScandals : ['00000000-0000-0000-0000-000000000000'])
    .del()));

  // ── 4. Player-founded parties (same steps as dissolveParty) ───────────────
  if (pp.length) {
    const seatRows: any[] = await trx('pol_council_seats').whereIn('party_id', pp).select('party_id', 'cycle_id');
    const coalitions: any[] = await trx('pol_coalitions').whereNotIn('lead_party_id', pp).forUpdate();
    for (const c of coalitions) {
      const members = typeof c.member_party_ids === 'string' ? JSON.parse(c.member_party_ids) : (c.member_party_ids ?? {});
      let changed = false; let lost = 0;
      if (Array.isArray(members.accepted)) {
        const gone = members.accepted.filter((id: string) => pp.includes(id));
        if (gone.length) {
          members.accepted = members.accepted.filter((id: string) => !pp.includes(id));
          lost = seatRows.filter((s) => gone.includes(s.party_id) && s.cycle_id === c.cycle_id).length;
          changed = true;
        }
      }
      if (Array.isArray(members.invited) && members.invited.some((id: string) => pp.includes(id))) {
        members.invited = members.invited.filter((id: string) => !pp.includes(id));
        changed = true;
      }
      if (changed) {
        await trx('pol_coalitions').where({ id: c.id }).update({
          member_party_ids: JSON.stringify(members),
          total_seats: Math.max(0, n(c.total_seats) - lost),
        });
      }
    }
    note('Player-founded parties removed', affected(await trx('pol_parties').whereIn('id', pp).del()));
  }

  // ── 5. Loans ──────────────────────────────────────────────────────────────
  note('Player-to-player loans removed', affected(await trx('p2p_loans')
    .whereIn('lender_character_id', pc).orWhereIn('borrower_character_id', pc).del()));
  note('Bank loans removed', affected(await trx('banking_active_loans')
    .where((q: any) => q.where({ borrower_type: 'company' }).whereIn('borrower_id', pco.length ? pco : ['none']))
    .orWhere((q: any) => q.where({ borrower_type: 'character' }).whereIn('borrower_id', pc))
    .del()));

  // ── 6. Player companies ───────────────────────────────────────────────────
  note('Acquisition records removed', affected(await trx('company_acquisitions')
    .whereIn('winner_character_id', pc).orWhereIn('company_id', pco.length ? pco : ['00000000-0000-0000-0000-000000000000']).del()));
  await trx('company_acquisition_bids').whereIn('character_id', pc).del();
  if (pco.length) {
    await trx('company_contracts').whereIn('company_id', pco).del();
    await trx('company_shares').whereIn('holder_company_id', pco).del();
    await trx('dividend_payments').whereIn('holder_company_id', pco).del();
    await trx('manufacturing_market_brand_milestones').whereIn('company_id', pco).del();
    const modelIds = (await trx('manufacturing_vehicle_models').whereIn('company_id', pco).select('id')).map((r: any) => r.id);
    if (modelIds.length) {
      // NPC cars copied from a player's design keep existing; just forget the source.
      await trx('manufacturing_vehicle_models').whereIn('npc_cloned_from_model_id', modelIds).update({ npc_cloned_from_model_id: null });
    }
    await trx('company_finances').whereIn('company_id', pco).del();
    note('Player companies removed', affected(await trx('companies').whereIn('id', pco).del()));
  }

  // ── 7. Characters and accounts ────────────────────────────────────────────
  await trx('character_finances').whereIn('character_id', pc).del();
  await trx('character_net_worth_history').whereIn('character_id', pc).del();
  note('Characters removed', affected(await trx('characters').whereIn('id', pc).del()));
  note('Accounts removed', affected(await trx('users').whereIn('id', userIds).del()));

  // ── Checks ────────────────────────────────────────────────────────────────
  const after = await shareTotals(trx, survivorIds);
  const drift = survivorIds.filter((id) => (before.get(id) ?? 0) !== (after.get(id) ?? 0));
  if (drift.length) throw new Error(`Share totals changed for ${drift.length} surviving companies. Aborting, nothing changed.`);
  const left = await trx('users').whereRaw('password_hash IS DISTINCT FROM ?', [NO_LOGIN_PASSWORD_HASH]).count('* as c').first();
  if (n(left?.c) !== 0) throw new Error('Some player accounts are still present. Aborting, nothing changed.');
  console.log('Checks passed: no player accounts left; share totals of surviving companies unchanged.');
}

async function main() {
  console.log(CONFIRM ? '*** DELETING PLAYERS FOR REAL ***' : 'Practice run (nothing will be saved). Add --confirm to delete for real.');
  try {
    await db.transaction(async (trx) => {
      await run(trx);
      if (!CONFIRM) throw new PracticeRunRollback();
    });
    printReport();
    console.log('✅ Done. Player accounts deleted.');
  } catch (err) {
    if (err instanceof PracticeRunRollback) {
      printReport();
      console.log('✅ Practice run finished and rolled back. Run again with --confirm to delete for real.');
    } else {
      console.error('❌ Failed. Nothing was changed.', err);
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
}

function printReport() {
  for (const [label, count] of report) console.log(`  ${label}: ${count}`);
}

main();
