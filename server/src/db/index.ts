import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_SSL !== 'false' &&
    (process.env.DATABASE_URL?.includes('sslmode=require') ||
      process.env.DATABASE_URL?.includes('render.com') ||
      process.env.DATABASE_URL?.includes('supabase.co') ||
      process.env.DATABASE_URL?.includes('neon.tech') ||
      (isProduction &&
        !process.env.DATABASE_URL?.includes('localhost') &&
        !process.env.DATABASE_URL?.includes('127.0.0.1'))));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const db = drizzle(pool, { schema });

export { pool };
