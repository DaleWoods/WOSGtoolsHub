import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listCategories } from '../services/categories.js';
import {
  buildDashboardTiles,
  getRecentlyOpened,
  recordAppOpened,
  saveUserAppOrder,
} from '../services/dashboard.js';
import { setThemePreference } from '../services/users.js';
import { getGreeting, getInitials } from '../utils/initials.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = res.locals.currentUser!;
    const isAdmin = user.role === 'admin';

    const [tiles, categories, recent] = await Promise.all([
      buildDashboardTiles(user.id, isAdmin),
      listCategories(),
      getRecentlyOpened(user.id, isAdmin),
    ]);

    const tilesByCategory = new Map<number, typeof tiles>();
    for (const tile of tiles) {
      const list = tilesByCategory.get(tile.category_id) ?? [];
      list.push(tile);
      tilesByCategory.set(tile.category_id, list);
    }
    const groups = categories
      .map((category) => ({ category, tiles: tilesByCategory.get(category.id) ?? [] }))
      .filter((group) => group.tiles.length > 0);

    res.render('dashboard', {
      groups,
      recent,
      greeting: getGreeting(),
      initials: getInitials(user.username),
      theme: user.theme_preference,
    });
  }),
);

dashboardRouter.post(
  '/api/apps/:id/open',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appId = Number(req.params.id);
    if (!Number.isInteger(appId)) {
      res.status(400).json({ error: 'Invalid app id' });
      return;
    }
    await recordAppOpened(res.locals.currentUser!.id, appId);
    res.json({ ok: true });
  }),
);

dashboardRouter.post(
  '/api/dashboard/order',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appIds = req.body.appIds;
    if (!Array.isArray(appIds) || !appIds.every((id) => Number.isInteger(id))) {
      res.status(400).json({ error: 'appIds must be an array of integers' });
      return;
    }
    await saveUserAppOrder(res.locals.currentUser!.id, appIds);
    res.json({ ok: true });
  }),
);

dashboardRouter.post(
  '/api/theme',
  requireAuth,
  asyncHandler(async (req, res) => {
    const theme = req.body.theme;
    if (theme !== 'light' && theme !== 'dark') {
      res.status(400).json({ error: 'theme must be "light" or "dark"' });
      return;
    }
    await setThemePreference(res.locals.currentUser!.id, theme);
    res.json({ ok: true });
  }),
);
