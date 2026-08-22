import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { adminAppsRouter } from './apps.js';
import { adminCategoriesRouter } from './categories.js';
import { adminUsersRouter } from './users.js';
import { adminSecurityLogRouter } from './securityLog.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/', (_req, res) => {
  res.redirect('/admin/apps');
});

adminRouter.use('/apps', adminAppsRouter);
adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/security-log', adminSecurityLogRouter);
