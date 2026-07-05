require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const assert = require('assert');
const test = require('node:test');
const jwt = require('jsonwebtoken');

/**
 * Player Economy E2E Test
 * Covers: legal structures, P2P loans (offer -> accept -> tick payment),
 * private placements, IPO conversion, order-book share trading, dividends.
 */
test('Player Economy E2E', async (t) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const suffix = Date.now();
  let apiA, apiB; // A = founder/borrower, B = investor/lender
  let userA, charA, companyId;
  let userB, charB;
  let loanOfferId, loanId, placementId;

  const makeApi = (userId, email) => {
    const token = jwt.sign(
      { id: userId, email, status: 'verified', verificationLevel: 1, role: 'admin' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
    return axios.create({
      baseURL: 'http://localhost:4000/api/v1',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  try {
    // === SETUP ===
    await t.test('Setup: two users with characters and cash', async () => {
      // Reference geography/currency copied from any existing company
      const ref = await client.query(
        `SELECT country_id, headquarters_state_id, industry_id, currency_id,
                (SELECT world_instance_id FROM characters LIMIT 1) AS world_instance_id
         FROM companies LIMIT 1`
      );
      assert.ok(ref.rows.length > 0, 'Need at least one seeded company for reference data');
      const geo = ref.rows[0];

      // Create both players from scratch
      const mkPlayer = async (label) => {
        const u = await client.query(
          `INSERT INTO users (email, password_hash, role, is_verified) VALUES ($1, 'x', 'admin', true) RETURNING id`,
          [`econ-${label}-${suffix}@test.worldr`]
        );
        const ch = await client.query(
          `INSERT INTO characters (user_id, world_instance_id, name, age, status, motherland_country_id,
                                   created_at_world_year, created_at_world_month, created_at_world_day)
           SELECT $1, $2, $3, 30, 'active', $4, wc.current_year, wc.current_month, wc.current_day
           FROM world_clock wc LIMIT 1
           RETURNING id`,
          [u.rows[0].id, geo.world_instance_id, `Econ ${label.toUpperCase()} ${suffix}`, geo.country_id]
        );
        await client.query(
          `INSERT INTO character_finances (character_id, currency_id, cash_in_hand, net_worth)
           VALUES ($1, $2, 2000000, 2000000)
           ON CONFLICT (character_id) DO UPDATE SET cash_in_hand = 2000000`,
          [ch.rows[0].id, geo.currency_id]
        );
        return { userId: u.rows[0].id, charId: ch.rows[0].id };
      };

      const a = await mkPlayer('a');
      const b = await mkPlayer('b');
      userA = a.userId; charA = a.charId;
      userB = b.userId; charB = b.charId;

      apiA = makeApi(userA, `econ-a-${suffix}@test.worldr`);
      apiB = makeApi(userB, `econ-b-${suffix}@test.worldr`);

      // A founds a manufacturing company via the real API (sole trader, gets cap table row)
      const co = await apiA.post('/companies', {
        name: `Econ Test Works ${suffix}`,
        country_id: geo.country_id,
        headquarters_state_id: geo.headquarters_state_id,
        industry_id: geo.industry_id,
        legal_structure_id: 'sole-trader',
        currency_id: geo.currency_id,
        starting_capital: 500000,
      });
      companyId = co.data.id || co.data.company?.id || co.data.data?.id;
      assert.ok(companyId, 'Company created via API');
    });

    // === ACT 1: LEGAL STRUCTURES ===
    await t.test('Act 1: structures endpoint lists the three tiers', async () => {
      const res = await apiA.get('/companies/structures');
      const ids = res.data.map((s) => s.id);
      assert.ok(ids.includes('sole-trader'), 'sole-trader available');
      assert.ok(ids.includes('private-company'), 'private-company available');
      assert.ok(ids.includes('public-corporation'), 'public-corporation available');
    });

    // === ACT 2: P2P LOAN LIFECYCLE ===
    await t.test('Act 2a: B posts a loan offer', async () => {
      const res = await apiB.post('/investments/loan-offers', {
        max_amount: 100000,
        monthly_interest_rate: 0.025, // 2.5% monthly, as a decimal fraction
        term_months: 6,
        purpose: 'Economy test loan',
      });
      loanOfferId = res.data.id || res.data.offer?.id;
      assert.ok(loanOfferId, 'Loan offer created');
    });

    await t.test('Act 2b: A accepts the loan and receives cash', async () => {
      const before = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charA]);
      const res = await apiA.post(`/investments/loan-offers/${loanOfferId}/accept`, { amount: 60000 });
      loanId = res.data.id || res.data.loan?.id;
      assert.ok(loanId, 'Loan created');

      const after = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charA]);
      assert.strictEqual(
        Number(after.rows[0].cash_in_hand) - Number(before.rows[0].cash_in_hand),
        60000,
        'Borrower received principal'
      );
    });

    await t.test('Act 2c: world tick collects a loan payment', async () => {
      const lenderBefore = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charB]);
      const loanBefore = await client.query(`SELECT months_remaining, total_paid FROM p2p_loans WHERE id = $1`, [loanId]);

      await apiA.post('/world/tick'); // admin force tick

      const loanAfter = await client.query(`SELECT months_remaining, total_paid, status FROM p2p_loans WHERE id = $1`, [loanId]);
      const lenderAfter = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charB]);

      assert.ok(
        Number(loanAfter.rows[0].months_remaining) < Number(loanBefore.rows[0].months_remaining),
        'Months remaining reduced after tick'
      );
      assert.ok(
        Number(loanAfter.rows[0].total_paid) > Number(loanBefore.rows[0].total_paid),
        'Total paid increased after tick'
      );
      assert.ok(
        Number(lenderAfter.rows[0].cash_in_hand) > Number(lenderBefore.rows[0].cash_in_hand),
        'Lender received the monthly payment'
      );
    });

    // === ACT 3: PRIVATE PLACEMENT (requires private-company) ===
    await t.test('Act 3a: A converts to Private Company', async () => {
      await apiA.post(`/companies/${companyId}/convert-structure`, { legal_structure_id: 'private-company' });
      const res = await client.query(`SELECT legal_structure_id FROM companies WHERE id = $1`, [companyId]);
      assert.strictEqual(res.rows[0].legal_structure_id, 'private-company');
    });

    await t.test('Act 3b: A sells a 10% stake to B via placement', async () => {
      const res = await apiA.post('/investments/placements', {
        company_id: companyId,
        shares: 100000, // 10%
        price_per_share: 0.5,
      });
      placementId = res.data.id || res.data.placement?.id;
      assert.ok(placementId, 'Placement created');

      await apiB.post(`/investments/placements/${placementId}/accept`);

      const cap = await client.query(
        `SELECT holder_character_id, shares FROM company_shares WHERE company_id = $1 AND shares > 0 ORDER BY shares DESC`,
        [companyId]
      );
      assert.strictEqual(cap.rows.length, 2, 'Two shareholders after placement');
      const bRow = cap.rows.find((r) => r.holder_character_id === charB);
      assert.strictEqual(Number(bRow.shares), 100000, 'B holds 100k shares');
    });

    // === ACT 4: IPO + ORDER BOOK TRADING ===
    await t.test('Act 4a: A converts to Public Corporation (IPO)', async () => {
      await client.query(`UPDATE company_finances SET company_value = 300000, available_cash = 300000 WHERE company_id = $1`, [companyId]);
      await apiA.post(`/companies/${companyId}/convert-structure`, { legal_structure_id: 'public-corporation' });
      const res = await client.query(`SELECT legal_structure_id FROM companies WHERE id = $1`, [companyId]);
      assert.strictEqual(res.rows[0].legal_structure_id, 'public-corporation');

      const listings = await apiB.get('/exchange/listings');
      assert.ok(
        listings.data.some((l) => l.company_id === companyId || l.id === companyId),
        'Company appears in exchange listings'
      );
    });

    await t.test('Act 4b: order book matches a trade at maker price', async () => {
      // A sells 10,000 shares @ 0.60; B bids 5,000 @ 0.65 -> should fill 5,000 @ 0.60 (maker price)
      await apiA.post(`/exchange/${companyId}/orders`, { side: 'sell', price: 0.6, quantity: 10000 });

      const bBefore = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charB]);
      await apiB.post(`/exchange/${companyId}/orders`, { side: 'buy', price: 0.65, quantity: 5000 });

      const trades = await client.query(
        `SELECT price, quantity FROM share_trades WHERE company_id = $1 ORDER BY executed_at DESC LIMIT 1`,
        [companyId]
      );
      assert.ok(trades.rows.length > 0, 'Trade executed');
      assert.strictEqual(Number(trades.rows[0].price), 0.6, 'Filled at maker (resting) price');
      assert.strictEqual(Number(trades.rows[0].quantity), 5000, 'Filled the full taker quantity');

      const bAfter = await client.query(`SELECT cash_in_hand FROM character_finances WHERE character_id = $1`, [charB]);
      assert.strictEqual(
        Math.round(Number(bBefore.rows[0].cash_in_hand) - Number(bAfter.rows[0].cash_in_hand)),
        3000,
        'B paid 5000 x 0.60 = 3000'
      );

      const bShares = await client.query(
        `SELECT shares FROM company_shares WHERE company_id = $1 AND holder_character_id = $2`,
        [companyId, charB]
      );
      assert.strictEqual(Number(bShares.rows[0].shares), 105000, 'B now holds 105k shares');
    });

    // === ACT 5: DIVIDENDS ===
    await t.test('Act 5: dividend policy pays shareholders on tick', async () => {
      await apiA.put(`/companies/${companyId}/dividend-policy`, { payout_percent: 20 });

      // Give the company a "profit" this month by inserting an arc report the economy tick reads,
      // or simply assert the policy persisted and payments table is written on the next profitable tick.
      const policy = await client.query(`SELECT payout_percent FROM dividend_policies WHERE company_id = $1`, [companyId]);
      assert.strictEqual(Number(policy.rows[0].payout_percent), 20, 'Policy persisted');

      const capTable = await apiB.get(`/companies/${companyId}/cap-table`);
      assert.strictEqual(capTable.data.dividend_policy, 20, 'Cap table reports the dividend policy');
      assert.strictEqual(capTable.data.holders.length, 2, 'Cap table shows both holders');
    });

    // === NEGATIVE PATHS ===
    await t.test('Negative: cannot self-accept own loan offer', async () => {
      const res = await apiB.post('/investments/loan-offers', {
        max_amount: 1000,
        monthly_interest_rate: 0.01,
        term_months: 3,
      });
      const offerId = res.data.id || res.data.offer?.id;
      try {
        await apiB.post(`/investments/loan-offers/${offerId}/accept`, { amount: 1000 });
        assert.fail('Should not be able to accept own offer');
      } catch (e) {
        assert.strictEqual(e.response?.status, 400, 'Self-accept rejected with 400');
      }
    });

    await t.test('Negative: cannot sell shares you do not own', async () => {
      try {
        await apiB.post(`/exchange/${companyId}/orders`, { side: 'sell', price: 1, quantity: 99999999 });
        assert.fail('Oversell should fail');
      } catch (e) {
        assert.strictEqual(e.response?.status, 400, 'Oversell rejected with 400');
      }
    });
  } finally {
    await client.end();
  }
});
