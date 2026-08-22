import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import {
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  resetUserPassword,
  setUserActive,
  updateUserRole,
} from '../../services/users.js';
import { getAdminStats } from '../../services/stats.js';
import { logSecurityEvent } from '../../services/securityLog.js';
import { validatePasswordStrength } from '../../utils/password.js';
import { toCsv } from '../../utils/csv.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { Role } from '../../types/index.js';

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAdmin);

adminUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [users, stats] = await Promise.all([listUsers(), getAdminStats()]);
    res.render('admin/users', { users, stats, toast: req.query.toast ?? null, error: null });
  }),
);

adminUsersRouter.get(
  '/export.csv',
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    const csv = toCsv(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        is_active: u.is_active,
        last_login_at: u.last_login_at ? u.last_login_at.toISOString() : '',
        created_at: u.created_at.toISOString(),
      })),
      ['id', 'username', 'role', 'is_active', 'last_login_at', 'created_at'],
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  }),
);

adminUsersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const username = String(req.body.username ?? '').trim();
    const password = String(req.body.password ?? '');
    const role: Role = req.body.role === 'admin' ? 'admin' : 'user';

    const passwordError = validatePasswordStrength(password);
    if (!username || passwordError) {
      const [users, stats] = await Promise.all([listUsers(), getAdminStats()]);
      res.status(400).render('admin/users', {
        users,
        stats,
        toast: null,
        error: passwordError ?? 'Username is required',
      });
      return;
    }

    const user = await createUser(username, password, role);
    await logSecurityEvent('user_created', res.locals.currentUser!.id, user.username, req.ip ?? null);
    res.redirect('/admin/users?toast=User created');
  }),
);

adminUsersRouter.post(
  '/:id/role',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const role: Role = req.body.role === 'admin' ? 'admin' : 'user';
    await updateUserRole(id, role);
    const user = await findUserById(id);
    await logSecurityEvent('user_updated', res.locals.currentUser!.id, user?.username ?? String(id), req.ip ?? null);
    res.redirect('/admin/users?toast=Role updated');
  }),
);

adminUsersRouter.post(
  '/:id/active',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === res.locals.currentUser!.id) {
      res.redirect('/admin/users?toast=You cannot deactivate your own account');
      return;
    }
    const isActive = req.body.isActive === 'true';
    await setUserActive(id, isActive);
    const user = await findUserById(id);
    await logSecurityEvent(
      isActive ? 'user_updated' : 'user_deactivated',
      res.locals.currentUser!.id,
      user?.username ?? String(id),
      req.ip ?? null,
    );
    res.redirect(`/admin/users?toast=User ${isActive ? 'activated' : 'deactivated'}`);
  }),
);

adminUsersRouter.post(
  '/:id/delete',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === res.locals.currentUser!.id) {
      res.redirect('/admin/users?toast=You cannot delete your own account');
      return;
    }
    const user = await findUserById(id);
    await deleteUser(id);
    await logSecurityEvent('user_deleted', res.locals.currentUser!.id, user?.username ?? String(id), req.ip ?? null);
    res.redirect('/admin/users?toast=User deleted');
  }),
);

adminUsersRouter.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const password = String(req.body.password ?? '');
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      res.redirect(`/admin/users?toast=${encodeURIComponent(passwordError)}`);
      return;
    }
    await resetUserPassword(id, password);
    const user = await findUserById(id);
    await logSecurityEvent('user_updated', res.locals.currentUser!.id, user?.username ?? String(id), req.ip ?? null);
    res.redirect('/admin/users?toast=Password reset');
  }),
);
