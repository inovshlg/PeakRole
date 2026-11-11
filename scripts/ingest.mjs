#!/usr/bin/env node
/**
 * Pull jobs from all configured sources into the database.
 * Run on a schedule (e.g. every 2–6 hours) via cron / GitHub Actions / your host's scheduler:
 *   npm run ingest
 */
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { upsertJob, expireStale } from '../lib/jobs.mjs';
import { fetchGreenhouse, fetchLever, fetchAshby, fetchAdzuna } from '../lib/sources.mjs';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/sources.json'), 'utf8'));
const db = openDb();
const runStartedAt = db.prepare("SELECT datetime('now') AS t").get().t;
const totals = { inserted: 0, updated: 0, duplicate: 0, failed: 0 };

async function run(source, label, fetcher) {
  try {
    const jobs = await fetcher();
    const counts = { inserted: 0, updated: 0, duplicate: 0 };
    db.exec('BEGIN');
    for (const job of jobs) counts[upsertJob(db, job)]++;
    db.exec('COMMIT');
    // Jobs from this company board that disappeared are no longer open.
    const companies = [...new Set(jobs.map((j) => j.company))];
    const expired = source === 'adzuna' ? 0 : expireStale(db, { source, companies, runStartedAt });
    for (const k of Object.keys(counts)) totals[k] += counts[k];
    console.log(`✓ ${source}:${label}  +${counts.inserted} new, ${counts.updated} updated, ${counts.duplicate} dupes, ${expired} expired`);
  } catch (err) {
    if (db.isTransaction) db.exec('ROLLBACK');
    totals.failed++;
    console.warn(`✗ ${source}:${label}  ${err.message}`);
  }
}

for (const t of config.greenhouse ?? []) await run('greenhouse', t, () => fetchGreenhouse(t));
for (const t of config.lever ?? []) await run('lever', t, () => fetchLever(t));
for (const t of config.ashby ?? []) await run('ashby', t, () => fetchAshby(t));
if (config.adzuna) await run('adzuna', config.adzuna.country, () => fetchAdzuna(config.adzuna));

const aged = expireStale(db);
console.log(`\nDone. ${totals.inserted} new, ${totals.updated} updated, ${totals.duplicate} duplicates skipped, ${aged} aged out, ${totals.failed} sources failed.`);
