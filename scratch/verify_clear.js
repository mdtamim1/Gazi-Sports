import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beauty_elegance',
});

async function verify() {
  const client = await pool.connect();
  try {
    const productsRes = await client.query('SELECT COUNT(*) FROM products');
    const ordersRes = await client.query('SELECT COUNT(*) FROM orders');
    console.log(`🔍 Verification:`);
    console.log(`  Products count: ${productsRes.rows[0].count}`);
    console.log(`  Orders count: ${ordersRes.rows[0].count}`);
  } catch (err) {
    console.error('Error querying:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
