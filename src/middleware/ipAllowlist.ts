import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range!);
  if (ipInt === null || rangeInt === null || Number.isNaN(bits)) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function normaliseIp(ip: string): string {
  // Strip IPv4-mapped IPv6 prefix, e.g. "::ffff:127.0.0.1"
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/**
 * Requests from outside the allowlisted office/VPN ranges get a generic 404 —
 * never a "not authorized" response — so the tool's existence isn't revealed.
 * An empty allowlist permits everything (used for local development).
 */
export function ipAllowlist(req: Request, res: Response, next: NextFunction): void {
  if (env.allowedIpRanges.length === 0) {
    next();
    return;
  }

  const clientIp = normaliseIp(req.ip ?? '');
  const allowed = env.allowedIpRanges.some((range) => isIpInCidr(clientIp, range));

  if (!allowed) {
    res.status(404).send('Not found');
    return;
  }

  next();
}
