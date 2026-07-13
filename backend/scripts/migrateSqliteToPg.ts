import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../database/database.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ SQLite database file not found at: ${dbPath}`);
    process.exit(1);
  }

  const sqlite = new sqlite3.Database(dbPath);

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let pgPool: pg.Pool;

  if (connectionString) {
    pgPool = new pg.Pool({
      connectionString,
      ssl: process.env.DB_SSL === 'true' || connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });
  } else {
    pgPool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'beauty_elegance',
    });
  }

  console.log('🚀 Starting SQLite to PostgreSQL Data Migration...');

  const getSqliteRows = (table: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      sqlite.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (err) resolve([]); // if table doesn't exist, skip
        else resolve(rows || []);
      });
    });
  };

  const tables = [
    'roles',
    'employees',
    'customers',
    'products',
    'product_gallery',
    'orders',
    'order_items',
    'order_history',
    'ai_queries',
    'coupons',
    'blogs',
    'system_settings'
  ];

  try {
    for (const table of tables) {
      const rows = await getSqliteRows(table);
      if (rows.length === 0) {
        console.log(`ℹ️ Table ${table} has 0 rows or does not exist in SQLite.`);
        continue;
      }

      console.log(`📦 Migrating ${rows.length} rows for table: ${table}...`);
      
      for (const row of rows) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const cols = keys.map(k => `"${k}"`).join(', ');

        const insertSql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        try {
          await pgPool.query(insertSql, values);
        } catch (rowErr: any) {
          console.warn(`⚠️ Warning migrating row in ${table}:`, rowErr.message);
        }
      }

      // Reset sequence for SERIAL PK if table has 'id'
      try {
        await pgPool.query(`
          SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";
        `);
      } catch (seqErr) {
        // Ignored if table doesn't use SERIAL id
      }
    }

    console.log('✅ SQLite to PostgreSQL migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    sqlite.close();
    await pgPool.end();
  }
}

runMigration();
