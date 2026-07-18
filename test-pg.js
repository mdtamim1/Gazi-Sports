import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'postgres',
});

client.connect()
  .then(() => {
    return client.query("SELECT id, name, slug, sku, published FROM products");
  })
  .then((res) => {
    console.log('Products found in DB:');
    res.rows.forEach(p => console.log(`Product: ID=${p.id}, Name="${p.name}", Slug="${p.slug}", Published=${p.published}`));
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Query Failed:', err.message);
    client.end();
    process.exit(1);
  });
