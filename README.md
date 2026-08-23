# WOSG Tools Hub

Internal landing page / directory for WOSG's Claude Code tools (Competitor
Price Scraper, Business Impact Scoring App, QA PDP/Web Scanner, Ticket Rank
Lookup, and any future ones). Users log in, land on a dashboard of app tiles
grouped by category, and click through to whichever tool they need — each
tool stays on its own existing Render URL. This is a directory + gateway, not
a reverse proxy.

This is a standalone Node/Express app living inside the `wosgRegression`
repo. It has its own `package.json` and is unrelated to the Playwright
regression suite at the repo root — `npm run verify` at the repo root does
not touch this directory, and vice versa.

## Stack

- Node.js + TypeScript + Express
- Server-rendered views: EJS + Tailwind CSS
- Auth: `express-session` (Postgres-backed via `connect-pg-simple`) + bcrypt
- Database: PostgreSQL (Render managed Postgres in production)

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm run migrate        # applies the SQL schema
npm run build:css      # one-off Tailwind build (or run alongside `npm run dev` in a second terminal with --watch)
npm run dev            # starts the server with tsx watch on http://localhost:3000
```

On first run, if the `users` table is empty, an admin account is bootstrapped
from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. The four placeholder apps and two
starter categories ("QA Tools", "Commercial Tools") are seeded automatically
too — edit their real URLs and descriptions from **Manage Apps** after first
login.

## Environment variables

See `.env.example`. In production (Render), `DATABASE_URL` is auto-wired by
the blueprint; `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` and
`ALLOWED_IP_RANGES` are set as secrets in the Render dashboard.

`ALLOWED_IP_RANGES` is a comma-separated list of IPs/CIDR ranges (WOSG's
office/VPN egress). Requests from outside this list get a generic 404, never
a "not authorized" message. Leave it blank for local development.

WOSG's office/VPN egress IPs (set this as `ALLOWED_IP_RANGES` in the Render
dashboard — it's `sync: false` in `render.yaml`, so it isn't stored in the
repo):

```
85.210.2.82,20.68.255.255,51.141.32.83,51.141.32.106,81.128.186.100,81.128.186.101,81.128.177.69,81.128.177.68
```

## Deployment

Deploys as a Render Blueprint (`render.yaml`): one Node web service plus a
managed Postgres database. The build step runs `npm run build` (compiles
TypeScript + builds the Tailwind CSS bundle) then `npm run migrate` before
`npm start`. `/healthz` is exposed for Render's health checks and is reachable
even from outside the IP allowlist.

## What's still a placeholder

- **Branding** — logo, brand colours and font are neutral placeholders
  (`tailwind.config.cjs`, `src/public/images/logo-placeholder.svg`) pending
  the real WOSG logo file, hex codes and font from Dale.
- **Seeded app URLs** — the four seeded tools have blank URLs; fill these in
  from Manage Apps once each tool's Render URL is known.

## Scripts

| Script             | What it does                                      |
| ------------------ | -------------------------------------------------- |
| `npm run dev`       | Run the app locally with hot reload (`tsx watch`) |
| `npm run build:css` | One-off Tailwind CSS build                        |
| `npm run build`     | Build CSS + compile TypeScript to `dist/`         |
| `npm start`         | Run the compiled app (`dist/server.js`)           |
| `npm run migrate`   | Apply the SQL schema to `DATABASE_URL`            |
| `npm run typecheck` | `tsc --noEmit`                                    |
