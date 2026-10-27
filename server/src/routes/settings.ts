import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

const updateSettingsSchema = z.object({
  shopName: z.string().min(1).max(255),
  address: z.string().optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  gstNumber: z.string().max(50).optional().nullable(),
  tagline: z.string().max(255).optional().nullable(),
});

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT * FROM shop_settings ORDER BY id ASC LIMIT 1`);
    if (!result.rows.length) {
      return res.json({
        shopName: 'Matrix Repairing Works',
        address: 'Main Market Road, Near Clock Tower',
        mobile: '+91 98765 43210',
        gstNumber: null,
      });
    }
    const row = result.rows[0] as any;
    return res.json({
      shopName: row.shop_name,
      address: row.address,
      mobile: row.phone,
      gstNumber: null,
      tagline: row.tagline,
      billTerms: row.bill_terms,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten().fieldErrors });
    }

    const { shopName, address, mobile, tagline } = parsed.data;

    const result = await db.execute(
      sql`
        UPDATE shop_settings
        SET 
          shop_name = ${shopName},
          address = COALESCE(${address ?? null}, address),
          phone = COALESCE(${mobile ?? null}, phone),
          tagline = COALESCE(${tagline ?? null}, tagline),
          updated_at = NOW()
        WHERE id = (SELECT id FROM shop_settings ORDER BY id ASC LIMIT 1)
        RETURNING *
      `
    );

    if (!result.rows.length) {
      const inserted = await db.execute(
        sql`
          INSERT INTO shop_settings (shop_name, address, phone, tagline, currency_symbol, updated_at)
          VALUES (${shopName}, ${address ?? ''}, ${mobile ?? ''}, ${tagline ?? 'Simple Ledger. Clear Hisab.'}, '₹', NOW())
          RETURNING *
        `
      );
      const row = inserted.rows[0] as any;
      return res.json({
        shopName: row.shop_name,
        address: row.address,
        mobile: row.phone,
        tagline: row.tagline,
      });
    }

    const row = result.rows[0] as any;
    return res.json({
      shopName: row.shop_name,
      address: row.address,
      mobile: row.phone,
      tagline: row.tagline,
    });
  } catch (err) {
    console.error('PUT /settings error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
