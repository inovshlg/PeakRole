/** Salary insights computed from active listings on the site (one currency at a time). */
import { LOCATION_ALIASES, MARKET } from './market.mjs';

const MIN_SAMPLE = 3;

/**
 * Salary stats for a role keyword (and optional city): percentiles of the listing midpoints,
 * overall and by seniority. Returns null when there are too few salaried listings.
 */
export async function salaryStats(db, { q = '', location = '', currency = MARKET.currency } = {}) {
  const params = [currency];
  const where = ["status = 'active'", 'currency = $1', '(salary_min IS NOT NULL OR salary_max IS NOT NULL)'];
  for (const term of q.trim().split(/\s+/).filter(Boolean).slice(0, 5)) {
    params.push(`%${term}%`);
    where.push(`title ILIKE $${params.length}`);
  }
  if (location) {
    const loc = location.trim().toLowerCase();
    params.push((LOCATION_ALIASES[loc] ?? [loc]).map((x) => `%${x}%`));
    where.push(`location ILIKE ANY($${params.length}::text[])`);
  }
  const mid = '((COALESCE(salary_min, salary_max) + COALESCE(salary_max, salary_min)) / 2.0)';
  const pct = (p) => `round(percentile_cont(${p}) WITHIN GROUP (ORDER BY ${mid}))::bigint`;
  const sql = `SELECT COUNT(*)::int AS n, ${pct(0.25)} AS p25, ${pct(0.5)} AS p50, ${pct(0.75)} AS p75
               FROM jobs WHERE ${where.join(' AND ')}`;
  const overall = await db.get(sql, params);
  if (!overall || overall.n < MIN_SAMPLE) return { n: overall?.n ?? 0, enough: false };
  const bySeniority = await db.all(
    `SELECT seniority, COUNT(*)::int AS n, ${pct(0.5)} AS p50 FROM jobs WHERE ${where.join(' AND ')}
     GROUP BY seniority HAVING COUNT(*) >= 2 ORDER BY p50 DESC`,
    params
  );
  return { ...overall, p25: Number(overall.p25), p50: Number(overall.p50), p75: Number(overall.p75), enough: true, bySeniority: bySeniority.map((r) => ({ ...r, p50: Number(r.p50) })) };
}

/** Short "typical pay" line for a job page: same seniority + city, falling back to seniority only. */
export async function typicalPayFor(db, job) {
  const city = (job.location || '').split(',')[0].replace(/\(.*\)/, '').trim();
  const words = job.title.split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(' ');
  for (const [q, location] of [[words, city], [words, '']]) {
    const s = await salaryStats(db, { q, location, currency: job.currency || MARKET.currency });
    if (s.enough) return { ...s, currency: job.currency || MARKET.currency, scope: location ? `${words} roles in ${city}` : `${words} roles` };
  }
  return null;
}
