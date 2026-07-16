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
    return client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  })
  .then((res) => {
    console.log('Tables found in database:');
    if (res.rows.length === 0) {
      console.log('None (Clean Database)');
    } else {
      res.rows.forEach(r => console.log('- ' + r.tablename));
    }
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Query Failed:', err.message);
    client.end();
    process.exit(1);
  });
