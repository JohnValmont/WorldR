'use client';
/**
 * The player's bank loans, from GET /banks/loans (bank.controller getMyLoans).
 * Every number is a real row (banking_active_loans, character_debt_facilities)
 * or the server's projection of it with settleMonth, the rule the monthly tick
 * uses. Nothing here is estimated on the client.
 */
import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export interface BankLoan {
  id: string;
  borrower: 'personal' | 'company';
  companyId: string | null;
  companyName: string | null;
  bankId: string;
  bankName: string;
  facilityType: string;
  principal: number;
  remaining: number;
  yearlyRate: number;
  monthlyPayment: number;
  amortization: 'amortizing' | 'balloon';
  missedPayments: number;
  missesUntilDefault: number;
  status: 'active' | 'defaulted';
  monthsLeft: number | null;
  dueNextYear: number;
  finalPayment: number | null;
}

export async function fetchMyLoans(): Promise<BankLoan[]> {
  const { api } = await import('@/lib/api');
  const res = await api.get('/banks/loans');
  return res.data?.loans ?? [];
}

const FACILITY_LABEL: Record<string, string> = {
  personal: 'Personal loan',
  revolver: 'Revolving credit',
  term: 'Term loan',
  trade: 'Trade finance',
};

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const facilityLabel = (t: string) => FACILITY_LABEL[t] ?? t;
const borrowerLabel = (l: BankLoan) => (l.borrower === 'personal' ? 'You (personal)' : l.companyName ?? 'Your company');

function monthsLeftText(l: BankLoan): string {
  if (l.status === 'defaulted') return '—';
  if (l.monthsLeft === null) return 'Not repaid at this payment';
  return `${l.monthsLeft} month${l.monthsLeft === 1 ? '' : 's'}`;
}

/** One plain sentence when a loan needs attention or has a lump sum coming. */
function loanNote(l: BankLoan): { text: string; tone: 'bad' | 'warn' | 'dim' } | null {
  if (l.status === 'defaulted') {
    return { text: 'In default: the bank has stopped collecting, and will not lend to this borrower again.', tone: 'bad' };
  }
  if (l.missedPayments > 0) {
    const left = l.missesUntilDefault;
    return {
      text: `${l.missedPayments} payment${l.missedPayments === 1 ? '' : 's'} missed in a row. ${left <= 1 ? 'Miss the next one and the loan defaults.' : `${left} more misses and the loan defaults.`}`,
      tone: 'warn',
    };
  }
  if (l.monthsLeft === null) {
    return { text: 'The monthly payment no longer covers the interest, so this loan is not paid off.', tone: 'warn' };
  }
  if (l.amortization === 'balloon' && l.finalPayment !== null) {
    return { text: `Balloon loan: interest only each month, then ${money(l.finalPayment)} in the final month.`, tone: 'dim' };
  }
  return null;
}

const toneClass = { bad: 'text-bad', warn: 'text-warn', dim: 'text-ink-dim' } as const;

export function LoanTotals({ loans }: { loans: BankLoan[] }) {
  const owed = loans.reduce((s, l) => s + l.remaining, 0);
  const nextYear = loans.reduce((s, l) => s + l.dueNextYear, 0);
  const defaulted = loans.filter(l => l.status === 'defaulted').length;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-raised border border-line rounded-control p-4">
        <dt className="text-[10px] uppercase tracking-widest text-ink-faint">Still owed</dt>
        <dd className="mt-1 font-mono text-lg font-semibold text-ink">{money(owed)}</dd>
      </div>
      <div className="bg-raised border border-line rounded-control p-4">
        <dt className="text-[10px] uppercase tracking-widest text-ink-faint">Payments due, next 12 months</dt>
        <dd className="mt-1 font-mono text-lg font-semibold text-ink">{money(nextYear)}</dd>
      </div>
      <div className="bg-raised border border-line rounded-control p-4">
        <dt className="text-[10px] uppercase tracking-widest text-ink-faint">Loans</dt>
        <dd className="mt-1 font-mono text-lg font-semibold text-ink">
          {loans.length}
          {defaulted > 0 && <span className="ml-2 text-sm font-sans font-normal text-bad">{defaulted} in default</span>}
        </dd>
      </div>
    </dl>
  );
}

export default function LoanSchedule({ loans, showLender = true, emptyMessage, emptyAction }: {
  loans: BankLoan[];
  showLender?: boolean;
  emptyMessage: string;
  emptyAction?: { label: string; onClick: () => void };
}) {
  if (loans.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-card">
        <EmptyState icon={Activity} heading="No bank loans" message={emptyMessage} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LoanTotals loans={loans} />

      {/* Wide screens: one row per loan. */}
      <div className="hidden md:block bg-surface border border-line rounded-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Your bank loans</caption>
          <thead className="bg-raised text-[10px] uppercase tracking-widest text-ink-faint">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Borrower</th>
              <th scope="col" className="px-4 py-3 font-semibold">Loan</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Still owed</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Monthly payment</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Months left</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Due next 12 months</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loans.map(l => {
              const note = loanNote(l);
              return (
                <React.Fragment key={`${l.borrower}-${l.id}`}>
                  <tr className="text-ink-dim align-top">
                    <td className="px-4 pt-3 pb-2 text-ink">{borrowerLabel(l)}</td>
                    <td className="px-4 pt-3 pb-2">
                      <div className="text-ink">{facilityLabel(l.facilityType)}</div>
                      <div className="text-xs text-ink-faint">
                        {showLender ? `${l.bankName} · ` : ''}{(l.yearlyRate * 100).toFixed(2)}% a year
                      </div>
                    </td>
                    <td className="px-4 pt-3 pb-2 text-right font-mono text-ink">{money(l.remaining)}</td>
                    <td className="px-4 pt-3 pb-2 text-right font-mono">{l.status === 'defaulted' ? '—' : money(l.monthlyPayment)}</td>
                    <td className="px-4 pt-3 pb-2 text-right font-mono">{monthsLeftText(l)}</td>
                    <td className="px-4 pt-3 pb-2 text-right font-mono">{l.status === 'defaulted' ? '—' : money(l.dueNextYear)}</td>
                  </tr>
                  {note && (
                    <tr className="!border-t-0">
                      <td colSpan={6} className={`px-4 pb-3 pt-0 text-xs ${toneClass[note.tone]}`}>
                        {note.tone !== 'dim' && <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5" aria-hidden />}
                        {note.text}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per loan, no sideways scrolling. */}
      <ul className="md:hidden space-y-3" aria-label="Your bank loans">
        {loans.map(l => {
          const note = loanNote(l);
          return (
            <li key={`${l.borrower}-${l.id}`} className="bg-surface border border-line rounded-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-ink font-semibold">{facilityLabel(l.facilityType)}</div>
                <div className="font-mono text-ink">{money(l.remaining)}</div>
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                {borrowerLabel(l)}{showLender ? ` · ${l.bankName}` : ''} · {(l.yearlyRate * 100).toFixed(2)}% a year
              </div>
              <dl className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div><dt className="text-ink-faint">Monthly</dt><dd className="font-mono text-ink-dim">{l.status === 'defaulted' ? '—' : money(l.monthlyPayment)}</dd></div>
                <div><dt className="text-ink-faint">Months left</dt><dd className="font-mono text-ink-dim">{monthsLeftText(l)}</dd></div>
                <div><dt className="text-ink-faint">Next 12 months</dt><dd className="font-mono text-ink-dim">{l.status === 'defaulted' ? '—' : money(l.dueNextYear)}</dd></div>
              </dl>
              {note && <p className={`mt-3 text-xs ${toneClass[note.tone]}`}>{note.text}</p>}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-ink-faint">
        Payments are taken at each month end. &ldquo;Months left&rdquo; and &ldquo;due next 12 months&rdquo; assume every payment is made.
      </p>
    </div>
  );
}
