import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',          -- candidate | employer
  plan TEXT NOT NULL DEFAULT 'free',               -- free | premium
  company TEXT,
  headline TEXT,
  location TEXT,
  desired_salary INTEGER,
  years_experience INTEGER,
  skills TEXT,
  visible_to_recruiters INTEGER NOT NULL DEFAULT 0,
  cv_path TEXT,
  cv_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                 -- greenhouse | lever | ashby | adzuna | direct | seed
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
  posted_at TEXT NOT NULL,
  expires_at TEXT,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active',  -- active | expired
  dedupe_key TEXT NOT NULL,
  posted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS jobs_status_posted ON jobs(status, posted_at DESC);
CREATE INDEX IF NOT EXISTS jobs_dedupe ON jobs(dedupe_key);
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, job_id)
);
CREATE TABLE IF NOT EXISTS applications (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',   -- applied | interviewing | offer | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, job_id)
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  min_salary INTEGER,
  remote INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(file = path.join(DATA_DIR, 'app.db')) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

/** Shared singleton for the Next.js server (survives hot reloads in dev). */
export function getDb() {
  if (!globalThis.__peakroleDb) globalThis.__peakroleDb = openDb();
  return globalThis.__peakroleDb;
}
