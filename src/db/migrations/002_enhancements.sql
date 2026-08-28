-- WOSG Tools Hub — theme "system" option, per-app health pings, security log diffs.
-- Written to be safe to re-run (this migration runner re-applies every file on every deploy).

ALTER TABLE users ALTER COLUMN theme_preference SET DEFAULT 'system';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_theme_preference_check;
ALTER TABLE users ADD CONSTRAINT users_theme_preference_check
  CHECK (theme_preference IN ('light', 'dark', 'system'));

ALTER TABLE apps ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_health_status_check;
ALTER TABLE apps ADD CONSTRAINT apps_health_status_check
  CHECK (health_status IN ('up', 'down', 'unknown'));

ALTER TABLE apps ADD COLUMN IF NOT EXISTS health_checked_at TIMESTAMPTZ;

ALTER TABLE security_log ADD COLUMN IF NOT EXISTS details TEXT;
