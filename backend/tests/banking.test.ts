/**
 * Bank loans: amounts are validated, limits hold, and loans are repaid.
 * Pure rules in services/banking.rules.ts; numbers in constants/banking.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountDue, facilityBaseRate, isCompanyFacility, monthlyPayment, parseAmortization, parseLoanAmount, parseTerm,
  loanStateFromRow, personalLoanAllowed, personalLoanLimit, projectLoan, settleMonth, LoanState,
} from '../src/api/services/banking.rules';
import {
  BANK_DEFAULT_AFTER_MISSES, COMPANY_LOAN_DEFAULT_TERM, COMPANY_LOAN_MAX_TERM, LOAN_PROJECTION_MAX_MONTHS,
  LOAN_SCHEDULE_YEAR_MONTHS, PERSONAL_LOAN_MAX, PERSONAL_LOAN_MIN,
  PERSONAL_LOAN_NET_WORTH_SHARE, TERM_FACILITY_FIXED_RATE,
} from '../src/api/constants/banking';

describe('Loan requests are validated', () => {
  it('accepts only positive, finite amounts, rounded down to whole dollars', () => {
    assert.equal(parseLoanAmount(250000), 250000);
    assert.equal(parseLoanAmount('1500.9'), 1500);
    for (const bad of [-1, 0, 0.4, 'abc', '', '1e309', null, undefined, [], {}, NaN, Infinity]) {
      assert.equal(parseLoanAmount(bad as any), null, `rejects ${JSON.stringify(bad)}`);
    }
  });
  it('a string amount is a number, never text glued onto a balance', () => {
    assert.equal(typeof parseLoanAmount('7'), 'number');
    assert.equal(1_000_000 + (parseLoanAmount('7') as number), 1_000_007);
  });
  it('terms, facility types and repayment styles come from fixed lists', () => {
    assert.equal(parseTerm(undefined), COMPANY_LOAN_DEFAULT_TERM);
    assert.equal(parseTerm(48), 48);
    assert.equal(parseTerm(COMPANY_LOAN_MAX_TERM + 1), null);
    assert.equal(parseTerm(-12), null);
    assert.equal(parseTerm(12.5), null);
    assert.ok(isCompanyFacility('term'));
    assert.ok(!isCompanyFacility('personal'));
    assert.ok(!isCompanyFacility(undefined));
    assert.equal(parseAmortization(undefined), 'amortizing');
    assert.equal(parseAmortization('balloon'), 'balloon');
    assert.equal(parseAmortization('free-money'), null);
  });
  it('the term facility has its fixed rate; others float over the base rate', () => {
    assert.equal(facilityBaseRate('term', 0.05), TERM_FACILITY_FIXED_RATE);
    assert.ok(facilityBaseRate('revolver', 0.08) > facilityBaseRate('revolver', 0.05));
  });
});

describe('Personal loan limit', () => {
  it('is a share of net worth, with a hard cap', () => {
    assert.equal(personalLoanLimit(1_000_000), 1_000_000 * PERSONAL_LOAN_NET_WORTH_SHARE);
    assert.equal(personalLoanLimit(1e15), PERSONAL_LOAN_MAX);
    assert.equal(personalLoanLimit(-500), 0);
  });
  it('a trillion-dollar request is refused, a modest one allowed', () => {
    assert.equal(personalLoanAllowed(1e12, 1_000_000).ok, false);
    assert.equal(personalLoanAllowed(200_000, 1_000_000).ok, true);
    assert.equal(personalLoanAllowed(PERSONAL_LOAN_MIN - 1, 1_000_000).ok, false);
  });
});

const loan = (over: Partial<LoanState> = {}): LoanState => {
  const principal = 1_000_000, rate = 0.12, term = 24;
  return { remaining: principal, yearlyRate: rate, payment: monthlyPayment(principal, rate, term), monthsRemaining: term, amortization: 'amortizing', missed: 0, ...over };
};

describe('Loans are repaid', () => {
  it('an amortizing loan is cleared after exactly its term, and costs more than it lent', () => {
    let s = loan();
    let paid = 0, months = 0;
    while (months < 100) {
      const out = settleMonth(s, true);
      paid += out.paid; months++;
      if (out.status === 'REPAID') break;
      s = { ...s, remaining: out.remaining, monthsRemaining: out.monthsRemaining, missed: out.missed };
    }
    assert.equal(months, 24);
    assert.ok(paid / 1_000_000 > 1.1 && paid / 1_000_000 < 1.15, `total repaid ratio ${paid / 1_000_000}`);
  });
  it('a balloon loan pays interest only, then everything in the last month', () => {
    const principal = 1_000_000, rate = 0.12;
    let s = loan({ payment: monthlyPayment(principal, rate, 12, 'balloon'), monthsRemaining: 12, amortization: 'balloon' });
    const first = settleMonth(s, true);
    assert.equal(first.remaining, principal);
    for (let i = 0; i < 11; i++) { const o = settleMonth(s, true); s = { ...s, remaining: o.remaining, monthsRemaining: o.monthsRemaining }; }
    const last = amountDue(s);
    assert.ok(last.due / principal > 1, 'final payment includes the principal');
    assert.equal(settleMonth(s, true).status, 'REPAID');
  });
  it('a loan without a term (taken before repayment existed) still shrinks to zero', () => {
    let s = loan({ monthsRemaining: null });
    let months = 0, status = 'ACTIVE';
    while (status === 'ACTIVE' && months < 200) {
      const o = settleMonth(s, true); months++; status = o.status;
      s = { ...s, remaining: o.remaining, monthsRemaining: o.monthsRemaining };
    }
    assert.equal(status, 'REPAID');
    assert.ok(months <= 25);
  });
  it('a missed month adds interest to the debt; repeated misses default the loan', () => {
    let s = loan();
    const miss = settleMonth(s, false);
    assert.ok(miss.remaining > s.remaining);
    assert.equal(miss.paid, 0);
    for (let i = 0; i < BANK_DEFAULT_AFTER_MISSES; i++) {
      const o = settleMonth(s, false);
      s = { ...s, remaining: o.remaining, missed: o.missed };
      if (i === BANK_DEFAULT_AFTER_MISSES - 1) assert.equal(o.status, 'DEFAULTED');
      else assert.equal(o.status, 'ACTIVE');
    }
  });
  it('paying again resets the missed streak', () => {
    const s = loan({ missed: BANK_DEFAULT_AFTER_MISSES - 1 });
    assert.equal(settleMonth(s, true).missed, 0);
  });
});

describe('The loan schedule screen shows what the tick will collect', () => {
  // Walk the loan with settleMonth exactly as the economy tick does, month by month.
  const walk = (start: LoanState) => {
    let s = start, months = 0, firstYear = 0, last = 0;
    while (months < LOAN_PROJECTION_MAX_MONTHS) {
      const o = settleMonth(s, true); months++; last = o.paid;
      if (months <= LOAN_SCHEDULE_YEAR_MONTHS) firstYear += o.paid;
      if (o.status === 'REPAID') return { months, firstYear, last };
      s = { ...s, remaining: Math.round(o.remaining), monthsRemaining: o.monthsRemaining };
    }
    return { months: null, firstYear, last: null };
  };

  it('an amortizing loan: months left = its remaining term, next year = the payments the tick takes', () => {
    const s = loan({ monthsRemaining: 20 });
    const p = projectLoan(s);
    const w = walk(s);
    assert.equal(p.monthsLeft, 20);
    assert.equal(p.dueNextYear, w.firstYear);
    // Level payments: a year of them is about 12 monthly payments, not monthly x 12 of a different loan.
    assert.ok(Math.abs(p.dueNextYear / (s.payment * LOAN_SCHEDULE_YEAR_MONTHS) - 1) < 0.01);
  });
  it('a loan ending within the year counts only the payments left, and the last one clears it', () => {
    const s = loan({ remaining: 150_000, monthsRemaining: 3 });
    const p = projectLoan(s);
    assert.equal(p.monthsLeft, 3);
    assert.equal(p.dueNextYear, walk(s).firstYear);
    assert.ok(p.dueNextYear / s.remaining > 1 && p.dueNextYear / s.remaining < 1.05, `paid ${p.dueNextYear} for ${s.remaining} owed`);
  });
  it('a balloon loan shows its lump sum as the final payment', () => {
    const principal = 1_000_000, rate = 0.12;
    const s = loan({ payment: monthlyPayment(principal, rate, 12, 'balloon'), monthsRemaining: 6, amortization: 'balloon' });
    const p = projectLoan(s);
    assert.equal(p.monthsLeft, 6);
    assert.ok((p.finalPayment as number) / principal > 1, 'final payment includes the principal');
    assert.equal(p.dueNextYear, walk(s).firstYear);
  });
  it('a loan whose payment no longer covers its interest is shown as never ending, not looped forever', () => {
    const s = loan({ monthsRemaining: null, payment: 1 });
    const p = projectLoan(s);
    assert.equal(p.monthsLeft, null);
    assert.equal(p.finalPayment, null);
  });
  it('projection ignores past misses: it shows the plan if every payment is made', () => {
    const base = loan({ monthsRemaining: 10 });
    assert.deepEqual(projectLoan({ ...base, missed: 1 }), projectLoan(base));
  });
  it('rows are read the way the tick reads them', () => {
    const company = loanStateFromRow({ remaining_principal: '500000', interest_rate: '0.08', monthly_payment: '3333',
      months_remaining: null, amortization_type: 'balloon', missed_payments: null }, 'company');
    assert.deepEqual(company, { remaining: 500000, yearlyRate: 0.08, payment: 3333, monthsRemaining: null, amortization: 'balloon', missed: 0 });
    const personal = loanStateFromRow({ remaining_principal: '1000', interest_rate: '0.11', monthly_payment: '22',
      months_remaining: 40, amortization_type: 'balloon', missed_payments: 1 }, 'personal');
    assert.equal(personal.amortization, 'amortizing', 'personal loans are always amortizing');
    assert.equal(personal.monthsRemaining, 40);
  });
});
