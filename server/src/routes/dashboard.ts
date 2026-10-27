import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/dashboard
router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const todayStr = today.toISOString().split('T')[0];

    // Total outstanding across all customers with positive DR balance
    const outstandingResult = await db.execute(
      sql`
        SELECT COALESCE(SUM(GREATEST(net_balance, 0)), 0) as total_outstanding
        FROM (
          SELECT customer_id, SUM(debit - credit) as net_balance
          FROM ledger_entries
          GROUP BY customer_id
        ) balances
      `
    );

    // Repair charges billed this month
    const chargesResult = await db.execute(
      sql`
        SELECT COALESCE(SUM(total_amount), 0) as charges
        FROM repairing_bills
        WHERE bill_date >= ${monthStart} AND bill_date <= ${todayStr}
      `
    );

    // Payments received this month
    const paymentsResult = await db.execute(
      sql`
        SELECT COALESCE(SUM(amount_received), 0) as payments
        FROM payments
        WHERE payment_date >= ${monthStart} AND payment_date <= ${todayStr}
      `
    );

    // Total active customers
    const customersResult = await db.execute(
      sql`SELECT COUNT(*) as total FROM customers WHERE is_active = true`
    );

    // Recent activity (latest bills + payments unified)
    const recentActivity = await db.execute(
      sql`
        SELECT 
          rb.id,
          rb.bill_date as date,
          c.name as customer,
          rb.bill_number as reference,
          'bill' as type,
          rb.total_amount as amount,
          rb.payment_status as status
        FROM repairing_bills rb
        JOIN customers c ON c.id = rb.customer_id
        
        UNION ALL
        
        SELECT 
          p.bill_id as id,
          p.payment_date as date,
          c.name as customer,
          p.receipt_number as reference,
          'payment' as type,
          p.amount_received as amount,
          'RECEIVED' as status
        FROM payments p
        JOIN customers c ON c.id = p.customer_id
        
        ORDER BY date DESC
        LIMIT 10
      `
    );

    // Outstanding accounts (customers with pending DR balance)
    const outstandingAccounts = await db.execute(
      sql`
        SELECT 
          c.id,
          c.name,
          c.mobile,
          SUM(le.debit - le.credit) as outstanding_amount,
          MAX(le.entry_date) as last_activity
        FROM customers c
        JOIN ledger_entries le ON le.customer_id = c.id
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.mobile
        HAVING SUM(le.debit - le.credit) > 0
        ORDER BY outstanding_amount DESC
        LIMIT 10
      `
    );

    return res.json({
      metrics: {
        totalOutstanding: (outstandingResult.rows[0] as any)?.total_outstanding ?? '0.00',
        repairChargesThisMonth: (chargesResult.rows[0] as any)?.charges ?? '0.00',
        paymentsReceivedThisMonth: (paymentsResult.rows[0] as any)?.payments ?? '0.00',
        totalCustomers: (customersResult.rows[0] as any)?.total ?? '0',
      },
      recentActivity: recentActivity.rows,
      outstandingAccounts: outstandingAccounts.rows,
    });
  } catch (err) {
    console.error('GET /dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
