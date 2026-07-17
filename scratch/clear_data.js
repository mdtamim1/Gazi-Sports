import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import pg from 'pg';

dotenv.config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

async function clearPostgres() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let pool;
  if (connectionString) {
    pool = new pg.Pool({
      connectionString,
      ssl: process.env.DB_SSL === 'true' || connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });
  } else {
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'beauty_elegance',
    });
  }

  console.log('🔌 Connecting to PostgreSQL...');
  const client = await pool.connect();
  try {
    console.log('🗑️ Deleting order items, history, and orders...');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM order_history');
    await client.query('DELETE FROM orders');

    console.log('🗑️ Deleting product gallery and products...');
    await client.query('DELETE FROM product_gallery');
    await client.query('DELETE FROM products');

    console.log('✅ PostgreSQL database tables successfully cleared!');
  } catch (err) {
    console.error('❌ PostgreSQL deletion failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

async function clearMysql() {
  console.log('🔌 Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'beauty_elegance',
  });

  try {
    console.log('🗑️ Deleting order items, history, and orders...');
    await connection.query('DELETE FROM order_items');
    await connection.query('DELETE FROM order_history');
    await connection.query('DELETE FROM orders');

    console.log('🗑️ Deleting product gallery and products...');
    await connection.query('DELETE FROM product_gallery');
    await connection.query('DELETE FROM products');

    console.log('✅ MySQL database tables successfully cleared!');
  } catch (err) {
    console.error('❌ MySQL deletion failed:', err);
  } finally {
    await connection.end();
  }
}

function clearSqlite() {
  const dbPath = process.env.DATABASE_PATH || path.resolve('database/database.sqlite');
  console.log(`🔌 Connecting to SQLite database at: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('⚠️ SQLite database file does not exist, nothing to clear.');
    return;
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite database:', err);
      return;
    }
  });

  db.serialize(() => {
    console.log('🗑️ Deleting order items, history, and orders...');
    db.run('DELETE FROM order_items');
    db.run('DELETE FROM order_history');
    db.run('DELETE FROM orders');

    console.log('🗑️ Deleting product gallery and products...');
    db.run('DELETE FROM product_gallery');
    db.run('DELETE FROM products', [], (err) => {
      if (err) {
        console.error('❌ SQLite deletion failed:', err);
      } else {
        console.log('✅ SQLite database tables successfully cleared!');
      }
      db.close();
    });
  });
}

async function run() {
  console.log(`Starting clean up for database type: ${DB_TYPE}`);
  if (DB_TYPE === 'postgres') {
    await clearPostgres();
  } else if (DB_TYPE === 'mysql') {
    await clearMysql();
  } else if (DB_TYPE === 'sqlite') {
    clearSqlite();
  } else {
    console.error(`❌ Unsupported database type: ${DB_TYPE}`);
  }
}

run();
