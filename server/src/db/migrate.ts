import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
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
    ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  console.log('Migrations complete!');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
