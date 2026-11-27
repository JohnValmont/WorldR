/**
 * Pure rules for bank loans (numbers in constants/banking.ts, tests in tests/banking.test.ts).
 * No database access here.
 */
import {
  AMORTIZATION_TYPES, AmortizationType, BANK_DEFAULT_AFTER_MISSES, COMPANY_FACILITY_SPREAD, COMPANY_FACILITY_TYPES,
  COMPANY_LOAN_DEFAULT_TERM, COMPANY_LOAN_MAX_TERM, COMPANY_LOAN_MIN_TERM, CompanyFacilityType, PERSONAL_LOAN_MAX,
  PERSONAL_LOAN_MIN, PERSONAL_LOAN_NET_WORTH_SHARE, TERM_FACILITY_FIXED_RATE,
} from '../constants/banking';

/** A whole-dollar amount from a request, or null if it isn't a positive finite number. */
export function parseLoanAmount(raw: unknown): number | null {
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const whole = Math.floor(n);
  return whole > 0 ? whole : null;
}

export function isCompanyFacility(v: unknown): v is CompanyFacilityType {
  return typeof v === 'string' && (COMPANY_FACILITY_TYPES as readonly string[]).includes(v);
}

export function parseAmortization(v: unknown): AmortizationType | null {
  if (v === undefined || v === null || v === '') return 'amortizing';
  return typeof v === 'string' && (AMORTIZATION_TYPES as readonly string[]).includes(v) ? (v as AmortizationType) : null;
}

/** A loan term in whole months within the allowed range, or null. */
export function parseTerm(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return COMPANY_LOAN_DEFAULT_TERM;
  const n = Number(v);
  if (!Number.isInteger(n) || n < COMPANY_LOAN_MIN_TERM || n > COMPANY_LOAN_MAX_TERM) return null;
  return n;
}

/** Yearly rate of a company facility before risk premium. */
export function facilityBaseRate(type: CompanyFacilityType, bankBaseRate: number): number {
  return type === 'term' ? TERM_FACILITY_FIXED_RATE : bankBaseRate + COMPANY_FACILITY_SPREAD[type];
}

/** Monthly payment: interest-only for a balloon loan, level payment otherwise. */
export function monthlyPayment(principal: number, yearlyRate: number, termMonths: number, type: AmortizationType = 'amortizing'): number {
  const r = yearlyRate / 12;
  if (type === 'balloon') return Math.round(principal * r);
  if (r <= 0) return Math.round(principal / termMonths);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -termMonths)));
}

/** The most a character may borrow personally. */
export function personalLoanLimit(netWorth: number): number {
  const byWorth = Math.floor(Math.max(0, netWorth) * PERSONAL_LOAN_NET_WORTH_SHARE);
  return Math.min(PERSONAL_LOAN_MAX, byWorth);
}

export function personalLoanAllowed(amount: number, netWorth: number): { ok: boolean; limit: number } {
  const limit = personalLoanLimit(netWorth);
  return { ok: amount >= PERSONAL_LOAN_MIN && amount <= limit, limit };
}

/**
 * A company's balance sheet as the bank reads it, built on the ONE book-value
 * definition (services/companyValue.ts). company_value already has company debt
 * AND bank loans still owed taken off, so:
 *   liabilities = company debt + bank loans still owed
 *   assets      = book value + liabilities
 *   equity      = book value
 * (Before, the dossier used assets = book value + debt and equity = assets − liabilities,
 * which left a loan's cash out of assets and took the loan off equity twice.)
 */
export interface CompanyBalanceSheet { totalAssets: number; totalLiabilities: number; equity: number; ltv: number }
export function companyBalanceSheet(bookValue: number, companyDebt: number, bankLoansOwed: number): CompanyBalanceSheet {
  const equity = Math.max(0, bookValue);
  const totalLiabilities = Math.max(0, companyDebt) + Math.max(0, bankLoansOwed);
  const totalAssets = equity + totalLiabilities;
  return { totalAssets, totalLiabilities, equity, ltv: totalAssets > 0 ? totalLiabilities / totalAssets : 0 };
}

export interface LoanState {
  remaining: number;          // principal still owed
  yearlyRate: number;
  payment: number;            // scheduled monthly payment
  monthsRemaining: number | null; // null for old loans without a term
  amortization: AmortizationType;
  missed: number;             // consecutive missed payments
}

export interface LoanMonth {
  due: number;                // what the borrower must pay this month
  interest: number;
}

/** What is due this month. The last month of a balloon (or any) loan clears it in full. */
export function amountDue(s: LoanState): LoanMonth {
  const interest = Math.round(s.remaining * (s.yearlyRate / 12));
  const lastMonth = s.monthsRemaining !== null && s.monthsRemaining <= 1;
  const due = lastMonth ? s.remaining + interest : Math.min(s.payment, s.remaining + interest);
  return { due, interest };
}

export interface LoanOutcome { remaining: number; monthsRemaining: number | null; missed: number; status: 'ACTIVE' | 'REPAID' | 'DEFAULTED'; paid: number }

/** The loan after this month: paid in full when `canPay`, otherwise a missed month (interest is added to the debt). */
export function settleMonth(s: LoanState, canPay: boolean): LoanOutcome {
  const { due, interest } = amountDue(s);
  if (canPay) {
    const remaining = Math.max(0, s.remaining + interest - due);
    const monthsRemaining = s.monthsRemaining === null ? null : Math.max(0, s.monthsRemaining - 1);
    return { remaining, monthsRemaining, missed: 0, status: remaining <= 0 ? 'REPAID' : 'ACTIVE', paid: due };
  }
  const missed = s.missed + 1;
  return {
    remaining: s.remaining + interest,
    monthsRemaining: s.monthsRemaining,
    missed,
    status: missed >= BANK_DEFAULT_AFTER_MISSES ? 'DEFAULTED' : 'ACTIVE',
    paid: 0,
  };
}
