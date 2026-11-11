/**
 * Job Salary Data API (RapidAPI, by the makers of JSearch): salary estimates from Glassdoor,
 * Indeed, Payscale etc. for a job title + location.
 * Key: JOB_SALARY_DATA_API (or the same RapidAPI key as JSearch). Results are cached in
 * salary_cache for 30 days, and at most SALARY_MAX_CALLS_PER_DAY (default 20) fresh calls are made per day.
 */
import { COUNTRIES } from './niche.mjs';

export const SALARY_ROLES = [
  'SAP EWM Consultant', 'Senior SAP EWM Consultant', 'SAP EWM Architect', 'SAP EWM Developer',
  'SAP TM Consultant', 'Senior SAP TM Consultant', 'SAP TM Architect', 'SAP Logistics Consultant',
];
export const SALARY_LOCATIONS = [
  'Bengaluru, India', 'Pune, India', 'Hyderabad, India', 'Mumbai, India', 'Chennai, India', 'Gurugram, India',
  ...COUNTRIES.filter((c) => c.code !== 'IN').map((c) => c.name), 'India',
];

const key = () => process.env.JOB_SALARY_DATA_API || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;
export const salaryApiEnabled = () => !!key();

const PER_YEAR = { year: 1, yearly: 1, annual: 1, month: 12, monthly: 12, week: 52, weekly: 52, day: 220, daily: 220, hour: 1920, hourly: 1920 };

/** Normalise the API response into yearly figures per source. */
export function parseSalaryData(data) {
  return (data?.data ?? [])
    .map((d) => {
      const mult = PER_YEAR[String(d.salary_period || 'year').toLowerCase()] ?? 1;
      const n = (v) => (Number(v) > 0 ? Math.round(Number(v) * mult) : null);
      return {
        source: d.publisher_name || 'Market data',
        link: d.publisher_link || null,
        location: d.location || null,
        min: n(d.min_salary ?? d.min_base_salary),
        max: n(d.max_salary ?? d.max_base_salary),
        median: n(d.median_salary ?? d.median_base_salary),
        currency: d.salary_currency || 'USD',
        count: Number(d.salary_count) || null,
        confidence: d.confidence || null,
      };
    })
    .filter((r) => r.median || (r.min && r.max));
}

/** Cached lookup. Returns { results, cached, fetched_at } or throws with a readable message. */
export async function getSalaryData(db, role, location) {
  if (!SALARY_ROLES.includes(role) || !SALARY_LOCATIONS.includes(location)) throw new Error('Unsupported role or location.');
  const cacheKey = `${role}|${location}`.toLowerCase();
  const hit = await db.get(
    "SELECT data, fetched_at FROM salary_cache WHERE key = $1 AND fetched_at > now() - interval '30 days'",
    [cacheKey]
  );
  if (hit) return { results: hit.data, cached: true, fetched_at: hit.fetched_at };
  if (!salaryApiEnabled()) throw new Error('Salary data is not connected yet.');

  const max = Math.max(1, Number(process.env.SALARY_MAX_CALLS_PER_DAY) || 20);
  const { n } = await db.get("SELECT COUNT(*)::int AS n FROM salary_cache WHERE fetched_at > now() - interval '1 day'");
  if (n >= max) throw new Error('Today’s salary lookups are used up. Please try again tomorrow.');

  const base = process.env.JOB_SALARY_BASE_URL || 'https://job-salary-data.p.rapidapi.com';
  const qs = new URLSearchParams({ job_title: role, location, location_type: 'ANY', years_of_experience: 'ALL' });
  const res = await fetch(`${base}/job-salary?${qs}`, {
    headers: { 'X-RapidAPI-Key': key(), 'X-RapidAPI-Host': 'job-salary-data.p.rapidapi.com', Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Salary API key is not subscribed to Job Salary Data on RapidAPI.');
  if (res.status === 429) throw new Error('Salary API quota reached. Please try again later.');
  if (!res.ok) throw new Error(`Salary API error (${res.status}).`);
  const results = parseSalaryData(await res.json());
  await db.run(
    `INSERT INTO salary_cache (key, data, fetched_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET data = excluded.data, fetched_at = now()`,
    [cacheKey, JSON.stringify(results)]
  );
  return { results, cached: false, fetched_at: new Date() };
}
