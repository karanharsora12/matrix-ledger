import { db } from '../db/index.js';
import { voucherSequences } from '../db/schema.js';
import { sql } from 'drizzle-orm';

type SequenceType = 'BILL' | 'RECEIPT';

/**
 * Atomically generates the next voucher number for a given sequence type.
 * Uses SELECT ... FOR UPDATE or UPDATE ... RETURNING to prevent race conditions.
 */
export async function generateVoucherNumber(
  type: SequenceType,
  tx?: typeof db
): Promise<string> {
  const client = tx ?? db;

  const result = await (client as typeof db).execute(
    sql`
      UPDATE voucher_sequences
      SET current_number = current_number + 1, updated_at = NOW()
      WHERE sequence_type = ${type}
      RETURNING prefix, current_number
    `
  );

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Voucher sequence not found for type: ${type}`);
  }

  const row = result.rows[0] as { prefix: string; current_number: number };
  return `${row.prefix}${row.current_number}`;
}

/**
 * Initialize voucher sequences if they don't exist.
 */
export async function initializeVoucherSequences() {
  const existing = await db.select().from(voucherSequences);

  if (existing.length === 0) {
    await db.insert(voucherSequences).values([
      { sequenceType: 'BILL', prefix: 'BILL-', currentNumber: 1000 },
      { sequenceType: 'RECEIPT', prefix: 'REC-', currentNumber: 1000 },
    ]);
    console.log('Voucher sequences initialized');
  }
}
