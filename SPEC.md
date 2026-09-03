# WOSG Tools Hub — Spec & Architecture

This is the living reference for what this app is, why it's built the way it
is, and what's done vs still open. `README.md` covers day-to-day setup and
scripts; this file covers requirements, decisions, and status.

## 1. What this is

A single internal web app that acts as a landing page / directory for WOSG's
standalone internal tools (Competitor Price Scraper, Business Impact Scoring
App, QA PDP/Web Scanner, Ticket Rank Lookup, and any future ones). Users log
in once, land on a dashboard of app tiles, and click through to whichever
tool they need — each tool stays on its own existing URL. The hub does not
proxy or embed the other apps; it's a directory + gateway, not a reverse
proxy.

## 2. Goals

- One URL for the business to bookmark, showing every internal tool in one
  place.
- Each user logs in with their own username/password.
- New tools can be added/edited/removed from an in-app admin screen — no
  redeploy needed.
- Ships as its own Render blueprint, deployed independently of any other
  WOSG repo.

## 3. Non-goals (v1)

- **Not** a reverse proxy — clicking a tile navigates to the tool's own URL
  in a new tab.
- No SSO/Entra ID yet — self-contained username/password auth (swappable
  later, see §9).
- No self-service sign-up — accounts are admin-provisioned.
- No self-service password reset — admin resets via Manage Users, no email
  service.
- No org-wide usage analytics — only an admin-only security log (logins +
  admin changes) and a per-user "Recently opened" row that isn't exposed to
  admins.
- No 2FA — password-only, plus the office/VPN IP allowlist.
- Only links to internal Claude Code apps, not a general link directory.

## 4. Users & roles

Two roles, enforced **server-side** (checked on every request, not just
hidden in the nav):

- **Admin** — sees the same dashboard as everyone else, plus an "Admin" nav
  link to Manage Apps / Categories / Users / Security Log. Always sees every
  app on the admin screens, including `restricted` or `internal` ones.
- **User** — dashboard only. Hitting an admin URL directly returns a plain
  404, not a redirect or "forbidden" page, so the existence of admin screens
  isn't confirmed to a non-admin.

Accounts are created by an admin (username + temporary password shared out
of band). No public registration.

**Per-app visibility**: `all` (default, everyone sees it) or `restricted`
(only users explicitly granted access via a checkbox list on the app's edit
screen). `internal` status hard-overrides visibility — it hides the app from
every non-admin regardless of the `visibility` setting.

## 5. Feature inventory

### Auth
- Username + password, bcrypt-hashed (never logged/stored in plain text).
- Sessions: `express-session` backed by Postgres (`connect-pg-simple`),
  ~8-hour rolling expiry, `httpOnly` + `sameSite=lax` cookies, `secure` in
  production.
- Failed logins always show a generic "invalid username or password" —
  never reveals whether the username exists.
- Login attempts are rate-limited per IP+username.
- Deactivating a user ends their session on their *next request*, not just
  future logins (`attachUser` middleware checks `is_active` every request
  and destroys the session if it's now false).
- Office/VPN IP allowlist (`ALLOWED_IP_RANGES`) sits in front of everything
  except `/healthz` — an out-of-range request gets a bare 404, never a
  "not authorized" message, so the tool's existence isn't revealed.

### Dashboard
- Tiles grouped by category, each with its own accent colour.
- Client-side search/filter box (narrows by name/description as you type).
- "New" badge on tiles created within the last ~14 days.
- Restricted apps show a small lock icon.
- Drag-to-reorder tiles within a category — personal to that user
  (`user_app_order`), doesn't affect anyone else's view or the admin
  default order. Untouched apps fall back to the admin's default order.
- "Recently opened" row (`user_app_activity`) — personal, never surfaced to
  admins as analytics.
- Light/dark toggle, persisted per user. When a user has never explicitly
  chosen (`theme_preference = 'system'`, the default for new accounts), the
  page falls back to the browser/OS preference — decided client-side via a
  synchronous inline script in `<head>` (the server can't see OS
  preference; see §7 for why this had to move client-side).
- Per-app health dot (green/red) once a health check has actually run for
  that app — see §5's "Health checks" below.
- Installable as a PWA (`manifest.json` + generated icons) — useful given
  this is meant to get checked from phones.
- Responsive grid, hover lift animation on tiles.

### Health checks
- Every 5 minutes, the running server pings the URL of every active app
  that has one, via `HEAD` (falling back to `GET` if the server rejects
  `HEAD`), with an 8s timeout. `apps.health_status` /
  `apps.health_checked_at` are updated in place.
- **Known limitation**: this runs as an in-process `setInterval`, not an
  external cron. On Render's free web-service tier the service spins down
  after inactivity, which pauses health checks until the next request wakes
  it — acceptable for v1, worth revisiting if this ever needs to be a
  reliable uptime monitor (see §9).

### Admin — Manage Apps
- Add / edit / delete / drag-reorder (within a category).
- Fields: name, description, URL, icon (emoji picker), category, status
  (`live`/`beta`/`internal`), "what's new" note, active toggle, visibility
  (`all`/`restricted` + a checkbox list of users when restricted).
- **Bulk select** (checkboxes + a floating action bar) for
  Activate/Deactivate across many apps at once.
- CSV export of the full app list.
- Shared stats bar (total apps, total users, apps added this month) and
  toast confirmations on every admin screen.

### Admin — Manage Categories
- Add / rename / delete / drag-reorder, each with a colour picker.
- Deleting a category that still has apps is blocked with a message to
  reassign them first, rather than silently orphaning those apps.

### Admin — Manage Users
- Add / edit role / deactivate / delete / reset password.
- Password policy (10+ chars, upper+lower+number) enforced whenever an
  admin sets or resets one.
- Last login time shown per user. CSV export.
- Can't deactivate or delete your own account while logged in as it.

### Admin — Security Log
- Read-only, admin-only. Logs: login success/failure (with IP), and every
  admin change (user/app/category created/updated/deleted/deactivated,
  access grants).
- **"What changed" diffs**: update events record a plain-text field-level
  diff (`status: live → beta; visibility: all → restricted`), computed by
  comparing the record before and after the write — not just "app
  updated" with no detail. Bulk actions log one summary entry listing the
  affected app ids.
- Filterable by date range and event type.

## 6. Data model

See `src/db/migrations/*.sql` for the source of truth. Summary:

| Table | Purpose |
| --- | --- |
| `users` | id, username, password_hash, role, is_active, theme_preference (`light`\|`dark`\|`system`), created_at, last_login_at |
| `categories` | id, name, accent_colour, sort_order |
| `apps` | id, name, description, url, icon, category_id, status, notes, sort_order, is_active, visibility, health_status, health_checked_at, created_at, updated_at |
| `app_access` | (app_id, user_id) — only consulted when an app's visibility is `restricted` |
| `user_app_order` | (user_id, app_id, sort_order) — per-user tile order override |
| `user_app_activity` | (user_id, app_id, last_opened_at) — powers "Recently opened" |
| `security_log` | id, event_type, actor_user_id, target, details, ip_address, created_at |
| `session` | managed automatically by `connect-pg-simple` (`createTableIfMissing: true`) |

Migrations are plain numbered `.sql` files (`001_init.sql`,
`002_enhancements.sql`, …), applied in filename order by `npm run migrate`
on every deploy. **Every migration must be safe to re-run** — Render runs
this build step on every push, against a database that may already have it
applied. Use `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS` patterns rather
than plain `ALTER TABLE ADD COLUMN` or `ADD CONSTRAINT`.

## 7. Architecture decisions

- **Standalone repo, not a subfolder of another repo.** This started life as
  a subdirectory of the Playwright regression suite repo during initial
  build, then was moved out to `DaleWoods/WOSGtoolsHub` once real deploys
  started — it has its own deploy lifecycle, its own Render blueprint, and
  shouldn't be coupled to an unrelated test suite's tooling/CI.
- **Server-rendered EJS + Tailwind, not a SPA.** A directory/gateway page
  doesn't need client-side routing or a component framework — server
  rendering keeps the stack small and fast to reason about, and matches
  what the original spec asked for.
- **Raw SQL migrations, no ORM.** The schema is small (8 tables) and stable;
  a query builder or ORM would add a dependency and an abstraction layer for
  little benefit here. Plain `pg` + hand-written SQL keeps every query
  visible and easy to reason about (see `src/services/*.ts`).
- **`express-session` + Postgres-backed store, not JWTs.** Sessions need to
  be revocable server-side the instant an admin deactivates a user (§5) —
  that's a natural fit for server-side session state, not a stateless
  token. Storing sessions in Postgres (rather than in-memory) means they
  survive a redeploy and work fine on a single web-service instance without
  needing Redis.
- **IP allowlist as the outermost middleware** (before session/auth), except
  for `/healthz`, which is registered *before* the allowlist so Render's
  health probe (which doesn't originate from the office/VPN range) always
  succeeds.
- **Theme "system" default resolved client-side.** The server has no way to
  know a visitor's OS/browser colour-scheme preference on first render, so
  a single synchronous inline `<script>` in `partials/head.ejs` decides the
  `dark` class before first paint (avoiding a flash-of-wrong-theme) — this
  replaced an earlier version where each of six views computed the dark
  class server-side from `theme_preference` alone, which couldn't express
  "follow the OS" at all.
- **Health checks run in-process on an interval, not an external cron.**
  Simplest thing that works for a handful of apps and avoids standing up
  separate infrastructure; the tradeoff (checks pause while a free-tier
  instance is spun down) is called out in §5 and §9.
- **Express route registration order matters — literal paths must come
  before `/:id`.** `router.post('/:id', ...)` matches *any* single path
  segment, including literal siblings like `/bulk` or `/reorder` if they're
  registered after it. This bit us for real during development —
  `POST /admin/apps/reorder` and `POST /admin/categories/reorder` were
  silently swallowed by `POST /:id` for months of "it looks right" review
  before a routing audit caught it. Any new admin action route
  (`/admin/apps/whatever`) must be added **above** the `POST '/:id'` and
  `GET '/:id/edit'` handlers in that router file.

## 8. Deployment

- Render Blueprint (`render.yaml`): one Node web service + one managed
  Postgres database, one environment (no separate staging yet).
- Build: `npm ci --include=dev && npm run build && npm run migrate`, then
  `npm start`.
  - `--include=dev` is required: Render sets `NODE_ENV=production` on the
    build environment too, and `npm ci` silently skips `devDependencies`
    under `NODE_ENV=production` unless told otherwise — which broke the
    first deploy (`tailwindcss: not found`, since Tailwind is a dev
    dependency needed to build the CSS bundle).
  - Postgres plan is `basic-256mb`, not the older `starter` name — Render
    retired the legacy plan names for new databases. Also worth knowing:
    Render's free tier allows only **one active free Postgres database per
    workspace**, which is why this project's database is a paid Starter-
    equivalent tier rather than free (see PR history / commit log for the
    actual back-and-forth on this during first deploy).
- `/healthz` returns 200 unconditionally and is exempt from the IP
  allowlist, so Render's health checks always pass.
- First admin bootstrap: if `users` is empty on startup, one admin account
  is created from `ADMIN_USERNAME`/`ADMIN_PASSWORD` (Render secrets, not
  committed). This only ever fires once — changing those env vars later
  does **not** retroactively update the account it already created.

## 9. Status: done vs pending

### Done (deployed and manually verified)
- [x] Login with an admin-created username/password
- [x] Standard users see the dashboard and click through to each tool
- [x] Admins additionally see and can use Manage Apps / Users / Categories /
      Security Log
- [x] `restricted` visibility respected; `internal` status hard-hides from
      non-admins regardless of visibility
- [x] Apps grouped by category, with search/filter and "New" badges
- [x] Deactivating a user ends their session immediately
- [x] Per-user drag-reorder, independent of the admin default and other
      users
- [x] Manage Users shows last login time
- [x] All admin changes take effect with no redeploy
- [x] Data survives a redeploy (Postgres, not in-memory)
- [x] Deployed on Render via blueprint, reachable at one URL
- [x] Role check enforced server-side
- [x] PWA installable, health-check dots, security log diffs, bulk
      activate/deactivate (added post-MVP, see commit history)

### Pending / needs Dale
- [ ] **Real branding** — WOSG logo file, brand hex codes, and font are
      still neutral placeholders (`tailwind.config.cjs`,
      `src/public/images/logo-placeholder.svg` and the generated PWA
      icons all derive from the placeholder). Swap these once assets are
      supplied.
- [ ] **Real app URLs** — the four seeded tools (Competitor Price Scraper,
      Business Impact Scoring App, QA PDP/Web Scanner, Ticket Rank Lookup)
      have blank URLs; fill in from Manage Apps once each tool's own
      Render URL is known.

### Deliberately out of scope for v1 (from the original spec, unchanged)
- Automated tests / CI pipeline
- Error monitoring (Sentry or similar)
- Automated database backups
- Slack alert on repeated failed logins
- Two-factor authentication
- External/reliable per-app health monitoring (current version is
  best-effort and pauses when the service itself is asleep — see §7)
- Separate staging environment
- Custom domain (pure Render config change, no rework needed)
- Proper "forgot password" flow (needs an email service)
- Forced password change on first login
- SSO/Entra ID
- A true reverse-proxy "everything under one path" experience
  (`hub.domain.com/price-scraper`) — bigger lift, deliberately deferred
