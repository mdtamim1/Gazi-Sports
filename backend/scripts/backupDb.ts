import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Ensure backups directory exists
const backupDir = path.resolve(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const dateStr = new Date().toISOString().slice(0, 10);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${DB_TYPE}-${timestamp}.sql`);

console.log(`📦 Starting database backup for DB_TYPE: ${DB_TYPE}...`);

if (DB_TYPE === 'sqlite') {
  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../database/database.sqlite');
  if (fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, backupFile);
      console.log(`✅ SQLite backup saved successfully at: ${backupFile}`);
    } catch (err: any) {
      console.error('❌ SQLite backup failed:', err.message);
    }
  } else {
    console.error('❌ SQLite database file not found at:', dbPath);
  }
} else if (DB_TYPE === 'postgres') {
  const connString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let command = '';

  if (connString) {
    command = `pg_dump "${connString}" -f "${backupFile}"`;
  } else {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'postgres';

    // Set password environment variable for the child process shell
    process.env.PGPASSWORD = password;
    command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${backupFile}"`;
  }

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ PostgreSQL backup command failed:', err.message);
      console.error('Command Output:', stderr);
      return;
    }
    console.log(`✅ PostgreSQL backup saved successfully at: ${backupFile}`);
  });
} else {
  console.log(`⚠️ Database backup is not supported for DB_TYPE: ${DB_TYPE}`);
}
