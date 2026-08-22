import { pool } from '../db/pool.js';
import { isWithinLastDays } from '../utils/time.js';
import type { AppWithCategory, DashboardTile } from '../types/index.js';

const NEW_BADGE_DAYS = 14;
const RECENT_LIMIT = 6;

export async function getVisibleAppsForUser(userId: number, isAdmin: boolean): Promise<AppWithCategory[]> {
  const result = await pool.query<AppWithCategory>(
    `SELECT a.*, c.name AS category_name, c.accent_colour AS category_accent_colour
     FROM apps a
     JOIN categories c ON c.id = a.category_id
     WHERE a.is_active = true
       AND ($2 = true OR a.status != 'internal')
       AND (
         $2 = true
         OR a.visibility = 'all'
         OR EXISTS (SELECT 1 FROM app_access aa WHERE aa.app_id = a.id AND aa.user_id = $1)
       )
     ORDER BY c.sort_order ASC, a.sort_order ASC, a.name ASC`,
    [userId, isAdmin],
  );
  return result.rows;
}

async function getUserOrderMap(userId: number): Promise<Map<number, number>> {
  const result = await pool.query<{ app_id: number; sort_order: number }>(
    `SELECT app_id, sort_order FROM user_app_order WHERE user_id = $1`,
    [userId],
  );
  return new Map(result.rows.map((row) => [row.app_id, row.sort_order]));
}

export async function getLastOpenedMap(userId: number): Promise<Map<number, Date>> {
  const result = await pool.query<{ app_id: number; last_opened_at: Date }>(
    `SELECT app_id, last_opened_at FROM user_app_activity WHERE user_id = $1`,
    [userId],
  );
  return new Map(result.rows.map((row) => [row.app_id, row.last_opened_at]));
}

export async function buildDashboardTiles(userId: number, isAdmin: boolean): Promise<DashboardTile[]> {
  const [apps, orderMap, lastOpenedMap] = await Promise.all([
    getVisibleAppsForUser(userId, isAdmin),
    getUserOrderMap(userId),
    getLastOpenedMap(userId),
  ]);

  const tiles: DashboardTile[] = apps.map((app, index) => ({
    ...app,
    is_new: isWithinLastDays(app.created_at, NEW_BADGE_DAYS),
    is_locked: app.visibility === 'restricted',
    effective_sort_order: orderMap.get(app.id) ?? 1000 + index,
    last_opened_at: lastOpenedMap.get(app.id) ?? null,
  }));

  tiles.sort((a, b) => a.effective_sort_order - b.effective_sort_order);
  return tiles;
}

export async function getRecentlyOpened(userId: number, isAdmin: boolean): Promise<AppWithCategory[]> {
  const result = await pool.query<AppWithCategory>(
    `SELECT a.*, c.name AS category_name, c.accent_colour AS category_accent_colour
     FROM user_app_activity uaa
     JOIN apps a ON a.id = uaa.app_id
     JOIN categories c ON c.id = a.category_id
     WHERE uaa.user_id = $1
       AND a.is_active = true
       AND ($2 = true OR a.status != 'internal')
       AND (
         $2 = true
         OR a.visibility = 'all'
         OR EXISTS (SELECT 1 FROM app_access aa WHERE aa.app_id = a.id AND aa.user_id = $1)
       )
     ORDER BY uaa.last_opened_at DESC
     LIMIT $3`,
    [userId, isAdmin, RECENT_LIMIT],
  );
  return result.rows;
}

export async function recordAppOpened(userId: number, appId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_app_activity (user_id, app_id, last_opened_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id, app_id) DO UPDATE SET last_opened_at = now()`,
    [userId, appId],
  );
}

export async function saveUserAppOrder(userId: number, orderedAppIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedAppIds.length; i++) {
      await client.query(
        `INSERT INTO user_app_order (user_id, app_id, sort_order) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, app_id) DO UPDATE SET sort_order = $3`,
        [userId, orderedAppIds[i], i],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
