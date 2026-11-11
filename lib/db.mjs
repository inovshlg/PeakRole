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

export async function openDb(options = {}) {
  const { seed = false } = options;
  const url = findDatabaseUrl();
  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 10_000,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (err) => console.error('Postgres pool error', err.message));
    const db = wrap((s, p) => pool.query(s, p), () => pool.end());
    // Several serverless instances can start at once on a fresh database. A Postgres advisory
    // lock makes them create tables and seed demo data one at a time instead of colliding.
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [SETUP_LOCK]);
      await client.query(SCHEMA);
      if (seed) await (await import('./seed.mjs')).seedIfEmpty(db);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [SETUP_LOCK]).catch(() => {});
      client.release();
    }
    return db;
  }
  if (process.env.VERCEL) throw new DbSetupError('missing');

  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), 'data', 'pg');
  if (dir !== 'memory://') fs.mkdirSync(dir, { recursive: true });
  const pglite = new PGlite(dir);
  const db = wrap((s, p) => pglite.query(s, p).then((r) => ({ rows: r.rows, rowCount: r.affectedRows })), () => pglite.close());
  await pglite.exec(SCHEMA);
  if (seed) await (await import('./seed.mjs')).seedIfEmpty(db);
  return db;
}

const SETUP_LOCK = 727001;

const isPg = (v) => typeof v === 'string' && /^postgres(ql)?:\/\//.test(v);

/**
 * The Postgres connection string. Vercel's Neon integration names variables after a
 * customisable prefix (DATABASE_URL, POSTGRES_URL, STORAGE_URL, ...), so after the usual
 * names, take any variable ending in _URL that holds a postgres:// URL, preferring pooled ones.
 */
export function findDatabaseUrl(env = process.env) {
  for (const k of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL']) if (isPg(env[k])) return env[k];
  const candidates = Object.keys(env)
    .filter((k) => /_URL($|_)/.test(k) && isPg(env[k]))
    .sort((a, b) => /UNPOOLED|NON_POOLING/.test(a) - /UNPOOLED|NON_POOLING/.test(b) || a.localeCompare(b));
  return candidates.length ? env[candidates[0]] : undefined;
}

export class DbSetupError extends Error {
  constructor(reason, code) {
    super(reason === 'missing' ? 'No database configured (DATABASE_URL is not set).' : `Database connection failed (${code}).`);
    this.reason = reason;
    this.code = code;
  }
}

/** Shared connection for the Next.js server; created once per server instance. */
export function getDb() {
  if (!globalThis.__peakroleDb) {
    globalThis.__peakroleDb = openDb({ seed: true }).catch((err) => {
      globalThis.__peakroleDb = null;
      if (err instanceof DbSetupError) throw err;
      console.error('Database setup failed:', err);
      throw new DbSetupError('connect', err.code || err.name || 'unknown');
    });
  }
  return globalThis.__peakroleDb;
}

/** For the setup page: is the database reachable? Never exposes the connection string or message text. */
export async function getDbStatus() {
  try {
    await getDb();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.reason || 'connect', code: err.code || 'unknown' };
  }
}
