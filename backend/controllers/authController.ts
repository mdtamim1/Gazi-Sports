import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import db from '../config/db';
import { logSecurityAction } from '../utils/auditLogger';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';
// Short-lived pre-auth token secret (different from main JWT)
const PRE_AUTH_SECRET = (process.env.JWT_SECRET || 'pre-auth-secret') + '-pre';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_ALLOWED_EMAIL = (process.env.ADMIN_ALLOWED_EMAIL || '').toLowerCase().trim();

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────
// Helper: verify Google ID token and return email
// ─────────────────────────────────────────────────
const verifyGoogleIdToken = async (idToken: string): Promise<string | null> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload?.email?.toLowerCase().trim() || null;
  } catch (err) {
    return null;
  }
};

// ─────────────────────────────────────────────────
// STEP 1: Email + Password → Pre-Auth Token
// Returns a short-lived "pre-auth" token (not full access).
// The frontend must complete Google OAuth verification (Step 2)
// before a full JWT is issued.
// ─────────────────────────────────────────────────
export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  db.get(
    `SELECT e.*, r.name as role_name, r.permissions as role_permissions 
     FROM employees e 
     JOIN roles r ON e.role_id = r.id 
     WHERE e.email = ?`,
    [email],
    (err, employee: any) => {
      if (err) {
        console.error('Error fetching employee:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
      }

      if (!employee) {
        logSecurityAction(null, email, 'LOGIN_FAILED', 'Account not found', req);
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      if (employee.status !== 'active') {
        logSecurityAction(employee.id, employee.email, 'LOGIN_FAILED', 'Account is suspended/inactive', req);
        return res.status(403).json({ status: 'error', message: 'Account is inactive or suspended' });
      }

      // Compare password
      bcrypt.compare(password, employee.password_hash, (err, isMatch) => {
        if (err || !isMatch) {
          logSecurityAction(employee.id, employee.email, 'LOGIN_FAILED', 'Invalid password attempt', req);
          return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        // ✅ Credentials correct — issue short-lived pre-auth token (5 minutes)
        // This is NOT a full access token. Google verification still required.
        const preAuthToken = jwt.sign(
          { id: employee.id, email: employee.email, step: 'google_verify_required' },
          PRE_AUTH_SECRET,
          { expiresIn: '5m' }
        );

        logSecurityAction(employee.id, employee.email, 'LOGIN_STEP1_OK', 'Credentials verified, awaiting Google 2FA', req);

        return res.json({
          status: 'success',
          step: 'google_verify_required',
          message: 'Credentials verified. Please complete Google verification.',
          preAuthToken,
        });
      });
    }
  );
};

// ─────────────────────────────────────────────────
// STEP 2: Google ID Token verification
// Validates the pre-auth token from Step 1, then checks
// that the Google account email matches the employee's
// registered email. If both pass, issues a full JWT.
// ─────────────────────────────────────────────────
export const verifyGoogleStep = async (req: Request, res: Response) => {
  const { preAuthToken, googleIdToken } = req.body;

  if (!preAuthToken || !googleIdToken) {
    return res.status(400).json({ status: 'error', message: 'Pre-auth token and Google token are required' });
  }

  // Verify pre-auth token
  let preAuthPayload: any;
  try {
    preAuthPayload = jwt.verify(preAuthToken, PRE_AUTH_SECRET);
  } catch (e) {
    return res.status(401).json({ status: 'error', message: 'Session expired. Please login again.' });
  }

  if (preAuthPayload.step !== 'google_verify_required') {
    return res.status(401).json({ status: 'error', message: 'Invalid token type' });
  }

  // Verify Google ID token and extract email
  const googleEmail = await verifyGoogleIdToken(googleIdToken);
  if (!googleEmail) {
    return res.status(401).json({ status: 'error', message: 'Google verification failed. Invalid or expired Google token.' });
  }

  const employeeEmail = preAuthPayload.email.toLowerCase().trim();

  // For Super Admin: Google email must match ADMIN_ALLOWED_EMAIL
  const isAdmin = employeeEmail === ADMIN_ALLOWED_EMAIL;

  if (isAdmin) {
    if (googleEmail !== ADMIN_ALLOWED_EMAIL) {
      logSecurityAction(preAuthPayload.id, employeeEmail, 'LOGIN_2FA_FAILED',
        `Admin Google email mismatch: got ${googleEmail}`, req);
      return res.status(403).json({
        status: 'error',
        message: `Admin login requires the specific Gmail account (${ADMIN_ALLOWED_EMAIL}). Please sign in with the correct Google account.`,
      });
    }
  } else {
    // For Moderators/Staff: Google email must match their registered email
    if (googleEmail !== employeeEmail) {
      logSecurityAction(preAuthPayload.id, employeeEmail, 'LOGIN_2FA_FAILED',
        `Employee Google email mismatch: expected ${employeeEmail}, got ${googleEmail}`, req);
      return res.status(403).json({
        status: 'error',
        message: `আপনার invited Gmail (${employeeEmail}) দিয়ে Google sign-in করুন। অন্য Gmail দিয়ে login করা যাবে না।`,
      });
    }
  }

  // ✅ Both steps passed — load full employee record and issue JWT
  db.get(
    `SELECT e.*, r.name as role_name, r.permissions as role_permissions 
     FROM employees e 
     JOIN roles r ON e.role_id = r.id 
     WHERE e.id = ? AND e.status = 'active'`,
    [preAuthPayload.id],
    (err, employee: any) => {
      if (err || !employee) {
        return res.status(500).json({ status: 'error', message: 'Failed to load account. Please try again.' });
      }

      let permissions: string[] = [];
      if (employee.role_permissions) {
        try { permissions = JSON.parse(employee.role_permissions); } catch (e) {}
      }

      const token = jwt.sign(
        {
          id: employee.id,
          email: employee.email,
          role: employee.role_name,
          name: `${employee.first_name} ${employee.last_name}`,
          permissions,
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Update last login
      const lastLoginIp = req.ip || req.socket.remoteAddress || '';
      db.run(
        `UPDATE employees SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?`,
        [lastLoginIp, employee.id]
      );

      logSecurityAction(employee.id, employee.email, 'LOGIN_SUCCESS', 'Full 2FA login successful (Email+Password + Google)', req);

      res.json({
        status: 'success',
        message: 'Login successful',
        data: {
          token,
          user: {
            id: employee.id,
            email: employee.email,
            name: `${employee.first_name} ${employee.last_name}`,
            role: employee.role_name,
            department: employee.department,
            avatar: employee.first_name.substring(0, 1) + employee.last_name.substring(0, 1),
            permissions,
          },
        },
      });
    }
  );
};

// ─────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────
export const logout = (req: any, res: Response) => {
  if (req.user) {
    logSecurityAction(req.user.id, req.user.email, 'LOGOUT', 'User logged out', req);
  } else {
    logSecurityAction(null, null, 'LOGOUT', 'User logged out', req);
  }
  res.json({ status: 'success', message: 'Logout successful' });
};

// ─────────────────────────────────────────────────
// Get Profile
// ─────────────────────────────────────────────────
export const getProfile = (req: any, res: Response) => {
  res.json({ status: 'success', data: req.user });
};
