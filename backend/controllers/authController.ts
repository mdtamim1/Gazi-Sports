import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';

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
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      if (employee.status !== 'active') {
        return res.status(403).json({ status: 'error', message: 'Account is inactive or suspended' });
      }

      // Safe check for hashed password comparison
      bcrypt.compare(password, employee.password_hash, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        let permissions: string[] = [];
        if (employee.role_permissions) {
          try {
            permissions = JSON.parse(employee.role_permissions);
          } catch (e) {}
        }

        // Generate JWT token
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

        // Update last login details
        const lastLoginIp = req.ip || req.socket.remoteAddress || '';
        db.run(
          `UPDATE employees SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?`,
          [lastLoginIp, employee.id]
        );

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
      });
    }
  );
};

export const logout = (req: Request, res: Response) => {
  res.json({ status: 'success', message: 'Logout successful' });
};

export const getProfile = (req: any, res: Response) => {
  res.json({ status: 'success', data: req.user });
};
