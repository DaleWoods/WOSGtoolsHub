import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import type { PublicUser, Role, User } from '../types/index.js';

const SALT_ROUNDS = 12;

const PUBLIC_COLUMNS = 'id, username, role, is_active, theme_preference, created_at, last_login_at';

export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query<User>(`SELECT * FROM users WHERE username = $1`, [username]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await pool.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listUsers(): Promise<PublicUser[]> {
  const result = await pool.query<PublicUser>(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY username ASC`,
  );
  return result.rows;
}

export async function listActiveUsers(): Promise<PublicUser[]> {
  const result = await pool.query<PublicUser>(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE is_active = true ORDER BY username ASC`,
  );
  return result.rows;
}

export async function countUsers(): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM users`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function createUser(username: string, password: string, role: Role): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query<PublicUser>(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [username, passwordHash, role],
  );
  return result.rows[0]!;
}

export async function updateUserRole(id: number, role: Role): Promise<void> {
  await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
}

export async function setUserActive(id: number, isActive: boolean): Promise<void> {
  await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [isActive, id]);
}

export async function deleteUser(id: number): Promise<void> {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
}

export async function recordLogin(id: number): Promise<void> {
  await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
}

export async function setThemePreference(id: number, theme: 'light' | 'dark'): Promise<void> {
  await pool.query(`UPDATE users SET theme_preference = $1 WHERE id = $2`, [theme, id]);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}
