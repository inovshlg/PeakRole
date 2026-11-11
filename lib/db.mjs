/**
 * Database adapter.
 *  - Production (Vercel): Postgres via DATABASE_URL / POSTGRES_URL (e.g. Neon from the Vercel Marketplace).
 *  - Local / tests: PGlite, an embedded Postgres stored in ./data/pg, so no install is needed.
 * Exposes: all(sql, params) → rows, get(sql, params) → row|undefined, run(sql, params) → { rowCount, rows }.
 */
import path from 'node:path';
import fs from 'node:fs';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  plan TEXT NOT NULL DEFAULT 'free',
  company TEXT,
  headline TEXT,
  location TEXT,
  desired_salary INTEGER,
  years_experience INTEGER,
  skills TEXT,
  visible_to_recruiters INTEGER NOT NULL DEFAULT 0,
  cv_name TEXT,
  cv_parsed JSONB,
  cv_parsed_at TIMESTAMPTZ,
  matches_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cv_files (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  remote INTEGER NOT NULL DEFAULT 0,
  employment_type TEXT,
  seniority TEXT,
  category TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT,
  description_html TEXT NOT NULL DEFAULT '',
  description_text TEXT NOT NULL DEFAULT '',
  apply_url TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  dedupe_key TEXT NOT NULL,
  posted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS jobs_status_posted ON jobs(status, posted_at DESC);
CREATE INDEX IF NOT EXISTS jobs_dedupe ON jobs(dedupe_key);
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
CREATE TABLE IF NOT EXISTS applications (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  min_salary INTEGER,
  remote INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_matches (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  strengths JSONB,
  gaps JSONB,
  detailed INTEGER NOT NULL DEFAULT 0,
  ai INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
`;

function wrap(query, close) {
  return {
    async all(sql, params = []) { return (await query(sql, params)).rows; },
    async get(sql, params = []) { return (await query(sql, params)).rows[0]; },
    async run(sql, params = []) { const r = await query(sql, params); return { rowCount: r.rowCount ?? r.affectedRows ?? 0, rows: r.rows }; },
    close,
  };
}

export async function openDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let db, exec;
  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: url,
      max: 5,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    });
    db = wrap((s, p) => pool.query(s, p), () => pool.end());
    exec = (s) => pool.query(s);
  } else if (process.env.VERCEL) {
    throw new Error('No database configured. In Vercel, open Storage → Create Database → Neon (Postgres), connect it to this project, then redeploy.');
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), 'data', 'pg');
    if (dir !== 'memory://') fs.mkdirSync(dir, { recursive: true });
    const pglite = new PGlite(dir);
    db = wrap((s, p) => pglite.query(s, p).then((r) => ({ rows: r.rows, rowCount: r.affectedRows })), () => pglite.close());
    exec = (s) => pglite.exec(s);
  }
  await exec(SCHEMA);
  return db;
}

/** Shared connection for the Next.js server; created once per server instance. */
export function getDb() {
  if (!globalThis.__peakroleDb) {
    globalThis.__peakroleDb = (async () => {
      const db = await openDb();
      const { seedIfEmpty } = await import('./seed.mjs');
      await seedIfEmpty(db);
      return db;
    })().catch((err) => { globalThis.__peakroleDb = null; throw err; });
  }
  return globalThis.__peakroleDb;
}
