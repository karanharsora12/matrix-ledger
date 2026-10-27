import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createBill } from '../services/transaction.service.js';

const router = Router();

const createBillSchema = z.object({
  billDate: z.string().min(1, 'Bill date is required'),
  customerId: z.number().int().positive(),
  description: z.string().min(1, 'Description is required'),
  repairCharges: z.number().min(0),
  additionalCharges: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  amountReceived: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'other']).optional().default('cash'),
  paymentReference: z.string().optional().nullable(),
});

function normalizeBill(row: any) {
  if (!row) return row;
  const rawStatus = row.paymentStatus || row.payment_status || row.status || 'UNPAID';
  const upper = String(rawStatus).toUpperCase();
  let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (upper === 'PAID') {
    status = 'paid';
  } else if (upper.includes('PART')) {
    status = 'partial';
  } else {
    status = 'unpaid';
  }

  return {
    id: row.id,
    billNumber: row.billNumber || row.bill_number,
    billDate: row.billDate || row.bill_date,
    customerId: row.customerId || row.customer_id,
    customerName: row.customerName || row.customer_name,
    customerMobile: row.customerMobile || row.customer_mobile,
    customerAddress: row.customerAddress || row.customer_address,
    description: row.repairDescription || row.repair_description || row.description,
    repairCharges: row.repairCharges || row.repair_charges,
    additionalCharges: row.additionalCharges || row.additional_charges,
    discount: row.discount,
    totalAmount: row.totalAmount || row.total_amount,
    amountReceived: row.amountReceived || row.amount_received,
    balanceDue: row.remainingBalance || row.remaining_balance || row.balanceDue || row.balance_due || '0.00',
    status,
    notes: row.notes,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    payments: row.payments,
  };
}

// GET /api/bills
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      customerId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (search && typeof search === 'string') {
      conditions.push(sql`(rb.bill_number ILIKE ${`%${search}%`} OR c.name ILIKE ${`%${search}%`} OR rb.repair_description ILIKE ${`%${search}%`})`);
    }
    if (customerId) conditions.push(sql`rb.customer_id = ${parseInt(String(customerId))}`);
    if (status && status !== 'all') {
      const s = String(status).toUpperCase();
      if (s === 'UNPAID') conditions.push(sql`rb.payment_status = 'UNPAID'`);
      else if (s === 'PARTIAL' || s === 'PARTIALLY_PAID') conditions.push(sql`rb.payment_status = 'PARTIALLY_PAID'`);
      else if (s === 'PAID') conditions.push(sql`rb.payment_status = 'PAID'`);
    }
    if (startDate) conditions.push(sql`rb.bill_date >= ${startDate}`);
    if (endDate) conditions.push(sql`rb.bill_date <= ${endDate}`);

    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    const bills = await db.execute(
      sql`
        SELECT 
          rb.*,
          c.name as customer_name,
          c.mobile as customer_mobile
        FROM repairing_bills rb
        JOIN customers c ON c.id = rb.customer_id
        ${whereClause}
        ORDER BY rb.bill_date DESC, rb.id DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `
    );

    const totalResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM repairing_bills rb
        JOIN customers c ON c.id = rb.customer_id
        ${whereClause}
      `
    );

    const total = parseInt((totalResult.rows[0] as any).count);

    return res.json({
      data: (bills.rows as any[]).map(normalizeBill),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /bills error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/bills/next-number
router.get('/next-number', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`SELECT prefix, current_number + 1 as next_val FROM voucher_sequences WHERE sequence_type = 'BILL'`
    );
    const row = result.rows[0] as any;
    const nextNumber = row ? `${row.prefix}${row.next_val}` : 'BILL-1001';
    return res.json({ nextNumber });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/bills/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = String(req.params.id);
    const id = parseInt(idParam);
    const isNum = !isNaN(id);

    const result = await db.execute(
      sql`
        SELECT 
          rb.*,
          c.name as customer_name,
          c.mobile as customer_mobile,
          c.address as customer_address
        FROM repairing_bills rb
        JOIN customers c ON c.id = rb.customer_id
        WHERE ${isNum ? sql`rb.id = ${id} OR rb.bill_number = ${idParam}` : sql`rb.bill_number = ${idParam}`}
      `
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Bill not found' });

    const billRow = result.rows[0] as any;
    const actualId = billRow.id;

    // Get payments for this bill
    const paymentsResult = await db.execute(
      sql`
        SELECT 
          id,
          receipt_number as "receiptNumber",
          payment_date as "paymentDate",
          customer_id as "customerId",
          bill_id as "billId",
          amount_received as "amount",
          payment_method as "paymentMethod",
          notes,
          created_at as "createdAt"
        FROM payments 
        WHERE bill_id = ${actualId}
        ORDER BY payment_date DESC
      `
    );

    const billData = { ...billRow, payments: paymentsResult.rows };
    return res.json(normalizeBill(billData));
  } catch (err) {
    console.error('GET /bills/:id error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bills
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    }

    const { bill, receiptNumber } = await createBill({
      ...parsed.data,
      amountReceived: parsed.data.amountReceived ?? 0,
      paymentMethod: parsed.data.paymentMethod ?? 'cash',
    });

    return res.status(201).json({ bill: normalizeBill(bill), receiptNumber });
  } catch (err) {
    console.error('POST /bills error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
