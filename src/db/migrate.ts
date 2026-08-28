import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`Migration applied: ${file}`);
  }
}

migrate()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
    return pool.end();
  });
