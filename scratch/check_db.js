import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'postgres',
  });
  await client.connect();
  console.log('Connected to Postgres.');

  const emps = await client.query("SELECT id, first_name, last_name, email, status FROM employees");
  console.log('=== EMPLOYEES ===');
  console.log(emps.rows);

  const orders = await client.query("SELECT id, status, assigned_to, assigned_name FROM orders");
  console.log('=== ORDERS ===');
  console.log(orders.rows);

  await client.end();
}

check().catch(console.error);
