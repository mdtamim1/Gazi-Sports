import db from '../config/db';

export function logSecurityAction(
  userId: string | null,
  email: string | null,
  actionType: string,
  details: string | null,
  req?: any
) {
  const ipAddress = req ? (req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '') : '';
  const userAgent = req ? req.headers['user-agent'] || '' : '';

  db.run(
    `INSERT INTO security_audit_logs (user_id, user_email, action_type, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, email, actionType, details, String(ipAddress), String(userAgent)],
    (err) => {
      if (err) {
        console.error('❌ Failed to save security audit log:', err);
      }
    }
  );
}
