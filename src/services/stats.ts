import { countApps, countAppsAddedThisMonth } from './apps.js';
import { countUsers } from './users.js';

export interface AdminStats {
  totalApps: number;
  totalUsers: number;
  appsAddedThisMonth: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [totalApps, totalUsers, appsAddedThisMonth] = await Promise.all([
    countApps(),
    countUsers(),
    countAppsAddedThisMonth(),
  ]);
  return { totalApps, totalUsers, appsAddedThisMonth };
}
