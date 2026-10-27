import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { customers } from '../db/schema.js';
import { eq, ilike, or, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { createOpeningBalanceLedgerEntry } from '../services/transaction.service.js';
import { calculateCustomerBalance } from '../services/ledger.service.js';

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  mobile: z.string().min(1, 'Mobile is required').max(20),
  address: z.string().optional().nullable(),
  openingBalance: z.number().min(0).default(0),
  openingBalanceType: z.enum(['dr', 'cr', 'RECEIVABLE', 'ADVANCE']).default('dr'),
  notes: z.string().optional().nullable(),
});

// Helper to normalize opening balance type for frontend/backend
function normalizeBalanceType(type: string): 'dr' | 'cr' {
  if (type === 'ADVANCE' || type === 'cr') return 'cr';
  return 'dr';
}

function toDbBalanceType(type: string): 'RECEIVABLE' | 'ADVANCE' {
  if (type === 'cr' || type === 'ADVANCE') return 'ADVANCE';
  return 'RECEIVABLE';
}

// GET /api/customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, balanceFilter, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [eq(customers.isActive, true)];

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(customers.name, searchTerm),
          ilike(customers.mobile, searchTerm)
        )!
      );
    }

    const customersData = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name)
      .limit(limitNum)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count ?? 0);

    // Get balances for all returned customers
    const customerIds = customersData.map((c) => c.id);
    let balanceMap: Map<number, { balance: string; type: 'dr' | 'cr' }> = new Map();

    if (customerIds.length > 0) {
      const idList = sql.join(customerIds.map((id) => sql`${id}`), sql`, `);
      const balanceResult = await db.execute(
        sql`
          SELECT 
            customer_id,
            COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as net_balance
          FROM ledger_entries
          WHERE customer_id IN (${idList})
          GROUP BY customer_id
        `
      );

      for (const row of balanceResult.rows as any[]) {
        const net = parseFloat(row.net_balance ?? '0');
        balanceMap.set(row.customer_id, {
          balance: Math.abs(net).toFixed(2),
          type: net >= 0 ? 'dr' : 'cr',
        });
      }
    }

    // Get last transaction date per customer
    const lastTxResult = customerIds.length > 0
      ? await db.execute(
          sql`
            SELECT customer_id, MAX(entry_date) as last_date
            FROM ledger_entries
            WHERE customer_id IN (${sql.join(customerIds.map((id) => sql`${id}`), sql`, `)})
            GROUP BY customer_id
          `
        )
      : { rows: [] };

    const lastTxMap = new Map<number, string>();
    for (const row of (lastTxResult.rows ?? []) as any[]) {
      lastTxMap.set(row.customer_id, row.last_date);
    }

    const enriched = customersData.map((c) => ({
      ...c,
      openingBalanceType: normalizeBalanceType(c.openingBalanceType),
      currentBalance: balanceMap.get(c.id)?.balance ?? '0.00',
      currentBalanceType: balanceMap.get(c.id)?.type ?? 'dr',
      lastTransaction: lastTxMap.get(c.id) ?? null,
    }));

    // Apply balance filter after enrichment
    let filtered = enriched;
    if (balanceFilter) {
      filtered = enriched.filter((c) => {
        const balance = parseFloat(c.currentBalance);
        if (balanceFilter === 'outstanding') return c.currentBalanceType === 'dr' && balance > 0;
        if (balanceFilter === 'advance') return c.currentBalanceType === 'cr' && balance > 0;
        if (balanceFilter === 'settled') return balance === 0;
        return true;
      });
    }

    return res.json({
      data: filtered,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /customers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { balance, type } = await calculateCustomerBalance(id);

    return res.json({
      ...customer,
      openingBalanceType: normalizeBalanceType(customer.openingBalanceType),
      currentBalance: balance,
      currentBalanceType: type,
    });
  } catch (err) {
    console.error('GET /customers/:id error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/customers
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    const dbBalanceType = toDbBalanceType(data.openingBalanceType);

    const [customer] = await db
      .insert(customers)
      .values({
        name: data.name,
        mobile: data.mobile,
        address: data.address ?? null,
        openingBalance: data.openingBalance.toFixed(2),
        openingBalanceType: dbBalanceType,
        notes: data.notes ?? null,
      })
      .returning();

    // Create opening balance ledger entry
    if (data.openingBalance > 0) {
      await createOpeningBalanceLedgerEntry(
        customer.id,
        data.openingBalance,
        dbBalanceType
      );
    }

    return res.status(201).json({
      ...customer,
      openingBalanceType: normalizeBalanceType(customer.openingBalanceType),
    });
  } catch (err) {
    console.error('POST /customers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;

    const [customer] = await db
      .update(customers)
      .set({
        name: data.name,
        mobile: data.mobile,
        address: data.address ?? null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    return res.json({
      ...customer,
      openingBalanceType: normalizeBalanceType(customer.openingBalanceType),
    });
  } catch (err) {
    console.error('PUT /customers/:id error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/customers/:id/ledger
router.get('/:id/ledger', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    const { startDate, endDate, page = '1', limit = '100' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [sql`le.customer_id = ${id}`];

    if (startDate) conditions.push(sql`le.entry_date >= ${startDate}`);
    if (endDate) conditions.push(sql`le.entry_date <= ${endDate}`);

    const whereClause = sql.join(conditions, sql` AND `);

    const entries = await db.execute(
      sql`
        SELECT 
          le.id,
          le.customer_id,
          le.entry_date as "entryDate",
          le.voucher_type as "referenceType",
          le.voucher_id as "referenceId",
          le.voucher_number as "voucherNumber",
          le.description,
          le.debit,
          le.credit,
          le.created_at as "createdAt",
          SUM(le.debit - le.credit) OVER (ORDER BY le.entry_date, le.id) as running_balance
        FROM ledger_entries le
        WHERE ${whereClause}
        ORDER BY le.entry_date, le.id
        LIMIT ${limitNum} OFFSET ${offset}
      `
    );

    const totalResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM ledger_entries le WHERE ${whereClause}`
    );

    const total = parseInt((totalResult.rows[0] as any).count);

    return res.json({
      data: entries.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /customers/:id/ledger error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
