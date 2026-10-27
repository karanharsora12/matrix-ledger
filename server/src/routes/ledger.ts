import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { calculateLedgerSummary } from '../services/ledger.service.js';

const router = Router();

function mapVoucherTypeToRefType(vType: string): string {
  const upper = (vType || '').toUpperCase();
  if (upper === 'REPAIR_BILL' || upper === 'BILL') return 'bill';
  if (upper === 'PAYMENT') return 'payment';
  if (upper === 'OPENING_BALANCE') return 'opening_balance';
  return 'adjustment';
}

function mapRefTypeToDb(refType: string): string[] {
  if (refType === 'bill') return ['REPAIR_BILL', 'BILL', 'bill'];
  if (refType === 'payment') return ['PAYMENT', 'payment'];
  if (refType === 'opening_balance') return ['OPENING_BALANCE', 'opening_balance'];
  return [refType];
}

// GET /api/ledger
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      startDate,
      endDate,
      transactionType,
      voucherSearch,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    const today = new Date();
    const defaultStart = '2026-01-01'; // capture all current year data
    const defaultEnd = today.toISOString().split('T')[0];

    const start = (startDate as string) || defaultStart;
    const end = (endDate as string) || defaultEnd;

    const conditions: any[] = [
      sql`le.entry_date >= ${start}`,
      sql`le.entry_date <= ${end}`,
    ];

    if (customerId) {
      conditions.push(sql`le.customer_id = ${parseInt(String(customerId))}`);
    }
    if (transactionType && transactionType !== 'all') {
      const types = mapRefTypeToDb(String(transactionType));
      const typeList = sql.join(types.map((t) => sql`${t}`), sql`, `);
      conditions.push(sql`le.voucher_type IN (${typeList})`);
    }
    if (voucherSearch) {
      conditions.push(sql`le.voucher_number ILIKE ${`%${voucherSearch}%`}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    // Get entries with running balance per customer
    const entries = await db.execute(
      sql`
        SELECT 
          le.id,
          le.customer_id as "customerId",
          le.entry_date as "entryDate",
          le.voucher_type,
          le.voucher_id as "referenceId",
          le.voucher_number as "voucherNumber",
          le.description,
          le.debit,
          le.credit,
          le.created_at as "createdAt",
          c.name as customer_name,
          c.mobile as customer_mobile,
          -- Full running balance up to this entry for this customer
          (
            SELECT COALESCE(SUM(le2.debit - le2.credit), 0)
            FROM ledger_entries le2
            WHERE le2.customer_id = le.customer_id
              AND (le2.entry_date < le.entry_date OR (le2.entry_date = le.entry_date AND le2.id <= le.id))
          ) as running_balance
        FROM ledger_entries le
        JOIN customers c ON c.id = le.customer_id
        WHERE ${whereClause}
        ORDER BY le.entry_date DESC, le.customer_id, le.id DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `
    );

    const totalResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM ledger_entries le
        JOIN customers c ON c.id = le.customer_id
        WHERE ${whereClause}
      `
    );

    const total = parseInt((totalResult.rows[0] as any).count);

    // Get summary
    const summary = await calculateLedgerSummary({
      customerId: customerId ? parseInt(String(customerId)) : undefined,
      startDate: start,
      endDate: end,
    });

    const mappedData = (entries.rows as any[]).map((row) => ({
      ...row,
      referenceType: mapVoucherTypeToRefType(row.voucher_type),
    }));

    return res.json({
      data: mappedData,
      summary,
      filters: { startDate: start, endDate: end },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /ledger error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/ledger/export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { customerId, startDate, endDate, transactionType, voucherSearch } = req.query;

    const today = new Date();
    const defaultStart = '2026-01-01';
    const defaultEnd = today.toISOString().split('T')[0];

    const start = (startDate as string) || defaultStart;
    const end = (endDate as string) || defaultEnd;

    const conditions: any[] = [
      sql`le.entry_date >= ${start}`,
      sql`le.entry_date <= ${end}`,
    ];

    if (customerId) conditions.push(sql`le.customer_id = ${parseInt(String(customerId))}`);
    if (transactionType && transactionType !== 'all') {
      const types = mapRefTypeToDb(String(transactionType));
      const typeList = sql.join(types.map((t) => sql`${t}`), sql`, `);
      conditions.push(sql`le.voucher_type IN (${typeList})`);
    }
    if (voucherSearch) conditions.push(sql`le.voucher_number ILIKE ${`%${voucherSearch}%`}`);

    const whereClause = sql.join(conditions, sql` AND `);

    const entries = await db.execute(
      sql`
        SELECT 
          le.entry_date as "Date",
          c.name as "Customer",
          le.voucher_number as "Voucher Number",
          le.voucher_type as "Voucher Type",
          le.description as "Description",
          le.debit as "Debit",
          le.credit as "Credit"
        FROM ledger_entries le
        JOIN customers c ON c.id = le.customer_id
        WHERE ${whereClause}
        ORDER BY le.entry_date, le.customer_id, le.id
      `
    );

    const rows = entries.rows as any[];
    if (!rows.length) {
      return res.status(200).send('No data found for the selected filters');
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map((row) =>
      Object.values(row)
        .map((v) => (typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(',')
    );

    const csv = [headers, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="matrix-ledger-${start}-to-${end}.csv"`
    );

    return res.send(csv);
  } catch (err) {
    console.error('GET /ledger/export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
