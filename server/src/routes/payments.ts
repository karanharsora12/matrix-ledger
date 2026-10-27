import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createPayment } from '../services/transaction.service.js';

const router = Router();

const createPaymentSchema = z.object({
  paymentDate: z.string().min(1),
  customerId: z.number().int().positive(),
  billId: z.number().int().positive().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'other']).default('cash'),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/payments
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (customerId) conditions.push(sql`p.customer_id = ${parseInt(String(customerId))}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const paymentsData = await db.execute(
      sql`
        SELECT 
          p.id,
          p.receipt_number as "receiptNumber",
          p.payment_date as "paymentDate",
          p.customer_id as "customerId",
          c.name as "customerName",
          p.bill_id as "billId",
          rb.bill_number as "billNumber",
          p.amount_received as "amount",
          p.payment_method as "paymentMethod",
          p.notes,
          p.created_at as "createdAt"
        FROM payments p
        JOIN customers c ON c.id = p.customer_id
        LEFT JOIN repairing_bills rb ON rb.id = p.bill_id
        ${whereClause}
        ORDER BY p.payment_date DESC, p.id DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `
    );

    const totalResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM payments p ${whereClause}`
    );

    return res.json({
      data: paymentsData.rows,
      pagination: {
        total: parseInt((totalResult.rows[0] as any).count),
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(parseInt((totalResult.rows[0] as any).count) / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/payments
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    }

    const payment = await createPayment({
      ...parsed.data,
      billId: parsed.data.billId ?? undefined,
    });

    return res.status(201).json({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      customerId: payment.customerId,
      billId: payment.billId,
      amount: payment.amountReceived,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      createdAt: payment.createdAt,
    });
  } catch (err) {
    console.error('POST /payments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
