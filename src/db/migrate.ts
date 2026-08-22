import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = await readFile(sqlPath, 'utf-8');
  await pool.query(sql);
  console.log('Migration applied.');
}

migrate()
  .then(() => pool.end())
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
    return pool.end();
  });
