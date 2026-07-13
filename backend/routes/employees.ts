import { Router } from 'express';
import {
  getEmployees,
  updateEmployee,
  deleteEmployee,
  getInvitations,
  inviteEmployee,
  deleteInvitation,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  verifyInvitationToken,
  registerInvitedEmployee,
  getActiveEmployees,
  getActiveModerators,
  toggleEmployeeStatus
} from '../controllers/employeesController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public registration routes (Invited employee accepts and submits registration)
router.get('/invite/verify', verifyInvitationToken);
router.post('/invite/register', registerInvitedEmployee);

// Protected routes (Super Admin & Admin only)
router.get('/', authenticateToken, requireRole(['Super Admin', 'Admin']), getEmployees);
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), updateEmployee);
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), deleteEmployee);

// Toggle employee status (active <-> inactive)
router.put('/:id/toggle-status', authenticateToken, requireRole(['Super Admin', 'Admin']), toggleEmployeeStatus);

router.get('/invitations', authenticateToken, requireRole(['Super Admin', 'Admin']), getInvitations);
router.post('/invite', authenticateToken, requireRole(['Super Admin', 'Admin']), inviteEmployee);
router.delete('/invitations/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), deleteInvitation);

router.get('/roles', authenticateToken, requireRole(['Super Admin', 'Admin']), getRoles);
router.post('/roles', authenticateToken, requireRole(['Super Admin', 'Admin']), createRole);
router.put('/roles/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), updateRole);
router.delete('/roles/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), deleteRole);

// Active employees for order sync (all active employees, not just moderators)
router.get('/active-employees', authenticateToken, requireRole(['Super Admin', 'Admin']), getActiveEmployees);
// Backward compatibility: keep old route working
router.get('/active-moderators', authenticateToken, requireRole(['Super Admin', 'Admin']), getActiveModerators);

export default router;
