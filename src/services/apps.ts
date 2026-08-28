import { pool } from '../db/pool.js';
import type { App, AppStatus, AppWithCategory, Visibility } from '../types/index.js';

const WITH_CATEGORY = `
  SELECT a.*, c.name AS category_name, c.accent_colour AS category_accent_colour
  FROM apps a
  JOIN categories c ON c.id = a.category_id
`;

export async function listAllAppsForAdmin(): Promise<AppWithCategory[]> {
  const result = await pool.query<AppWithCategory>(
    `${WITH_CATEGORY} ORDER BY c.sort_order ASC, a.sort_order ASC, a.name ASC`,
  );
  return result.rows;
}

export async function countApps(): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM apps`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function countAppsAddedThisMonth(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM apps WHERE date_trunc('month', created_at) = date_trunc('month', now())`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getAppById(id: number): Promise<AppWithCategory | null> {
  const result = await pool.query<AppWithCategory>(`${WITH_CATEGORY} WHERE a.id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface AppInput {
  name: string;
  description: string;
  url: string;
  icon: string;
  categoryId: number;
  status: AppStatus;
  notes: string | null;
  visibility: Visibility;
  isActive: boolean;
}

export async function createApp(input: AppInput): Promise<App> {
  const maxOrder = await pool.query<{ max: number | null }>(
    `SELECT max(sort_order) AS max FROM apps WHERE category_id = $1`,
    [input.categoryId],
  );
  const nextOrder = (maxOrder.rows[0]?.max ?? -1) + 1;
  const result = await pool.query<App>(
    `INSERT INTO apps (name, description, url, icon, category_id, status, notes, visibility, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.name,
      input.description,
      input.url,
      input.icon,
      input.categoryId,
      input.status,
      input.notes,
      input.visibility,
      input.isActive,
      nextOrder,
    ],
  );
  return result.rows[0]!;
}

export async function updateApp(id: number, input: AppInput): Promise<void> {
  await pool.query(
    `UPDATE apps
     SET name = $1, description = $2, url = $3, icon = $4, category_id = $5,
         status = $6, notes = $7, visibility = $8, is_active = $9, updated_at = now()
     WHERE id = $10`,
    [
      input.name,
      input.description,
      input.url,
      input.icon,
      input.categoryId,
      input.status,
      input.notes,
      input.visibility,
      input.isActive,
      id,
    ],
  );
}

export async function deleteApp(id: number): Promise<void> {
  await pool.query(`DELETE FROM apps WHERE id = $1`, [id]);
}

export async function setAppsActiveBulk(ids: number[], isActive: boolean): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(`UPDATE apps SET is_active = $1, updated_at = now() WHERE id = ANY($2::int[])`, [
    isActive,
    ids,
  ]);
}

export async function reorderAppsInCategory(categoryId: number, orderedIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(`UPDATE apps SET sort_order = $1 WHERE id = $2 AND category_id = $3`, [
        i,
        orderedIds[i],
        categoryId,
      ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getAppAccessUserIds(appId: number): Promise<number[]> {
  const result = await pool.query<{ user_id: number }>(`SELECT user_id FROM app_access WHERE app_id = $1`, [
    appId,
  ]);
  return result.rows.map((row) => row.user_id);
}

export async function setAppAccess(appId: number, userIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM app_access WHERE app_id = $1`, [appId]);
    for (const userId of userIds) {
      await client.query(`INSERT INTO app_access (app_id, user_id) VALUES ($1, $2)`, [appId, userId]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
