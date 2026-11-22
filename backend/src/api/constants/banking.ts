/**
 * State Bank of Drennia: loan limits and repayment.
 *
 * Every bank loan is repaid monthly by the economy tick (economyTick.service.ts):
 * interest on what is still owed plus some principal. A borrower who cannot pay
 * misses the month (the interest is added to the debt); BANK_DEFAULT_AFTER_MISSES
 * misses in a row and the loan is in default, and the borrower can't borrow again.
 */

export const BANK_ID = 'drennia-national';

/** Company facilities and their yearly rate (spread over the bank's base rate, or fixed). */
export const COMPANY_FACILITY_TYPES = ['revolver', 'term', 'trade'] as const;
export type CompanyFacilityType = typeof COMPANY_FACILITY_TYPES[number];
export const COMPANY_FACILITY_SPREAD: Record<CompanyFacilityType, number> = { revolver: 0.035, term: 0, trade: 0.02 };
/** The term facility has a fixed yearly rate instead of a spread. */
export const TERM_FACILITY_FIXED_RATE = 0.0725;
export const COMPANY_LOAN_DEFAULT_TERM = 36;
export const COMPANY_LOAN_MIN_TERM = 6;
export const COMPANY_LOAN_MAX_TERM = 120;
export const AMORTIZATION_TYPES = ['amortizing', 'balloon'] as const;
export type AmortizationType = typeof AMORTIZATION_TYPES[number];

/** Personal loans: one at a time, 60 months, base rate + 6%. */
export const PERSONAL_LOAN_TERM_MONTHS = 60;
export const PERSONAL_LOAN_SPREAD = 0.06;
/** Most a character may borrow: this share of net worth, never above the hard cap. */
export const PERSONAL_LOAN_NET_WORTH_SHARE = 0.5;
export const PERSONAL_LOAN_MAX = 5_000_000;
export const PERSONAL_LOAN_MIN = 1_000;
/** Ratings too weak for a personal loan. */
export const PERSONAL_LOAN_REFUSED_RATINGS = ['D', 'CCC'];

/** Consecutive missed monthly payments before a loan is in default. */
export const BANK_DEFAULT_AFTER_MISSES = 2;
