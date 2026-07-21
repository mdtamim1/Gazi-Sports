import sqlite3 from 'sqlite3';
import mysql from 'mysql2';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { seedProducts } from './seedData';
import dotenv from 'dotenv';

dotenv.config();

// Resolve __dirname in ESM node runtime
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
interface DBWrapper {
  run(sql: string, params?: any[], cb?: (this: any, err: Error | null) => void): void;
  run(sql: string, cb?: (this: any, err: Error | null) => void): void;
  get(sql: string, params?: any[], cb?: (err: Error | null, row: any) => void): void;
  get(sql: string, cb?: (err: Error | null, row: any) => void): void;
  all(sql: string, params?: any[], cb?: (err: Error | null, rows: any[]) => void): void;
  all(sql: string, cb?: (err: Error | null, rows: any[]) => void): void;
  serialize(cb: () => void): void;
  prepare(sql: string, cb?: (err: Error | null) => void): any;
  close(cb?: (err: Error | null) => void): void;
}

class MockStatement {
  private sql: string;
  private db: DBWrapper;

  constructor(sql: string, db: DBWrapper) {
    this.sql = sql;
    this.db = db;
  }

  run(params: any[] = [], cb?: (this: any, err: Error | null) => void): this {
    this.db.run(this.sql, params, cb);
    return this;
  }

  finalize(cb?: (err: Error | null) => void): void {
    if (cb) cb(null);
  }
}

function translateSchemaForMysql(sql: string): string {
  let translatedSql = sql;
  translatedSql = translatedSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
  translatedSql = translatedSql.replace(/TEXT PRIMARY KEY/gi, 'VARCHAR(255) PRIMARY KEY');
  translatedSql = translatedSql.replace(/TEXT UNIQUE/gi, 'VARCHAR(255) UNIQUE');
  translatedSql = translatedSql.replace(/REAL/gi, 'DOUBLE');
  return translatedSql;
}

function translateSchemaForPostgres(sql: string): string {
  let translatedSql = sql;
  translatedSql = translatedSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  translatedSql = translatedSql.replace(/TEXT PRIMARY KEY/gi, 'VARCHAR(255) PRIMARY KEY');
  translatedSql = translatedSql.replace(/TEXT UNIQUE/gi, 'VARCHAR(255) UNIQUE');
  translatedSql = translatedSql.replace(/DATETIME/gi, 'TIMESTAMP');
  translatedSql = translatedSql.replace(/REAL/gi, 'DOUBLE PRECISION');
  return translatedSql;
}

function translateSqlForMysql(sql: string): string {
  let translatedSql = sql;
  translatedSql = translatedSql.replace(/INSERT OR REPLACE/gi, 'REPLACE');
  translatedSql = translatedSql.replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE');
  translatedSql = translatedSql.replace(/CREATE INDEX IF NOT EXISTS/gi, 'CREATE INDEX');
  if (translatedSql.toUpperCase().trim() === 'BEGIN TRANSACTION') {
    translatedSql = 'START TRANSACTION';
  }
  return translatedSql;
}

function translateSqlForPostgres(sql: string, params: any[] = []): { sql: string, params: any[] } {
  let translatedSql = sql;
  
  // Replace ? placeholders with $1, $2, ...
  let index = 1;
  translatedSql = translatedSql.replace(/\?/g, () => `$${index++}`);

  // SQLite date & strftime translations for PostgreSQL
  translatedSql = translatedSql.replace(/date\(\s*created_at\s*,\s*'localtime'\s*\)/gi, 'DATE(created_at)');
  translatedSql = translatedSql.replace(/date\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'CURRENT_DATE');
  translatedSql = translatedSql.replace(/date\(\s*'now'\s*,\s*'-1 day'\s*,\s*'localtime'\s*\)/gi, "(CURRENT_DATE - INTERVAL '1 day')");
  translatedSql = translatedSql.replace(/date\(\s*'now'\s*,\s*'-30 day'\s*\)/gi, "(CURRENT_DATE - INTERVAL '30 days')");
  translatedSql = translatedSql.replace(/date\(\s*'now'\s*,\s*'-6 month'\s*,\s*'start of month'\s*\)/gi, "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')");

  translatedSql = translatedSql.replace(/strftime\('%Y-%m',\s*created_at,\s*'localtime'\)/gi, "TO_CHAR(created_at, 'YYYY-MM')");
  translatedSql = translatedSql.replace(/strftime\('%Y-%m',\s*'now',\s*'localtime'\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY-MM')");
  translatedSql = translatedSql.replace(/strftime\('%Y-%m',\s*'now',\s*'-1 month',\s*'localtime'\)/gi, "TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')");
  translatedSql = translatedSql.replace(/strftime\('%Y',\s*created_at,\s*'localtime'\)/gi, "TO_CHAR(created_at, 'YYYY')");
  translatedSql = translatedSql.replace(/strftime\('%Y',\s*'now',\s*'localtime'\)/gi, "TO_CHAR(CURRENT_DATE, 'YYYY')");
  translatedSql = translatedSql.replace(/strftime\('%H',\s*created_at,\s*'localtime'\)/gi, "TO_CHAR(created_at, 'HH24')");

  // Replace SQLite upserts
  if (translatedSql.toUpperCase().includes('INSERT OR REPLACE INTO SYSTEM_SETTINGS')) {
    translatedSql = translatedSql.replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO');
    if (translatedSql.toLowerCase().includes('group_name') && translatedSql.toLowerCase().includes('is_public')) {
      translatedSql += `
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = EXCLUDED.setting_value, group_name = EXCLUDED.group_name, is_public = EXCLUDED.is_public
      `;
    } else {
      translatedSql += `
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = EXCLUDED.setting_value
      `;
    }
  }

  if (translatedSql.toUpperCase().includes('INSERT OR REPLACE INTO COUPONS')) {
    translatedSql = translatedSql.replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO');
    translatedSql += `
      ON CONFLICT (code) 
      DO UPDATE SET type = EXCLUDED.type, value = EXCLUDED.value, expiry = EXCLUDED.expiry, status = EXCLUDED.status
    `;
  }

  if (translatedSql.toUpperCase().includes('INSERT OR IGNORE INTO PRODUCT_GALLERY')) {
    translatedSql = translatedSql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO') + ' ON CONFLICT DO NOTHING';
  }

  if (translatedSql.toUpperCase().trim() === 'BEGIN TRANSACTION') {
    translatedSql = 'BEGIN';
  }

  if (translatedSql.trim().toUpperCase().startsWith('INSERT INTO ') && !translatedSql.toUpperCase().includes(' RETURNING ')) {
    translatedSql = translatedSql.trim() + ' RETURNING id';
  }

  return { sql: translatedSql, params };
}

function parseArgs(args: any[]): { params: any[], cb: any } {
  let params: any[] = [];
  let cb: any = undefined;

  if (args.length === 1) {
    if (typeof args[0] === 'function') {
      cb = args[0];
    } else if (Array.isArray(args[0])) {
      params = args[0];
    }
  } else if (args.length === 2) {
    params = args[0];
    cb = args[1];
  }

  return { params, cb };
}

let dbInstance: any = null;
let mysqlPool: mysql.Pool | null = null;
let pgPool: pg.Pool | null = null;

function connectDatabase() {
  const maxPoolSize = parseInt(process.env.DB_POOL_MAX || '25', 10);
  if (DB_TYPE === 'sqlite') {
    const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../database/database.sqlite');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const sqlite = sqlite3.verbose();
    dbInstance = new sqlite.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to connect to SQLite database:', err.message);
      } else {
        console.log('🔌 Connected to local SQLite database.');
        // Enable WAL mode & 5s busy timeout for high-traffic concurrency & zero DB lock crashes
        dbInstance.run("PRAGMA journal_mode = WAL;");
        dbInstance.run("PRAGMA busy_timeout = 5000;");
        dbInstance.run("PRAGMA synchronous = NORMAL;");
        initializeDatabase();
      }
    });
  } else if (DB_TYPE === 'mysql') {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'beauty_elegance',
      connectionLimit: maxPoolSize,
      multipleStatements: true
    });
    console.log('🔌 Connected to MySQL database pool.');
    initializeDatabase();
  } else if (DB_TYPE === 'postgres') {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (connectionString) {
      pgPool = new pg.Pool({
        connectionString,
        ssl: process.env.DB_SSL === 'true' || connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: maxPoolSize
      });
    } else {
      pgPool = new pg.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'beauty_elegance',
        max: maxPoolSize
      });
    }
    console.log('🔌 Connected to PostgreSQL database pool.');
    initializeDatabase();
  }
}

const db: DBWrapper = {
  run(sql: string, ...args: any[]): void {
    const { params, cb } = parseArgs(args);

    if (DB_TYPE === 'mysql' || DB_TYPE === 'postgres') {
      const upperSql = sql.toUpperCase().trim();
      if (upperSql === 'BEGIN TRANSACTION' || upperSql === 'BEGIN' || upperSql === 'COMMIT' || upperSql === 'ROLLBACK') {
        if (cb) {
          setTimeout(() => cb.call({ lastID: undefined, changes: 0 }, null), 0);
        }
        return;
      }
    }

    if (sql.toUpperCase().includes('CREATE TABLE')) {
      if (DB_TYPE === 'mysql') sql = translateSchemaForMysql(sql);
      else if (DB_TYPE === 'postgres') sql = translateSchemaForPostgres(sql);
    }

    if (DB_TYPE === 'sqlite') {
      dbInstance.run(sql, params, cb);
    } else if (DB_TYPE === 'mysql') {
      const translatedSql = translateSqlForMysql(sql);
      mysqlPool!.query(translatedSql, params, function (err, result) {
        if (cb) {
          const context = {
            lastID: result ? (result as any).insertId : undefined,
            changes: result ? (result as any).affectedRows : undefined
          };
          cb.call(context, err);
        }
      });
    } else if (DB_TYPE === 'postgres') {
      const { sql: translatedSql, params: translatedParams } = translateSqlForPostgres(sql, params);
      pgPool!.query(translatedSql, translatedParams, function (err, result) {
        if (cb) {
          const context = {
            lastID: result && result.rows && result.rows[0] ? result.rows[0].id : undefined,
            changes: result ? result.rowCount : undefined
          };
          cb.call(context, err);
        }
      });
    }
  },

  get(sql: string, ...args: any[]): void {
    const { params, cb } = parseArgs(args);
    if (DB_TYPE === 'sqlite') {
      dbInstance.get(sql, params, cb);
    } else if (DB_TYPE === 'mysql') {
      const translatedSql = translateSqlForMysql(sql);
      mysqlPool!.query(translatedSql, params, function (err, results: any) {
        if (cb) {
          const row = results && results.length > 0 ? results[0] : undefined;
          cb(err, row);
        }
      });
    } else if (DB_TYPE === 'postgres') {
      const { sql: translatedSql, params: translatedParams } = translateSqlForPostgres(sql, params);
      pgPool!.query(translatedSql, translatedParams, function (err, result) {
        if (cb) {
          const row = result && result.rows && result.rows.length > 0 ? result.rows[0] : undefined;
          cb(err, row);
        }
      });
    }
  },

  all(sql: string, ...args: any[]): void {
    const { params, cb } = parseArgs(args);
    if (DB_TYPE === 'sqlite') {
      dbInstance.all(sql, params, cb);
    } else if (DB_TYPE === 'mysql') {
      const translatedSql = translateSqlForMysql(sql);
      mysqlPool!.query(translatedSql, params, function (err, results: any) {
        if (cb) {
          cb(err, results || []);
        }
      });
    } else if (DB_TYPE === 'postgres') {
      const { sql: translatedSql, params: translatedParams } = translateSqlForPostgres(sql, params);
      pgPool!.query(translatedSql, translatedParams, function (err, result) {
        if (cb) {
          cb(err, result ? result.rows : []);
        }
      });
    }
  },

  serialize(cb: () => void): void {
    if (DB_TYPE === 'sqlite') {
      dbInstance.serialize(cb);
    } else {
      cb();
    }
  },

  prepare(sql: string, cb?: (err: Error | null) => void): any {
    if (DB_TYPE === 'sqlite') {
      return dbInstance.prepare(sql, cb);
    } else {
      if (cb) cb(null);
      return new MockStatement(sql, this);
    }
  },

  close(cb?: (err: Error | null) => void): void {
    if (DB_TYPE === 'sqlite') {
      dbInstance.close(cb);
    } else if (DB_TYPE === 'mysql') {
      mysqlPool!.end(cb);
    } else if (DB_TYPE === 'postgres') {
      pgPool!.end().then(() => cb && cb(null)).catch(err => cb && cb(err));
    }
  }
};

// Trigger database connection
connectDatabase();

// Run schema seeding
function initializeDatabase() {
  db.serialize(() => {
    // Check if tables exist, if not, create them
    db.run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        group_name TEXT DEFAULT 'general',
        is_public INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_email TEXT,
        action_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        banner_image TEXT,
        author_name TEXT DEFAULT 'Admin',
        published INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        role_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        department TEXT,
        avatar_url TEXT,
        two_factor_secret TEXT,
        two_factor_enabled INTEGER DEFAULT 0,
        last_login_at TIMESTAMP,
        last_login_ip TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles (id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        avatar_url TEXT,
        segment TEXT DEFAULT 'New',
        status TEXT DEFAULT 'active',
        loyalty_points INTEGER DEFAULT 0,
        risk_score INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.00,
        order_count INTEGER DEFAULT 0,
        last_active_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        label TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS employee_invitations (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        expiry TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'subscribed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        brand TEXT,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL,
        rating REAL DEFAULT 0.0,
        reviews INTEGER DEFAULT 0,
        image TEXT NOT NULL,
        in_stock INTEGER DEFAULT 1,
        published INTEGER DEFAULT 1,
        description TEXT,
        stock INTEGER DEFAULT 0,
        sold INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0.0,
        features TEXT,
        specs TEXT,
        video_url TEXT,
        photo_content TEXT,
        sizes TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run migrations to alter existing table structure safely
    db.run("ALTER TABLE products ADD COLUMN features TEXT", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE products ADD COLUMN specs TEXT", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE products ADD COLUMN video_url TEXT DEFAULT NULL", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE products ADD COLUMN photo_content TEXT DEFAULT NULL", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT '[]'", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE customers ADD COLUMN address TEXT", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE roles ADD COLUMN permissions TEXT", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE events ADD COLUMN video_url TEXT DEFAULT NULL", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE events ADD COLUMN quiz_data TEXT DEFAULT NULL", (err) => {
      // ignore error if column already exists
    });
    db.run("ALTER TABLE events ADD COLUMN discount_value INTEGER DEFAULT 15", (err) => {
      // ignore error if column already exists
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS product_gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);



    db.run(`
      CREATE TABLE IF NOT EXISTS customer_coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_email TEXT NOT NULL,
        code TEXT NOT NULL,
        title TEXT,
        discount_type TEXT DEFAULT 'percentage',
        discount_value REAL DEFAULT 0.0,
        status TEXT DEFAULT 'active',
        source TEXT DEFAULT 'spin_wheel',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer TEXT NOT NULL,
        email TEXT NOT NULL,
        amount REAL NOT NULL,
        items INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        store_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        courier TEXT NOT NULL,
        city TEXT NOT NULL,
        thana TEXT,
        area TEXT,
        customer_note TEXT,
        shop_note TEXT,
        payment_type TEXT DEFAULT 'cod',
        memo_number TEXT,
        delivery_charge REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        status TEXT DEFAULT 'processing',
        assigned_to TEXT DEFAULT NULL,
        assigned_name TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add assigned_to column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE orders ADD COLUMN assigned_to TEXT DEFAULT NULL`, (err) => {
      // Ignore error if column already exists
      if (err && !String(err).includes('duplicate column')) {
        // Column already exists, safe to ignore
      }
    });

    // Migration: Add assigned_name column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE orders ADD COLUMN assigned_name TEXT DEFAULT NULL`, (err) => {
      // Ignore error if column already exists
      if (err && !String(err).includes('duplicate column')) {
        // Column already exists, safe to ignore
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        color TEXT DEFAULT 'Default',
        size TEXT DEFAULT 'Free Size',
        code TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        performed_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        sent INTEGER DEFAULT 0,
        opened INTEGER DEFAULT 0,
        clicked INTEGER DEFAULT 0,
        converted INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0.0,
        start_date TEXT,
        end_date TEXT,
        product_ids TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        reward_coupon_code TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        image_url TEXT,
        video_url TEXT DEFAULT NULL,
        quiz_data TEXT DEFAULT NULL,
        discount_value INTEGER DEFAULT 15,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customer_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_email TEXT NOT NULL,
        event_id TEXT NOT NULL,
        status TEXT DEFAULT 'achieved',
        reward_code TEXT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
      )
    `);

    db.get("SELECT COUNT(*) as count FROM events", (err, row: any) => {
      if (!err && row && row.count === 0) {
        const welcomeQuizJson = JSON.stringify([
          {
            question: "১. কোন খেলায় শাটলকর্ক (shuttlecock) ব্যবহার করা হয়?",
            options: ["ফুটবল (Football)", "ক্রিকেট (Cricket)", "ব্যাডমিন্টন (Badminton)", "টেনিস (Tennis)"],
            correct: "ব্যাডমিন্টন (Badminton)"
          },
          {
            question: "২. গাজী স্পোর্টসের হেক্স ডাম্বেল (Hex Dumbbell Set) সেটের মোট ওজন কত?",
            options: ["১০ কেজি (10kg)", "২০ কেজি (20kg)", "৩০ কেজি (30kg)", "৫ কেজি (5kg)"],
            correct: "২০ কেজি (20kg)"
          },
          {
            question: "৩. পেটের মেদ কমাতে এবং কোর শক্তিশালী করতে নিচের কোন রোলারটি উপযোগী?",
            options: ["ফেস রোলার (Face Roller)", "হেয়ার রোলার (Hair Roller)", "এবি রোলার (AB Roller)"],
            correct: "এবি রোলার (AB Roller)"
          }
        ]);

        const fitnessQuizJson = JSON.stringify([
          {
            question: "১. কার্ডিও এক্সারসাইজের জন্য নিচের কোনটি সবচেয়ে কার্যকর?",
            options: ["ভারোত্তোলন (Weightlifting)", "দড়ি লাফানো (Skipping)", "যোগব্যায়াম (Yoga)"],
            correct: "দড়ি লাফানো (Skipping)"
          },
          {
            question: "২. আমাদের ট্র্যাডমিল সেটের সর্বোচ্চ গতিসীমা কত?",
            options: ["১০ কিমি/ঘণ্টা", "১৬ কিমি/ঘণ্টা", "২২ কিমি/ঘণ্টা"],
            correct: "১৬ কিমি/ঘণ্টা"
          }
        ]);

        db.run(`
          INSERT INTO events (id, title, description, reward_coupon_code, start_date, end_date, image_url, video_url, quiz_data, discount_value, status)
          VALUES 
          ('EVT-001', 'Gazi Sports Welcome Quiz Challenge', 'আমাদের স্টোরের বিভিন্ন প্রোডাক্ট এবং খেলাধুলা বিষয়ক সাধারণ প্রশ্নের সঠিক উত্তর দিয়ে জিতে নিন ১৫% স্পেশাল কুপন ডিসকাউন্ট কোড।', 'GAZIQUIZ', ?, ?, 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', '', ?, 15, 'active'),
          ('EVT-002', 'Summer Fitness Challenge 2026', 'ব্যায়াম ও সুস্থ থাকার এই চ্যালেঞ্জ ইভেন্টটি সম্পন্ন করে জিতে নিন আকর্ষণীয় ২০% ডিসকাউন্ট ভাউচার।', 'FITNESS2026', ?, ?, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80', '', ?, 20, 'active')
        `, [
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          welcomeQuizJson,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
          fitnessQuizJson
        ]);
        db.run(`INSERT OR IGNORE INTO coupons (code, type, value, expiry, status) VALUES ('GAZIQUIZ', 'percentage', 15, '2030-12-31', 'active')`);
        db.run(`INSERT OR IGNORE INTO coupons (code, type, value, expiry, status) VALUES ('FITNESS2026', 'percentage', 20, '2030-12-31', 'active')`);
      }
    });

    db.get("SELECT COUNT(*) as count FROM campaigns", (err, row: any) => {
      if (!err && row && row.count === 0) {
        db.run(`
          INSERT INTO campaigns (id, name, type, status, sent, opened, clicked, converted, revenue, start_date, end_date, product_ids)
          VALUES ('CMP-001', 'ধামাকা ওপেনিং অফার', 'email', 'active', 5000, 2400, 1100, 320, 145000.0, ?, ?, '1,2,3,4')
        `, [
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]
        ]);
      }
    });

    // Seed default roles and super admin employee
    const defaultRoles = [
      { name: 'Super Admin', desc: 'System Administrator with full access', is_system: 1, permissions: ["dashboard", "analytics", "orders", "products", "storefront", "chats", "marketing", "employees", "finance", "security", "settings"] },
      { name: 'Admin', desc: 'Administrator with full management access', is_system: 1, permissions: ["dashboard", "analytics", "orders", "products", "storefront", "chats", "marketing", "employees", "finance", "security", "settings"] },
      { name: 'Moderator', desc: 'Staff with moderate access to orders, products, and support', is_system: 1, permissions: ["dashboard", "orders", "products", "chats"] }
    ];

    let processedCount = 0;
    defaultRoles.forEach(r => {
      db.get("SELECT id FROM roles WHERE name = ?", [r.name], (err, row: any) => {
        const afterRoleProcessed = () => {
          processedCount++;
          if (processedCount === defaultRoles.length) {
            // Seed Super Admin employee if they don't exist
            db.get("SELECT id FROM roles WHERE name = 'Super Admin'", (err, roleRow: any) => {
              if (roleRow) {
                const roleId = roleRow.id;
                db.get("SELECT id FROM employees WHERE email = 'gazisports24@gmail.com'", (err, empRow) => {
                  if (!empRow) {
                    // Admin password: GAZI2424
                    db.run(`
                      INSERT INTO employees (id, role_id, first_name, last_name, email, password_hash, status, department)
                      VALUES ('EMP-001', ?, 'Super', 'Admin', 'gazisports24@gmail.com', '$2b$10$H7tGY4yKRhUtFp9CEQesmunrUbgdeylCocwTj.aV4Z/ufnQYhkeK.', 'active', 'Management')
                    `, [roleId]);
                  }
                });
              }
            });
          }
        };

        if (!row) {
          db.run(
            "INSERT INTO roles (name, description, is_system, permissions) VALUES (?, ?, ?, ?)",
            [r.name, r.desc, r.is_system, JSON.stringify(r.permissions)],
            afterRoleProcessed
          );
        } else {
          db.run(
            "UPDATE roles SET permissions = ?, description = ? WHERE id = ?",
            [JSON.stringify(r.permissions), r.desc, row.id],
            afterRoleProcessed
          );
        }
      });
    });

    if (process.env.SEED_DATABASE === 'true') {
      db.get("SELECT COUNT(*) as count FROM products WHERE id LIKE 'PRD-00%'", (err, row: any) => {
        if (err) {
          console.error('Error checking product seed existence:', err);
          return;
        }
        if (row && row.count > 0) {
          console.log('✔ Default products already seeded.');
          return;
        }

        const stmt = db.prepare(`
        INSERT INTO products (id, name, slug, sku, brand, category, price, original_price, rating, reviews, image, in_stock, published, description, stock, features, specs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      seedProducts.forEach((p: any) => {
        stmt.run([
          p.id, p.name, p.slug, p.sku, p.brand, p.category, p.price, p.original_price, p.rating, p.reviews, p.image, p.in_stock, p.published, p.description, p.stock,
          JSON.stringify(p.features || []), JSON.stringify(p.specs || [])
        ]);
      });
      stmt.finalize(() => {
        console.log('🌱 Seeded 8 default products with features/specs into the database.');
        
        // Seed default products galleries
        seedProducts.forEach((p: any) => {
          if (p.gallery && Array.isArray(p.gallery)) {
            p.gallery.forEach((imgUrl: string) => {
              db.run(`INSERT OR IGNORE INTO product_gallery (product_id, image_url) VALUES (?, ?)`, [p.id, imgUrl]);
            });
          }
        });
        console.log('🖼️ Seeded default product galleries.');
      });
    });
  }



    // Seed default system settings if table is empty
    db.get("SELECT COUNT(*) as count FROM system_settings", (err, row: any) => {
      if (!err && row && row.count === 0) {
        const defaultSettings = [
          { key: 'site_name', val: 'VIP Commerce Control Center', group: 'general' },
          { key: 'site_url', val: 'https://admin.vipcommerce.com', group: 'general' },
          { key: 'timezone', val: 'Asia/Dhaka (GMT+6)', group: 'general' },
          { key: 'currency', val: 'BDT (৳)', group: 'general' },
          { key: 'maintenance_mode', val: '0', group: 'general' },
          { key: 'email_provider', val: 'SendGrid', group: 'email' },
          { key: 'smtp_host', val: 'smtp.sendgrid.net', group: 'email' },
          { key: 'smtp_port', val: '587', group: 'email' },
          { key: 'cache_driver', val: 'Redis', group: 'cache' }
        ];

        db.serialize(() => {
          const stmt = db.prepare(`
            INSERT INTO system_settings (setting_key, setting_value, group_name)
            VALUES (?, ?, ?)
          `);
          defaultSettings.forEach(s => {
            stmt.run([s.key, s.val, s.group]);
          });
          stmt.finalize(() => {
            console.log('🌱 Seeded default system settings into database.');
          });
        });
      }
    });

    if (process.env.SEED_DATABASE === 'true') {
      db.get("SELECT COUNT(*) as count FROM blog_posts", (err, row: any) => {
        if (!err && row && row.count === 0) {
          const defaultBlogs = [
          {
            id: 'blog-1',
            title: '৫টি সহজ উপায়ে আপনার স্কিন গ্লোয়িং ও হেলদি রাখুন',
            slug: '5-ways-glowing-healthy-skin',
            summary: 'স্কিন কেয়ার বা ত্বকের যত্ন নেওয়া কঠিন কিছু নয়। মাত্র কয়েকটি সাধারণ নিয়ম মেনে চললে আপনিও পেতে পারেন উজ্জ্বল ও সতেজ ত্বক। বিস্তারিত পড়ুন আমাদের আজকের ব্লগে।',
            content: `<p>সুন্দর, উজ্জ্বল ও সুস্থ ত্বক সবারই কাম্য। তবে ব্যস্ত জীবনের ধকল, দূষণ ও সঠিক যত্নের অভাবে আমাদের ত্বক প্রায়শই সতেজতা হারিয়ে ফেলে। ত্বককে প্রাকৃতিকভাবে গ্লোয়িং ও হেলদি রাখার জন্য এখানে ৫টি অত্যন্ত কার্যকর ও সহজ উপায় আলোচনা করা হলো:</p>

<h3>১. পর্যাপ্ত পানি পান করুন</h3>
<p>ত্বকের আর্দ্রতা ধরে রাখার সবচেয়ে সহজ উপায় হলো প্রচুর পানি পান করা। প্রতিদিন অন্তত ৮-১০ গ্লাস পানি পান করুন। এটি আপনার শরীর থেকে ক্ষতিকর টক্সিন বের করে দিতে সাহায্য করে এবং ত্বকে প্রাকৃতিক উজ্জ্বলতা এনে দেয়।</p>

<h3>২. ডাবল ক্লিনজিং পদ্ধতি ব্যবহার করুন</h3>
<p>সারাদিনের ধুলোবালি ও মেকআপ দূর করার জন্য শুধু ফেসওয়াশ যথেষ্ট নয়। প্রথমে একটি অয়েল-বেসড ক্লিনার বা মাইসেলার ওয়াটার দিয়ে ত্বক পরিষ্কার করুন। এরপর আপনার স্কিন টাইপ অনুযায়ী ফেসওয়াশ ব্যবহার করুন।</p>

<h3>৩. রেগুলার ময়েশ্চারাইজার ও সানস্ক্রিন ব্যবহার</h3>
<p>স্কিন টাইপ যেমনই হোক না কেন, ময়েশ্চারাইজার ব্যবহার করা জরুরি। আর দিনের বেলা ঘরের বাইরে বা ভেতরে যেখানেই থাকুন না কেন, অন্তত SPF 30+ সমৃদ্ধ সানস্ক্রিন ব্যবহার করতে ভুলবেন না। এটি ত্বকে সানবার্ন ও অকাল বার্ধক্য প্রতিরোধ করে।</p>

<h3>৪. সুষম খাবার ও পর্যাপ্ত ঘুম</h3>
<p>ভিটামিন সি এবং ই সমৃদ্ধ ফলমূল যেমন লেবু, পেয়ারা, কমলা ইত্যাদি আপনার খাদ্যতালিকায় রাখুন। এছাড়াও প্রতিদিন ৭-৮ ঘণ্টার ভালো ঘুম ত্বক কোষের পুনর্গঠনে অত্যন্ত সাহায্য করে।</p>

<h3>৫. ঘরোয়া ফেসপ্যাকের ব্যবহার</h3>
<p>সপ্তাহে অন্তত একদিন বেসন, মধু এবং টকদই মিশিয়ে কাস্টম ফেসপ্যাক তৈরি করে মুখে লাগাতে পারেন। এটি ত্বককে প্রাকৃতিকভাবে এক্সফোলিয়েট করে এবং ইনস্ট্যান্ট গ্লো এনে দেয়।</p>

<p>ত্বকের যত্ন নেওয়ার ক্ষেত্রে ধারাবাহিকতা সবচেয়ে গুরুত্বপূর্ণ। আজ থেকেই এই নিয়মগুলো মেনে চলা শুরু করুন এবং অল্প কিছুদিনের মধ্যেই আপনার ত্বকের পরিবর্তন লক্ষ্য করুন!</p>`,
            banner_image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
            author_name: 'সাবিহা ইয়াসমিন',
            published: 1
          },
          {
            id: 'blog-2',
            title: 'মেকআপ ব্রাশ পরিষ্কার করার সঠিক নিয়ম ও গুরুত্ব',
            slug: 'how-to-clean-makeup-brushes-correctly',
            summary: 'অপরিষ্কার মেকআপ ব্রাশ ব্যবহার করলে ত্বকে ব্রণ ও অন্যান্য সমস্যা হতে পারে। ব্রাশ পরিষ্কার করার সহজ ও সঠিক নিয়মটি জেনে নিন এই ব্লগের মাধ্যমে।',
            content: `<p>মেকআপপ্রেমীদের কাছে মেকআপ ব্রাশ এবং ব্লেন্ডার অত্যন্ত মূল্যবান সরঞ্জাম। তবে এগুলো সঠিক সময়ে পরিষ্কার না করা হলে তা আপনার ত্বকের জন্য মারাত্মক ক্ষতিকর হতে পারে। নোংরা ব্রাশে ব্যাকটেরিয়া জমে থাকে, যা ত্বকে ব্রণ, ফুসকুড়ি ও ইনফেকশন তৈরি করতে পারে।</p>

<h3>কেন মেকআপ ব্রাশ পরিষ্কার করবেন?</h3>
<ul>
  <li><strong>ত্বকের সুরক্ষায়:</strong> ব্রাশে থাকা অতিরিক্ত তেল, মৃত চামড়া এবং ধুলাবালি সরাসরি ত্বকের সংস্পর্শে আসে, যা পোরস ব্লক করে দেয়।</li>
  <li><strong>মেকআপের পারফেকশনের জন্য:</strong> নোংরা ব্রাশে আগে লেগে থাকা মেকআপের কারণে নতুন মেকআপ ব্লেন্ড করতে সমস্যা হয়।</li>
  <li><strong>ব্রাশের স্থায়িত্ব বাড়াতে:</strong> নিয়মিত পরিষ্কার করলে ব্রাশের ব্রিসলস নরম ও টেকসই থাকে।</li>
</ul>

<h3>পরিষ্কার করার সহজ ধাপসমূহ:</h3>
<ol>
  <li><strong>ব্রাশ ভেজানো:</strong> হালকা গরম পানিতে ব্রাশের ব্রিসলস বা চুলগুলো ভিজিয়ে নিন। লক্ষ্য রাখবেন যেন হ্যান্ডেল এবং ব্রিসলসের সংযোগস্থলে পানি না যায়, এতে আঠা আলগা হয়ে চুল পড়ে যেতে পারে।</li>
  <li><strong>ক্লিনজার ব্যবহার:</strong> একটি পাত্রে সামান্য বেবি শ্যাম্পু অথবা ব্রাশ ক্লিনজার নিন। সেখানে ব্রাশটি আলতোভাবে ঘুরিয়ে ফেনা তৈরি করুন।</li>
  <li><strong>স্ক্রাবিং:</strong> হাতের তালুতে অথবা একটি সিলিকন স্ক্রাব প্যাডে ব্রাশের মাথাটি আলতো করে ঘষুন যাতে জমে থাকা মেকআপ উঠে আসে।</li>
  <li><strong>ধুয়ে ফেলা:</strong> পরিষ্কার পানি দিয়ে ব্রাশের মাথাটি ধুয়ে ফেলুন যতক্ষণ না পর্যন্ত ফেনা চলে যায়।</li>
  <li><strong>শুকানো:</strong> অতিরিক্ত পানি চিপে বের করে একটি শুকনা তোয়ালেতে ব্রাশগুলো সমান করে বিছিয়ে দিন। কখনোই ব্রাশ সোজা খাড়া করে শুকাবেন না, এতে পানি হ্যান্ডেলের ভেতরে চলে যায়।</li>
</ol>

<p>নিয়মিত সপ্তাহে অন্তত একবার আপনার ব্যবহৃত মেকআপ ব্রাশ ও স্পঞ্জ পরিষ্কার করার অভ্যাস গড়ে তুলুন এবং ত্বককে রাখুন রোগমুক্ত ও সতেজ!</p>`,
            banner_image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
            author_name: 'তানিয়া রহমান',
            published: 1
          }
        ];

        db.serialize(() => {
          const stmt = db.prepare(`
            INSERT INTO blog_posts (id, title, slug, summary, content, banner_image, author_name, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          defaultBlogs.forEach(b => {
            stmt.run([b.id, b.title, b.slug, b.summary, b.content, b.banner_image, b.author_name, b.published]);
          });
          stmt.finalize(() => {
            console.log('🌱 Seeded 2 default blog posts into database.');
          });
        });
      }
    });
  }

    // ---- DATABASE INDEXING FOR PERFORMANCE OPTIMIZATION ----
    const createIndex = (name: string, sql: string) => {
      db.run(sql, (err) => {
        if (err) {
          const errMsg = String(err).toLowerCase();
          if (!errMsg.includes('already exists') && !errMsg.includes('duplicate')) {
            console.warn(`⚠️ Warning: Could not create index ${name}: ${err.message}`);
          }
        }
      });
    };

    createIndex('idx_products_category', 'CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)');
    createIndex('idx_products_published', 'CREATE INDEX IF NOT EXISTS idx_products_published ON products (published)');
    createIndex('idx_products_slug', 'CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug)');
    createIndex('idx_products_in_stock', 'CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products (in_stock)');
    createIndex('idx_orders_email', 'CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email)');
    createIndex('idx_orders_status', 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)');
    createIndex('idx_orders_created_at', 'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)');
    createIndex('idx_customer_coupons_email', 'CREATE INDEX IF NOT EXISTS idx_customer_coupons_email ON customer_coupons (customer_email)');
    createIndex('idx_coupons_code', 'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code)');
    createIndex('idx_coupons_status', 'CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons (status)');
    createIndex('idx_order_items_order_id', 'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)');
    createIndex('idx_support_messages_customer', 'CREATE INDEX IF NOT EXISTS idx_support_messages_customer ON support_messages (customer_id)');
    createIndex('idx_security_logs_created_at', 'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_audit_logs (created_at DESC)');

    console.log('✅ Database Schema verification & seeding completed.');
  });
}

export default db;
