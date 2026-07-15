import { Request, Response } from 'express';
import db from '../config/db';

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
