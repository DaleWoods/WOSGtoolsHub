import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { listSecurityLog } from '../../services/securityLog.js';
import { getAdminStats } from '../../services/stats.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const adminSecurityLogRouter = Router();

adminSecurityLogRouter.use(requireAdmin);

const EVENT_TYPES = [
  'login_success',
  'login_failure',
  'user_created',
  'user_updated',
  'user_deactivated',
  'user_deleted',
  'app_created',
  'app_updated',
  'app_deleted',
  'category_created',
  'category_updated',
  'category_deleted',
  'access_granted',
  'access_revoked',
];

adminSecurityLogRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : '';
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';

    const [entries, stats] = await Promise.all([
      listSecurityLog({
        eventType: eventType || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
      getAdminStats(),
    ]);

    res.render('admin/securityLog', {
      entries,
      stats,
      eventTypes: EVENT_TYPES,
      filters: { eventType, from, to },
    });
  }),
);
