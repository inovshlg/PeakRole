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
CREATE TABLE IF NOT EXISTS cvs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'master',
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  template TEXT NOT NULL DEFAULT 'modern',
  data JSONB NOT NULL,
  cover_letter TEXT,
  notes JSONB,
  check_result JSONB,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cvs_user ON cvs(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user ON ai_usage(user_id, kind, created_at);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_id INTEGER REFERENCES cvs(id) ON DELETE SET NULL;
-- Phase 2: recruiter profiles, candidate privacy, messaging
ALTER TABLE users ADD COLUMN IF NOT EXISTS recruiter_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialisms TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS regions TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS levels TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_recruiting INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS placements INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all';
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_companies TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_about TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_industry TEXT;
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  started_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  candidate_unread INTEGER NOT NULL DEFAULT 0,
  recruiter_unread INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, recruiter_id)
);
CREATE INDEX IF NOT EXISTS conversations_candidate ON conversations(candidate_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_recruiter ON conversations(recruiter_id, last_message_at DESC);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at);
-- Phase 3: credits, unlocks, applicant pipeline, featured jobs
CREATE TABLE IF NOT EXISTS unlocks (
  recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recruiter_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS credit_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_score INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS talent_searches (
  id SERIAL PRIMARY KEY,
  recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_text TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- EWM-TM Jobs: country, Telegram, SAP candidate profile, consent, admin CRM
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS telegram_posted_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_experience INTEGER;
CREATE INDEX IF NOT EXISTS jobs_country ON jobs(country);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sap_modules TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS s4hana INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS implementations INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_salary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_salary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_period TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS open_relocation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS open_remote INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS open_contract INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS digest_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_tags TEXT;
CREATE TABLE IF NOT EXISTS candidate_notes (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module TEXT,
  location TEXT,
  details TEXT,
  fee TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted',
  fee_amount INTEGER,
  fee_currency TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requirement_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS import_runs (
  id SERIAL PRIMARY KEY,
  trigger TEXT NOT NULL,
  totals JSONB NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS salary_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Phase 4: logos, interview prep
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_domain TEXT;
CREATE TABLE IF NOT EXISTS interview_preps (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
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
