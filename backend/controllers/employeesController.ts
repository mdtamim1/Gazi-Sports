import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import db from '../config/db';
import { logSecurityAction } from '../utils/auditLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const verifyGoogleIdToken = async (idToken: string): Promise<string | null> => {
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    return payload?.email?.toLowerCase().trim() || null;
  } catch (err) {
    return null;
  }
};

// Get all employees
export const getEmployees = (req: Request, res: Response) => {
  db.all(
    `SELECT e.id, e.first_name, e.last_name, e.email, e.status, e.department, e.created_at, e.last_login_at, r.name as role, r.id as role_id 
     FROM employees e 
     JOIN roles r ON e.role_id = r.id
     ORDER BY e.created_at DESC`,
    [],
    (err, rows: any[]) => {
      if (err) {
        console.error('Failed to get employees:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const employees = (rows || []).map(r => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        role: r.role,
        role_id: r.role_id,
        status: r.status,
        department: r.department || 'Operations',
        created_at: r.created_at,
        lastLogin: r.last_login_at || '',
        avatar: r.first_name.substring(0, 1) + r.last_name.substring(0, 1)
      }));

      res.json({ status: 'success', data: employees });
    }
  );
};

// Update employee (role, status, department)
export const updateEmployee = (req: Request, res: Response) => {
  const employeeId = req.params.id;
  const { role_id, status, department } = req.body;

  // Cannot disable EMP-001 (Super Admin)
  if (employeeId === 'EMP-001' && status === 'inactive') {
    return res.status(400).json({ status: 'error', message: 'Cannot deactivate the primary Super Admin account.' });
  }

  db.run(
    `UPDATE employees 
     SET role_id = ?, status = ?, department = ? 
     WHERE id = ?`,
    [role_id, status, department || 'Operations', employeeId],
    function (err) {
      if (err) {
        console.error('Failed to update employee:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'EMPLOYEE_UPDATE',
        `Employee updated: ID ${employeeId} (Role ID: ${role_id}, Status: ${status}, Dept: ${department})`,
        req
      );

      res.json({ status: 'success', message: 'Employee updated successfully' });
    }
  );
};

// Delete employee
export const deleteEmployee = (req: Request, res: Response) => {
  const employeeId = req.params.id;

  if (employeeId === 'EMP-001') {
    return res.status(400).json({ status: 'error', message: 'Cannot delete the primary Super Admin account.' });
  }

  db.run(
    `DELETE FROM employees WHERE id = ?`,
    [employeeId],
    function (err) {
      if (err) {
        console.error('Failed to delete employee:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'EMPLOYEE_DELETE',
        `Employee deleted: ID ${employeeId}`,
        req
      );

      res.json({ status: 'success', message: 'Employee deleted successfully' });
    }
  );
};

// Get all invitations
export const getInvitations = (req: Request, res: Response) => {
  db.all(
    `SELECT i.id, i.email, i.status, i.created_at, i.expires_at, i.token, r.name as role, r.id as role_id 
     FROM employee_invitations i 
     JOIN roles r ON i.role_id = r.id
     ORDER BY i.created_at DESC`,
    [],
    (err, rows: any[]) => {
      if (err) {
        console.error('Failed to get invitations:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const invitations = (rows || []).map(r => ({
        id: r.id,
        email: r.email,
        role: r.role,
        role_id: r.role_id,
        status: r.status,
        created_at: r.created_at,
        expires_at: r.expires_at,
        token: r.token
      }));

      res.json({ status: 'success', data: invitations });
    }
  );
};

// Create invitation token (Invite Moderator/Admin)
export const inviteEmployee = (req: Request, res: Response) => {
  const { email, role_id } = req.body;

  if (!email || !role_id) {
    return res.status(400).json({ status: 'error', message: 'Email and Role are required' });
  }

  // Check if user is already an employee
  db.get('SELECT id FROM employees WHERE email = ?', [email], (err, row) => {
    if (row) {
      return res.status(400).json({ status: 'error', message: 'এই ইমেইল দিয়ে অলরেডি রেজিস্টার্ড ইউজার আছে' });
    }

    // Check if there is already a pending invitation
    db.get("SELECT id FROM employee_invitations WHERE email = ? AND status = 'pending'", [email], (err, inviteRow) => {
      if (inviteRow) {
        return res.status(400).json({ status: 'error', message: 'এই ইমেইলে ইতিমধ্যে একটি পেন্ডিং ইনভাইটেশন পাঠানো আছে' });
      }

      const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const invitationId = `invite-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 Days Expiry

      db.run(
        `INSERT INTO employee_invitations (id, email, role_id, token, status, expires_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [invitationId, email, role_id, token, expiresAt],
        function (err) {
          if (err) {
            console.error('Failed to create invitation:', err);
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }

          const actor = (req as any).user;
          logSecurityAction(
            actor?.id || null,
            actor?.email || null,
            'EMPLOYEE_INVITE',
            `Employee invitation created for: ${email} (Role ID: ${role_id}, Token: ${token})`,
            req
          );

          // Mock sending email to gmail (in real application, NodeMailer is used)
          console.log(`✉️ [SIMULATED EMAIL SENT] to ${email}`);
          console.log(`🔗 Registration Link: http://localhost:5173/register-employee?token=${token}`);

          res.json({
            status: 'success',
            data: {
              id: invitationId,
              email,
              token,
              expires_at: expiresAt
            }
          });
        }
      );
    });
  });
};

// Delete / Revoke Invitation
export const deleteInvitation = (req: Request, res: Response) => {
  const invitationId = req.params.id;

  db.run(
    `DELETE FROM employee_invitations WHERE id = ?`,
    [invitationId],
    function (err) {
      if (err) {
        console.error('Failed to revoke invitation:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'EMPLOYEE_INVITE_REVOKE',
        `Employee invitation revoked: ID ${invitationId}`,
        req
      );

      res.json({ status: 'success', message: 'Invitation revoked successfully' });
    }
  );
};

// Get all roles
export const getRoles = (req: Request, res: Response) => {
  db.all(`SELECT * FROM roles ORDER BY id ASC`, [], (err, rows: any[]) => {
    if (err) {
      console.error('Failed to get roles:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    const roles = (rows || []).map(r => {
      let permissions = [];
      try {
        if (r.permissions) permissions = JSON.parse(r.permissions);
      } catch (e) {
        console.error(`Error parsing permissions for role ${r.name}:`, e);
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description || '',
        is_system: r.is_system === 1,
        permissions
      };
    });

    res.json({ status: 'success', data: roles });
  });
};

// Create a custom role
export const createRole = (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Role name is required' });
  }

  db.run(
    `INSERT INTO roles (name, description, is_system, permissions)
     VALUES (?, ?, 0, ?)`,
    [name, description || '', JSON.stringify(permissions || [])],
    function (err) {
      if (err) {
        console.error('Failed to create role:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'ROLE_CREATE',
        `Custom role created: ${name} (Permissions: ${JSON.stringify(permissions || [])})`,
        req
      );

      res.json({
        status: 'success',
        data: {
          id: this.lastID,
          name,
          description,
          is_system: false,
          permissions: permissions || []
        }
      });
    }
  );
};

// Update a custom role
export const updateRole = (req: Request, res: Response) => {
  const roleId = req.params.id;
  const { name, description, permissions } = req.body;

  // Cannot modify Super Admin or Admin role name to prevent breaking system roles, but permissions can be synced
  db.get(`SELECT * FROM roles WHERE id = ?`, [roleId], (err, role: any) => {
    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    const finalName = role.is_system === 1 ? role.name : name;

    db.run(
      `UPDATE roles 
       SET name = ?, description = ?, permissions = ? 
       WHERE id = ?`,
      [finalName, description || '', JSON.stringify(permissions || []), roleId],
      function (err) {
        if (err) {
          console.error('Failed to update role:', err);
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        const actor = (req as any).user;
        logSecurityAction(
          actor?.id || null,
          actor?.email || null,
          'ROLE_UPDATE',
          `Custom role updated: ${finalName} (ID: ${roleId}, Permissions: ${JSON.stringify(permissions || [])})`,
          req
        );

        res.json({ status: 'success', message: 'Role updated successfully' });
      }
    );
  });
};

// Delete a custom role
export const deleteRole = (req: Request, res: Response) => {
  const roleId = req.params.id;

  db.get(`SELECT is_system FROM roles WHERE id = ?`, [roleId], (err, role: any) => {
    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    if (role.is_system === 1) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete built-in system roles.' });
    }

    db.run(`DELETE FROM roles WHERE id = ?`, [roleId], function (err) {
      if (err) {
        console.error('Failed to delete role:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'ROLE_DELETE',
        `Custom role deleted: ID ${roleId} (${role.name})`,
        req
      );

      res.json({ status: 'success', message: 'Role deleted successfully' });
    });
  });
};

// Public: verify invitation token
export const verifyInvitationToken = (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ status: 'error', message: 'Token is required' });
  }

  db.get(
    `SELECT i.*, r.name as role_name 
     FROM employee_invitations i 
     JOIN roles r ON i.role_id = r.id 
     WHERE i.token = ?`,
    [token],
    (err, row: any) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ status: 'error', message: 'ইনভাইটেশন টোকেনটি সঠিক নয়।' });
      }

      if (row.status !== 'pending') {
        return res.status(400).json({ status: 'error', message: 'ইনভাইটেশন টোকেনটি ইতিমধ্যে ব্যবহার করা হয়েছে।' });
      }

      const expiry = new Date(row.expires_at).getTime();
      if (expiry < Date.now()) {
        return res.status(400).json({ status: 'error', message: 'ইনভাইটেশন লিংকটির মেয়াদ শেষ হয়ে গেছে।' });
      }

      res.json({
        status: 'success',
        data: {
          email: row.email,
          role: row.role_name
        }
      });
    }
  );
};

// Public: register employee using invitation token + Google OAuth
// The invited email MUST match the Google account used to accept
export const registerInvitedEmployee = async (req: Request, res: Response) => {
  const { token, googleIdToken, name } = req.body;

  if (!token || !googleIdToken) {
    return res.status(400).json({ status: 'error', message: 'Token and Google ID token are required' });
  }

  // Verify Google token and get email
  const googleEmail = await verifyGoogleIdToken(googleIdToken);
  if (!googleEmail) {
    return res.status(401).json({ status: 'error', message: 'Google verification failed. Invalid or expired Google token.' });
  }

  db.get(
    `SELECT i.*, r.name as role_name, r.permissions as role_permissions
     FROM employee_invitations i 
     JOIN roles r ON i.role_id = r.id 
     WHERE i.token = ?`,
    [token],
    (err, invite: any) => {
      if (err || !invite) {
        return res.status(400).json({ status: 'error', message: 'Invalid invitation token' });
      }

      if (invite.status !== 'pending') {
        return res.status(400).json({ status: 'error', message: 'এই invitation টোকেনটি ইতিমধ্যে ব্যবহার করা হয়েছে।' });
      }

      const expiry = new Date(invite.expires_at).getTime();
      if (expiry < Date.now()) {
        return res.status(400).json({ status: 'error', message: 'Invitation link has expired. Please request a new invitation.' });
      }

      // Critical check: Google email must exactly match the invited email
      if (googleEmail !== invite.email.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `আপনাকে ${invite.email} দিয়ে Google sign-in করতে হবে। অন্য Gmail দিয়ে accept করা যাবে না।`,
        });
      }

      // Use provided name or derive from Google email
      const displayName = (name || googleEmail.split('@')[0]).trim();
      const parts = displayName.split(' ');
      const first_name = parts[0] || displayName;
      const last_name = parts.slice(1).join(' ') || '';
      const employeeId = `EMP-${Date.now()}`;

      db.serialize(() => {
        // Insert employee (no password_hash needed — Google OAuth only)
        db.run(
          `INSERT INTO employees (id, role_id, first_name, last_name, email, password_hash, status, department)
           VALUES (?, ?, ?, ?, ?, NULL, 'active', 'Operations')`,
          [employeeId, invite.role_id, first_name, last_name, invite.email],
          function (insertErr) {
            if (insertErr) {
              console.error('Error creating invited employee:', insertErr);
              return res.status(500).json({ status: 'error', message: 'Failed to create employee record' });
            }

            // Mark invitation as accepted
            db.run(
              `UPDATE employee_invitations SET status = 'accepted' WHERE id = ?`,
              [invite.id],
              (updateErr) => {
                if (updateErr) console.error('Error updating invitation status:', updateErr);
              }
            );

            // Issue JWT so they are immediately logged in
            let permissions: string[] = [];
            try {
              if (invite.role_permissions) permissions = JSON.parse(invite.role_permissions);
            } catch (e) {}

            const jwtToken = jwt.sign(
              {
                id: employeeId,
                email: invite.email,
                role: invite.role_name,
                name: `${first_name} ${last_name}`.trim(),
                permissions,
              },
              JWT_SECRET,
              { expiresIn: '8h' }
            );

            logSecurityAction(employeeId, invite.email, 'EMPLOYEE_REGISTERED',
              `Employee registered via Google OAuth: ${invite.email} as ${invite.role_name}`, req);

            res.json({
              status: 'success',
              message: 'Registration complete! Welcome aboard.',
              data: {
                token: jwtToken,
                user: {
                  id: employeeId,
                  email: invite.email,
                  name: `${first_name} ${last_name}`.trim(),
                  role: invite.role_name,
                  department: 'Operations',
                  avatar: first_name.substring(0, 1) + (last_name.substring(0, 1) || ''),
                  permissions,
                },
              },
            });
          }
        );
      });
    }
  );
};

// Get all active employees for order assignment (not just moderators)
export const getActiveEmployees = (req: Request, res: Response) => {
  db.all(
    `SELECT e.id, e.first_name, e.last_name, e.email, e.status, r.name as role
     FROM employees e
     JOIN roles r ON e.role_id = r.id
     WHERE e.status = 'active'
     ORDER BY e.first_name ASC`,
    [],
    (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching active employees:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const employees = (rows || []).map(r => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email,
        role: r.role,
        status: r.status
      }));

      res.json({ status: 'success', data: employees });
    }
  );
};

// Keep backward compatibility alias
export const getActiveModerators = getActiveEmployees;

// Toggle employee status (active <-> inactive)
export const toggleEmployeeStatus = (req: Request, res: Response) => {
  const employeeId = req.params.id;

  // Cannot toggle EMP-001 (Super Admin)
  if (employeeId === 'EMP-001') {
    return res.status(400).json({ status: 'error', message: 'Super Admin এর স্ট্যাটাস পরিবর্তন করা যাবে না।' });
  }

  // Get current status
  db.get(`SELECT status FROM employees WHERE id = ?`, [employeeId], (err, row: any) => {
    if (err) {
      console.error('Error fetching employee status:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    const newStatus = row.status === 'active' ? 'inactive' : 'active';

    db.run(
      `UPDATE employees SET status = ? WHERE id = ?`,
      [newStatus, employeeId],
      function (err) {
        if (err) {
          console.error('Error toggling employee status:', err);
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        res.json({
          status: 'success',
          message: `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          data: { id: employeeId, newStatus }
        });
      }
    );
  });
};
