import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import {
  categoryHasApps,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../../services/categories.js';
import { getAdminStats } from '../../services/stats.js';
import { logSecurityEvent } from '../../services/securityLog.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const adminCategoriesRouter = Router();

adminCategoriesRouter.use(requireAdmin);

adminCategoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [categories, stats] = await Promise.all([listCategories(), getAdminStats()]);
    res.render('admin/categories', { categories, stats, toast: req.query.toast ?? null, error: null });
  }),
);

adminCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name ?? '').trim();
    const accentColour = String(req.body.accentColour ?? '#4f46e5').trim();
    if (!name) {
      res.redirect('/admin/categories?toast=Category name is required');
      return;
    }
    await createCategory(name, accentColour);
    await logSecurityEvent('category_created', res.locals.currentUser!.id, name, req.ip ?? null);
    res.redirect('/admin/categories?toast=Category created');
  }),
);

adminCategoriesRouter.post(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body.name ?? '').trim();
    const accentColour = String(req.body.accentColour ?? '#4f46e5').trim();
    if (!name) {
      res.redirect('/admin/categories?toast=Category name is required');
      return;
    }
    await updateCategory(id, name, accentColour);
    await logSecurityEvent('category_updated', res.locals.currentUser!.id, name, req.ip ?? null);
    res.redirect('/admin/categories?toast=Category updated');
  }),
);

adminCategoriesRouter.post(
  '/:id/delete',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const category = await getCategory(id);
    const hasApps = await categoryHasApps(id);
    if (hasApps) {
      res.redirect('/admin/categories?toast=Cannot delete a category that still has apps — reassign them first');
      return;
    }
    await deleteCategory(id);
    await logSecurityEvent(
      'category_deleted',
      res.locals.currentUser!.id,
      category?.name ?? String(id),
      req.ip ?? null,
    );
    res.redirect('/admin/categories?toast=Category deleted');
  }),
);

adminCategoriesRouter.post(
  '/reorder',
  asyncHandler(async (req, res) => {
    const orderedIds = req.body.orderedIds;
    if (!Array.isArray(orderedIds) || !orderedIds.every((id) => Number.isInteger(Number(id)))) {
      res.status(400).json({ error: 'orderedIds must be an array' });
      return;
    }
    await reorderCategories(orderedIds.map((id) => Number(id)));
    res.json({ ok: true });
  }),
);
