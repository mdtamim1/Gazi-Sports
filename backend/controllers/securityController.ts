import { Request, Response } from 'express';
import db from '../config/db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getSecurityLogs = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const email = req.query.email as string;
  const actionType = req.query.action_type as string;
  const date = req.query.date as string; // Format: YYYY-MM-DD

  let query = `SELECT * FROM security_audit_logs WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) as count FROM security_audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (email && email.trim()) {
    query += ` AND user_email LIKE ?`;
    countQuery += ` AND user_email LIKE ?`;
    params.push(`%${email.trim()}%`);
  }

  if (actionType && actionType.trim()) {
    query += ` AND action_type = ?`;
    countQuery += ` AND action_type = ?`;
    params.push(actionType.trim());
  }

  if (date && date.trim()) {
    // Standard SQL date check for SQLite, MySQL, and PostgreSQL compatibility
    query += ` AND date(created_at) = date(?)`;
    countQuery += ` AND date(created_at) = date(?)`;
    params.push(date.trim());
  }

  db.get(countQuery, params, (countErr, countRow: any) => {
    if (countErr) {
      console.error('Failed to count security logs:', countErr);
      return res.status(500).json({ status: 'error', message: 'Database error counting logs' });
    }

    const totalLogs = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(totalLogs / limit);

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    db.all(query, queryParams, (err, rows) => {
      if (err) {
        console.error('Failed to fetch security logs:', err);
        return res.status(500).json({ status: 'error', message: 'Database error fetching logs' });
      }

      res.json({
        status: 'success',
        data: rows || [],
        pagination: {
          total: totalLogs,
          page,
          limit,
          totalPages
        }
      });
    });
  });
};

// Generate and stream an on-demand database backup file (Super Admin Only)
export const downloadDatabaseBackup = (req: Request, res: Response) => {
  try {
    const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../database/database.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ status: 'error', message: 'Database backup file not found' });
    }
    const backupName = `gazisports24-backup-${new Date().toISOString().split('T')[0]}.sqlite`;
    res.setHeader('Content-Disposition', `attachment; filename="${backupName}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    fs.createReadStream(dbPath).pipe(res);
  } catch (err) {
    console.error('Error generating database backup:', err);
    res.status(500).json({ status: 'error', message: 'Failed to generate database backup' });
  }
};
