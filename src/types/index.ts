export type Role = 'admin' | 'user';
export type Theme = 'light' | 'dark' | 'system';
export type AppStatus = 'live' | 'beta' | 'internal';
export type Visibility = 'all' | 'restricted';
export type HealthStatus = 'up' | 'down' | 'unknown';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  theme_preference: Theme;
  created_at: Date;
  last_login_at: Date | null;
}

export interface PublicUser {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  theme_preference: Theme;
  created_at: Date;
  last_login_at: Date | null;
}

export interface Category {
  id: number;
  name: string;
  accent_colour: string;
  sort_order: number;
}

export interface App {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  category_id: number;
  status: AppStatus;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  visibility: Visibility;
  health_status: HealthStatus;
  health_checked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppWithCategory extends App {
  category_name: string;
  category_accent_colour: string;
}

export interface DashboardTile extends AppWithCategory {
  is_new: boolean;
  is_locked: boolean;
  effective_sort_order: number;
  last_opened_at: Date | null;
}

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_deleted'
  | 'app_created'
  | 'app_updated'
  | 'app_deleted'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  | 'access_granted'
  | 'access_revoked';

export interface SecurityLogEntry {
  id: number;
  event_type: SecurityEventType;
  actor_user_id: number | null;
  actor_username: string | null;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: Date;
}
