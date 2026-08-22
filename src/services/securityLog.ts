import { pool } from '../db/pool.js';
import type { SecurityEventType, SecurityLogEntry } from '../types/index.js';

export async function logSecurityEvent(
  eventType: SecurityEventType,
  actorUserId: number | null,
  target: string | null,
  ipAddress: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO security_log (event_type, actor_user_id, target, ip_address) VALUES ($1, $2, $3, $4)`,
    [eventType, actorUserId, target, ipAddress],
  );
}

export interface SecurityLogFilter {
  eventType?: string;
  from?: string;
  to?: string;
}

export async function listSecurityLog(filter: SecurityLogFilter): Promise<SecurityLogEntry[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.eventType) {
    params.push(filter.eventType);
    conditions.push(`sl.event_type = $${params.length}`);
  }
  if (filter.from) {
    params.push(filter.from);
    conditions.push(`sl.created_at >= $${params.length}::date`);
  }
  if (filter.to) {
    params.push(filter.to);
    conditions.push(`sl.created_at < ($${params.length}::date + interval '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<SecurityLogEntry>(
    `SELECT sl.id, sl.event_type, sl.actor_user_id, u.username AS actor_username,
            sl.target, sl.ip_address, sl.created_at
     FROM security_log sl
     LEFT JOIN users u ON u.id = sl.actor_user_id
     ${where}
     ORDER BY sl.created_at DESC
     LIMIT 500`,
    params,
  );
  return result.rows;
}
