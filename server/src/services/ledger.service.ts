import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import type { LedgerSummary } from '../types/index.js';

/**
 * Calculate the current balance for a customer from all ledger entries.
 * balance = sum(debit) - sum(credit)
 * positive = customer owes (DR)
 * negative = advance/credit (CR)
 */
export async function calculateCustomerBalance(
  customerId: number
): Promise<{ balance: string; type: 'dr' | 'cr' }> {
  const result = await db.execute(
    sql`
      SELECT 
        COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as net_balance
      FROM ledger_entries
      WHERE customer_id = ${customerId}
    `
  );

  const netBalance = parseFloat((result.rows[0] as any).net_balance ?? '0');

  if (netBalance >= 0) {
    return { balance: netBalance.toFixed(2), type: 'dr' };
  } else {
    return { balance: Math.abs(netBalance).toFixed(2), type: 'cr' };
  }
}

/**
 * Calculate ledger summary for a customer within a date range.
 * Opening balance = net of all entries BEFORE startDate
 */
export async function calculateLedgerSummary(params: {
  customerId?: number;
  startDate: string;
  endDate: string;
}): Promise<LedgerSummary> {
  const { customerId, startDate, endDate } = params;

  const customerFilter = customerId
    ? sql`AND customer_id = ${customerId}`
    : sql``;

  // Opening balance: all entries strictly before startDate
  const openingResult = await db.execute(
    sql`
      SELECT 
        COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as net_opening
      FROM ledger_entries
      WHERE entry_date < ${startDate}
        ${customerFilter}
    `
  );

  const netOpening = parseFloat((openingResult.rows[0] as any).net_opening ?? '0');

  // Period totals: entries within date range
  const periodResult = await db.execute(
    sql`
      SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit
      FROM ledger_entries
      WHERE entry_date >= ${startDate}
        AND entry_date <= ${endDate}
        ${customerFilter}
    `
  );

  const totalDebit = parseFloat((periodResult.rows[0] as any).total_debit ?? '0');
  const totalCredit = parseFloat((periodResult.rows[0] as any).total_credit ?? '0');

  const netClosing = netOpening + totalDebit - totalCredit;

  return {
    openingBalance: Math.abs(netOpening).toFixed(2),
    openingBalanceType: netOpening >= 0 ? 'dr' : 'cr',
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closingBalance: Math.abs(netClosing).toFixed(2),
    closingBalanceType: netClosing >= 0 ? 'dr' : 'cr',
  };
}

/**
 * Get all customer balances for outstanding accounts listing.
 */
export async function getCustomerBalances(): Promise<
  Array<{ customerId: number; balance: string; type: 'dr' | 'cr' }>
> {
  const result = await db.execute(
    sql`
      SELECT 
        customer_id,
        COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as net_balance
      FROM ledger_entries
      GROUP BY customer_id
    `
  );

  return (result.rows as any[]).map((row) => {
    const netBalance = parseFloat(row.net_balance ?? '0');
    return {
      customerId: row.customer_id,
      balance: Math.abs(netBalance).toFixed(2),
      type: netBalance >= 0 ? 'dr' : 'cr',
    };
  });
}
