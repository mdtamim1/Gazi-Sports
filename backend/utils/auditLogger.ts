import db from '../config/db';

export function logSecurityAction(
  userId: string | null,
  email: string | null,
  actionType: string,
  details: string | null,
  req?: any,
  before?: any,
  after?: any
) {
  const ipAddress = req ? (req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '') : '';
  const userAgent = req ? req.headers['user-agent'] || '' : '';

  const beforeValue = before !== undefined ? (typeof before === 'string' ? before : JSON.stringify(before)) : null;
  const afterValue = after !== undefined ? (typeof after === 'string' ? after : JSON.stringify(after)) : null;

  // Compute changed fields if both before and after are objects
  let changedFields: string | null = null;
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed = [...allKeys].filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (changed.length > 0) changedFields = changed.join(', ');
  }

  db.run(
    `INSERT INTO security_audit_logs (user_id, user_email, action_type, details, ip_address, user_agent, before_value, after_value, changed_fields)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, actionType, details, String(ipAddress), String(userAgent), beforeValue, afterValue, changedFields],
    (err) => {
      if (err) {
        // Fallback: try without new columns (in case migration hasn't run yet)
        db.run(
          `INSERT INTO security_audit_logs (user_id, user_email, action_type, details, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, email, actionType, details, String(ipAddress), String(userAgent)],
          (fallbackErr) => {
            if (fallbackErr) console.error('❌ Failed to save security audit log:', fallbackErr);
          }
        );
      }
    }
  );
}
