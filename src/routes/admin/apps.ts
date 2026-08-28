import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { listCategories } from '../../services/categories.js';
import { listActiveUsers } from '../../services/users.js';
import {
  createApp,
  deleteApp,
  getAppAccessUserIds,
  getAppById,
  listAllAppsForAdmin,
  reorderAppsInCategory,
  setAppAccess,
  setAppsActiveBulk,
  updateApp,
  type AppInput,
} from '../../services/apps.js';
import { getAdminStats } from '../../services/stats.js';
import { logSecurityEvent } from '../../services/securityLog.js';
import { toCsv } from '../../utils/csv.js';
import { summariseChanges } from '../../utils/diff.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { AppStatus, Visibility } from '../../types/index.js';

const DIFF_FIELDS = ['name', 'description', 'url', 'icon', 'status', 'visibility', 'notes', 'isActive'];

export const adminAppsRouter = Router();

adminAppsRouter.use(requireAdmin);

function parseAppInput(body: Record<string, unknown>): AppInput {
  const visibility: Visibility = body.visibility === 'restricted' ? 'restricted' : 'all';
  const status: AppStatus = body.status === 'beta' || body.status === 'internal' ? body.status : 'live';
  return {
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim(),
    url: String(body.url ?? '').trim(),
    icon: String(body.icon ?? '🔧').trim() || '🔧',
    categoryId: Number(body.categoryId),
    status,
    notes: body.notes ? String(body.notes).trim() : null,
    visibility,
    isActive: body.isActive === 'on' || body.isActive === 'true',
  };
}

adminAppsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [apps, categories, stats] = await Promise.all([
      listAllAppsForAdmin(),
      listCategories(),
      getAdminStats(),
    ]);
    res.render('admin/apps', { apps, categories, stats, toast: req.query.toast ?? null });
  }),
);

adminAppsRouter.get(
  '/export.csv',
  asyncHandler(async (_req, res) => {
    const apps = await listAllAppsForAdmin();
    const csv = toCsv(
      apps.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        url: a.url,
        category: a.category_name,
        status: a.status,
        visibility: a.visibility,
        is_active: a.is_active,
        notes: a.notes ?? '',
        created_at: a.created_at.toISOString(),
      })),
      ['id', 'name', 'description', 'url', 'category', 'status', 'visibility', 'is_active', 'notes', 'created_at'],
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="apps.csv"');
    res.send(csv);
  }),
);

adminAppsRouter.get(
  '/new',
  asyncHandler(async (_req, res) => {
    const categories = await listCategories();
    const users = await listActiveUsers();
    res.render('admin/appForm', { app: null, categories, users, grantedUserIds: [] });
  }),
);

adminAppsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseAppInput(req.body);
    const app = await createApp(input);

    if (input.visibility === 'restricted') {
      const userIds = normaliseUserIds(req.body.userIds);
      await setAppAccess(app.id, userIds);
    }

    await logSecurityEvent('app_created', res.locals.currentUser!.id, app.name, req.ip ?? null);
    res.redirect('/admin/apps?toast=App created');
  }),
);

adminAppsRouter.get(
  '/:id/edit',
  asyncHandler(async (req, res) => {
    const app = await getAppById(Number(req.params.id));
    if (!app) {
      res.status(404).send('Not found');
      return;
    }
    const categories = await listCategories();
    const users = await listActiveUsers();
    const grantedUserIds = app.visibility === 'restricted' ? await getAppAccessUserIds(app.id) : [];
    res.render('admin/appForm', { app, categories, users, grantedUserIds });
  }),
);

adminAppsRouter.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const appIds = Array.isArray(req.body.appIds)
      ? req.body.appIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id))
      : [];
    const action = req.body.action;

    if (appIds.length === 0 || (action !== 'activate' && action !== 'deactivate')) {
      res.status(400).json({ error: 'appIds (non-empty) and action ("activate" | "deactivate") are required' });
      return;
    }

    await setAppsActiveBulk(appIds, action === 'activate');
    await logSecurityEvent(
      'app_updated',
      res.locals.currentUser!.id,
      `${appIds.length} app(s)`,
      req.ip ?? null,
      `Bulk ${action}d: app ids ${appIds.join(', ')}`,
    );
    res.json({ ok: true });
  }),
);

adminAppsRouter.post(
  '/reorder',
  asyncHandler(async (req, res) => {
    const categoryId = Number(req.body.categoryId);
    const orderedIds = req.body.orderedIds;
    if (!Array.isArray(orderedIds) || !orderedIds.every((id) => Number.isInteger(Number(id)))) {
      res.status(400).json({ error: 'orderedIds must be an array' });
      return;
    }
    await reorderAppsInCategory(
      categoryId,
      orderedIds.map((id) => Number(id)),
    );
    res.json({ ok: true });
  }),
);

adminAppsRouter.post(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const before = await getAppById(id);
    const input = parseAppInput(req.body);
    await updateApp(id, input);

    if (input.visibility === 'restricted') {
      const userIds = normaliseUserIds(req.body.userIds);
      await setAppAccess(id, userIds);
    } else {
      await setAppAccess(id, []);
    }

    const details = before
      ? summariseChanges(
          {
            name: before.name,
            description: before.description,
            url: before.url,
            icon: before.icon,
            status: before.status,
            visibility: before.visibility,
            notes: before.notes,
            isActive: before.is_active,
          },
          {
            name: input.name,
            description: input.description,
            url: input.url,
            icon: input.icon,
            status: input.status,
            visibility: input.visibility,
            notes: input.notes,
            isActive: input.isActive,
          },
          DIFF_FIELDS,
        )
      : null;

    await logSecurityEvent('app_updated', res.locals.currentUser!.id, input.name, req.ip ?? null, details);
    res.redirect('/admin/apps?toast=App updated');
  }),
);

adminAppsRouter.post(
  '/:id/delete',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const app = await getAppById(id);
    await deleteApp(id);
    await logSecurityEvent('app_deleted', res.locals.currentUser!.id, app?.name ?? String(id), req.ip ?? null);
    res.redirect('/admin/apps?toast=App deleted');
  }),
);

function normaliseUserIds(raw: unknown): number[] {
  if (raw === undefined) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((v) => Number(v)).filter((n) => Number.isInteger(n));
}
