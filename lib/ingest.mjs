/** Pull jobs from every configured source into the database. Used by `npm run ingest` and the Vercel cron. */
import sources from '../config/sources.mjs';
import { INDIA_LOCATION_RE } from './market.mjs';
import { upsertJob, expireStale } from './jobs.mjs';
import { fetchGreenhouse, fetchLever, fetchAshby, fetchAdzuna } from './sources.mjs';

export async function runIngest(db, log = console.log) {
  const { t: runStartedAt } = await db.get('SELECT now() AS t');
  const totals = { inserted: 0, updated: 0, duplicate: 0, failed: 0, expired: 0 };
  const report = [];

  async function run(source, label, fetcher) {
    try {
      const fetched = await fetcher();
      // Keep only roles in India from global company boards (Adzuna India is already Indian).
      const jobs = sources.indiaOnly && source !== 'adzuna'
        ? fetched.filter((j) => INDIA_LOCATION_RE.test(j.location) || (j.remote && /india|apac|asia/i.test(j.location)))
        : fetched;
      const counts = { inserted: 0, updated: 0, duplicate: 0 };
      for (const job of jobs) counts[await upsertJob(db, job)]++;
      // Expire using every company seen, so roles that moved out of scope are closed too.
      const companies = [...new Set(fetched.map((j) => j.company))];
      const expired = source === 'adzuna' ? 0 : await expireStale(db, { source, companies, runStartedAt });
      for (const k of Object.keys(counts)) totals[k] += counts[k];
      totals.expired += expired;
      const line = `✓ ${source}:${label}  ${jobs.length}/${fetched.length} in scope, +${counts.inserted} new, ${counts.updated} updated, ${counts.duplicate} dupes, ${expired} expired`;
      report.push(line); log(line);
    } catch (err) {
      totals.failed++;
      const line = `✗ ${source}:${label}  ${err.message}`;
      report.push(line); log(line);
    }
  }

  // Fetch boards a few at a time to stay well inside serverless time limits.
  const tasks = [
    ...(sources.greenhouse ?? []).map((t) => () => run('greenhouse', t, () => fetchGreenhouse(t))),
    ...(sources.lever ?? []).map((t) => () => run('lever', t, () => fetchLever(t))),
    ...(sources.ashby ?? []).map((t) => () => run('ashby', t, () => fetchAshby(t))),
  ];
  for (let i = 0; i < tasks.length; i += 3) await Promise.all(tasks.slice(i, i + 3).map((f) => f()));
  if (sources.adzuna && process.env.ADZUNA_APP_ID) await run('adzuna', sources.adzuna.country, () => fetchAdzuna(sources.adzuna));

  totals.expired += await expireStale(db);

  // Once real jobs exist, retire the demo listings.
  const { n: real } = await db.get("SELECT COUNT(*)::int AS n FROM jobs WHERE status='active' AND source NOT IN ('seed')");
  if (real >= 20) {
    const { rowCount } = await db.run("UPDATE jobs SET status='expired' WHERE source='seed' AND status='active'");
    if (rowCount) report.push(`Retired ${rowCount} demo jobs`);
  }
  log(`Done. ${totals.inserted} new, ${totals.updated} updated, ${totals.duplicate} duplicates, ${totals.expired} expired, ${totals.failed} sources failed.`);
  return { totals, report };
}
