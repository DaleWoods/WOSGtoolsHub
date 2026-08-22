-- WOSG Tools Hub — initial schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  theme_preference TEXT NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  accent_colour TEXT NOT NULL DEFAULT '#4f46e5',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS apps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🔧',
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'beta', 'internal')),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'restricted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apps_category ON apps (category_id);

CREATE TABLE IF NOT EXISTS app_access (
  app_id INTEGER NOT NULL REFERENCES apps (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (app_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_app_order (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES apps (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE IF NOT EXISTS user_app_activity (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES apps (id) ON DELETE CASCADE,
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE IF NOT EXISTS security_log (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'login_success',
      'login_failure',
      'user_created',
      'user_updated',
      'user_deactivated',
      'user_deleted',
      'app_created',
      'app_updated',
      'app_deleted',
      'category_created',
      'category_updated',
      'category_deleted',
      'access_granted',
      'access_revoked'
    )
  ),
  actor_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  target TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_log_created_at ON security_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_log_event_type ON security_log (event_type);

-- connect-pg-simple manages its own "session" table via createTableIfMissing.
