import { pool } from '../db/pool.js';
import type { HealthStatus } from '../types/index.js';

const PING_TIMEOUT_MS = 8000;

async function pingUrl(url: string): Promise<HealthStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (response.status === 405 || response.status === 501) {
      // Some servers reject HEAD outright — retry with GET before calling it down.
      response = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    }
    return response.status < 500 ? 'up' : 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timeout);
  }
}

export async function runHealthChecks(): Promise<void> {
  const result = await pool.query<{ id: number; url: string }>(
    `SELECT id, url FROM apps WHERE is_active = true AND url != ''`,
  );

  await Promise.all(
    result.rows.map(async (app) => {
      const status = await pingUrl(app.url);
      await pool.query(`UPDATE apps SET health_status = $1, health_checked_at = now() WHERE id = $2`, [
        status,
        app.id,
      ]);
    }),
  );
}
