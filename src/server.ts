import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { ipAllowlist } from './middleware/ipAllowlist.js';
import { attachUser, requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { healthRouter } from './routes/health.js';
import { adminRouter } from './routes/admin/index.js';
import { bootstrapFirstAdmin, seedCategoriesAndApps } from './services/bootstrap.js';
import { runHealthChecks } from './services/healthCheck.js';

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PgSession = connectPgSimple(session);

// Health check first — before the IP allowlist — so Render's health probe
// (which does not originate from the office/VPN range) always succeeds.
app.use(healthRouter);

app.use(ipAllowlist);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 8 * 60 * 60 * 1000, // ~ a work day
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
    },
  }),
);

app.use(attachUser);

app.use('/', authRouter);
app.use('/admin', requireAuth, adminRouter);
app.use('/', dashboardRouter);

app.use((_req, res) => {
  res.status(404).send('Not found');
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).send('Something went wrong.');
});

async function start(): Promise<void> {
  await bootstrapFirstAdmin();
  await seedCategoriesAndApps();
  app.listen(env.port, () => {
    console.log(`WOSG Tools Hub listening on port ${env.port}`);
  });

  runHealthChecks().catch((error: unknown) => console.error('Health check run failed:', error));
  setInterval(() => {
    runHealthChecks().catch((error: unknown) => console.error('Health check run failed:', error));
  }, HEALTH_CHECK_INTERVAL_MS);
}

start().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
