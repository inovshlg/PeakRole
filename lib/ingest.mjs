/** Pull jobs from every configured source into the database. Used by `npm run ingest` and the Vercel cron. */
import sources from '../config/sources.mjs';
import { upsertJob, expireStale, htmlToText } from './jobs.mjs';
import { detectModule, NICHE_SQL_RE, extractMinExperience } from './niche.mjs';
import { postNewJobsToTelegram } from './telegram.mjs';
import {
  fetchGreenhouse, fetchLever, fetchAshby, fetchAdzuna, fetchSmartRecruiters, fetchRecruitee, fetchWorkable, fetchJSearch,
} from './sources.mjs';

export async function runIngest(db, log = console.log) {
  const { t: runStartedAt } = await db.get('SELECT now() AS t');
  const totals = { inserted: 0, updated: 0, duplicate: 0, failed: 0, expired: 0, off_topic: 0 };
  const report = [];
  const note = (line) => { report.push(line); log(line); };

  async function run(source, label, fetcher, { expire = true } = {}) {
    try {
      const domain = sources.domains?.[label];
      const fetched = (await fetcher()).map((j) => (domain ? { ...j, company_domain: domain } : j));
      // Niche: keep only SAP EWM / SAP TM roles, tagged with their module.
      const jobs = [];
      for (const j of fetched) {
        const module = sources.niche ? detectModule(j.title, htmlToText(j.description_html || '')) : null;
        if (sources.niche && !module) continue;
        jobs.push(module ? { ...j, category: module } : j);
      }
      totals.off_topic += fetched.length - jobs.length;
      const counts = { inserted: 0, updated: 0, duplicate: 0 };
      for (const job of jobs) counts[await upsertJob(db, job)]++;
      const companies = [...new Set(fetched.map((j) => j.company))];
      const expired = expire ? await expireStale(db, { source, companies, runStartedAt }) : 0;
      for (const k of Object.keys(counts)) totals[k] += counts[k];
      totals.expired += expired;
      note(`✓ ${source}:${label}  ${jobs.length}/${fetched.length} EWM/TM, +${counts.inserted} new, ${counts.updated} updated, ${counts.duplicate} dupes, ${expired} expired`);
    } catch (err) {
      totals.failed++;
      note(`✗ ${source}:${label}  ${err.message}`);
    }
  }

  if (sources.jsearch) await run('jsearch', 'worldwide', () => fetchJSearch(sources.jsearch), { expire: false });
  for (const a of [].concat(sources.adzuna || [])) {
    if (process.env.ADZUNA_APP_ID) await run('adzuna', a.country, () => fetchAdzuna(a), { expire: false });
  }
  const tasks = [
    ...(sources.greenhouse ?? []).map((t) => () => run('greenhouse', t, () => fetchGreenhouse(t))),
    ...(sources.lever ?? []).map((t) => () => run('lever', t, () => fetchLever(t))),
    ...(sources.ashby ?? []).map((t) => () => run('ashby', t, () => fetchAshby(t))),
    ...(sources.smartrecruiters ?? []).map((t) => () => run('smartrecruiters', t, () => fetchSmartRecruiters(t))),
    ...(sources.recruitee ?? []).map((t) => () => run('recruitee', t, () => fetchRecruitee(t))),
    ...(sources.workable ?? []).map((t) => () => run('workable', t, () => fetchWorkable(t))),
  ];
  for (let i = 0; i < tasks.length; i += 3) await Promise.all(tasks.slice(i, i + 3).map((f) => f()));

  totals.expired += await expireStale(db);
  // Aggregated listings (JSearch/Adzuna) aren't re-checked per company, so retire them after 45 days.
  totals.expired += (await db.run(
    "UPDATE jobs SET status = 'expired' WHERE status = 'active' AND source IN ('jsearch', 'adzuna') AND posted_at < now() - interval '45 days'"
  )).rowCount;

  if (sources.niche) {
    // Retire anything that isn't an EWM/TM role (older generic imports, demo jobs), except employers' own posts.
    const { rowCount } = await db.run(
      `UPDATE jobs SET status = 'expired' WHERE status = 'active' AND source <> 'direct'
       AND NOT (title ~* $1 OR description_text ~* $1)`,
      [NICHE_SQL_RE]
    );
    if (rowCount) note(`Retired ${rowCount} jobs that are not SAP EWM/TM`);
  }

  // Fill in minimum experience for older jobs imported before it was tracked.
  const missing = await db.all("SELECT id, title, description_text FROM jobs WHERE status = 'active' AND min_experience IS NULL LIMIT 3000");
  for (const j of missing) {
    const n = extractMinExperience(`${j.title} ${j.description_text}`);
    if (n !== null) await db.run('UPDATE jobs SET min_experience = $1 WHERE id = $2', [n, j.id]);
  }

  const { n: real } = await db.get("SELECT COUNT(*)::int AS n FROM jobs WHERE status='active' AND source NOT IN ('seed')");
  if (real >= 20) {
    const { rowCount } = await db.run("UPDATE jobs SET status='expired' WHERE source='seed' AND status='active'");
    if (rowCount) note(`Retired ${rowCount} demo jobs`);
  }

  try {
    const posted = await postNewJobsToTelegram(db, { log: note });
    if (posted) totals.telegram = posted;
  } catch (err) {
    note(`✗ telegram: ${err.message}`);
  }
  log(`Done. ${totals.inserted} new, ${totals.updated} updated, ${totals.duplicate} duplicates, ${totals.off_topic} off-topic skipped, ${totals.expired} expired, ${totals.failed} sources failed.`);
  return { totals, report };
}
