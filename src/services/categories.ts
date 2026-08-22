import { pool } from '../db/pool.js';
import type { Category } from '../types/index.js';

export async function listCategories(): Promise<Category[]> {
  const result = await pool.query<Category>(`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`);
  return result.rows;
}

export async function getCategory(id: number): Promise<Category | null> {
  const result = await pool.query<Category>(`SELECT * FROM categories WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function createCategory(name: string, accentColour: string): Promise<Category> {
  const maxOrder = await pool.query<{ max: number | null }>(`SELECT max(sort_order) AS max FROM categories`);
  const nextOrder = (maxOrder.rows[0]?.max ?? -1) + 1;
  const result = await pool.query<Category>(
    `INSERT INTO categories (name, accent_colour, sort_order) VALUES ($1, $2, $3) RETURNING *`,
    [name, accentColour, nextOrder],
  );
  return result.rows[0]!;
}

export async function updateCategory(id: number, name: string, accentColour: string): Promise<void> {
  await pool.query(`UPDATE categories SET name = $1, accent_colour = $2 WHERE id = $3`, [
    name,
    accentColour,
    id,
  ]);
}

export async function categoryHasApps(id: number): Promise<boolean> {
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM apps WHERE category_id = $1`, [
    id,
  ]);
  return Number(result.rows[0]?.count ?? 0) > 0;
}

export async function deleteCategory(id: number): Promise<void> {
  await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
}

export async function reorderCategories(orderedIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(`UPDATE categories SET sort_order = $1 WHERE id = $2`, [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
