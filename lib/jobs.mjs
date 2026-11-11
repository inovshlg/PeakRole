import sanitizeHtml from 'sanitize-html';
import { MARKET, LOCATION_ALIASES } from './market.mjs';
import { detectModule, inferCountry } from './niche.mjs';

export const SENIORITIES = ['Executive', 'Director', 'Lead', 'Senior', 'Mid-level', 'Entry'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

export function inferSeniority(title = '') {
  const t = title.toLowerCase();
  if (/\b(chief|c[etfo]o|vp|vice president|svp|evp|president|partner|general counsel)\b/.test(t)) return 'Executive';
  if (/\b(director|head of)\b/.test(t)) return 'Director';
  if (/\b(lead|principal|staff|manager|controller|architect)\b/.test(t)) return 'Lead';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.?|graduate|intern|entry|associate)\b/.test(t)) return 'Entry';
  return 'Mid-level';
}

export function inferCategory(title = '') {
  const t = title.toLowerCase();
  const rules = [
    ['Engineering', /engineer|developer|software|devops|sre|architect|platform|backend|frontend|infrastructure/],
    ['Data & AI', /data|machine learning|\bml\b|\bai\b|analytics|scientist/],
    ['Product', /product/],
    ['Design', /design|ux|ui\b/],
    ['Sales', /sales|account executive|business development|partnership/],
    ['Marketing', /marketing|growth|brand|content|seo|communications/],
    ['Finance', /finance|accounting|controller|treasury|tax|fp&a|cfo/],
    ['Operations', /operations|supply chain|logistics|procurement/],
    ['People & HR', /recruit|talent|people|hr\b|human resources/],
    ['Legal', /legal|counsel|compliance|attorney/],
    ['Customer Success', /customer|support|success/],
  ];
  return rules.find(([, re]) => re.test(t))?.[0] ?? 'Other';
}

export function cleanHtml(html = '') {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h2', 'h3', 'h4', 'a', 'blockquote'],
    allowedAttributes: { a: ['href'] },
    transformTags: {
      h1: 'h3',
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener', target: '_blank' }),
    },
  });
}

export function htmlToText(html = '') {
  // Put a space where block elements end, so "<p>a</p><p>b</p>" becomes "a b", not "ab".
  return sanitizeHtml(String(html).replace(/<\/(p|li|h[1-6]|div|ul|ol|blockquote)>|<br\s*\/?>/gi, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/**
 * Approximate USD conversion so salary sort/filter compare across currencies.
 * Update these rates periodically (or load them from an FX API).
 */
export const USD_RATES = { USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.73, AUD: 0.66, INR: 0.012, CHF: 1.13, SGD: 0.75 };
export const USD_SQL = `(COALESCE(j.salary_max, j.salary_min) * CASE j.currency ${Object.entries(USD_RATES)
  .map(([c, r]) => `WHEN '${c}' THEN ${r}`).join(' ')} ELSE 1 END)`;

function norm(s = '') {
  return s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function dedupeKey({ company, title, location }) {
  const city = norm((location || '').split(/[,;/|]/)[0]);
  return `${norm(company)}|${norm(title)}|${city}`;
}

/**
 * Insert or update a normalised job. Returns 'inserted' | 'updated' | 'duplicate'.
 * A job is a duplicate if another source already has an active job with the same
 * company + title + city (e.g. the same role found on Greenhouse and on Adzuna).
 */
export async function upsertJob(db, job) {
  const description_html = cleanHtml(job.description_html || '');
  const row = {
    source: job.source,
    external_id: String(job.external_id),
    title: job.title.trim(),
    company: job.company.trim(),
    location: (job.location || '').trim() || (job.remote ? 'Remote' : ''),
    remote: job.remote ? 1 : 0,
    employment_type: job.employment_type || 'Full-time',
    seniority: job.seniority || inferSeniority(job.title),
    category: job.category || detectModule(job.title, htmlToText(job.description_html || '')) || inferCategory(job.title),
    country: (job.country || inferCountry(`${job.location || ''}`) || '').toUpperCase() || null,
    salary_min: job.salary_min ? Math.round(job.salary_min) : null,
    salary_max: job.salary_max ? Math.round(job.salary_max) : null,
    currency: job.currency || null,
    description_html,
    description_text: htmlToText(description_html).slice(0, 20000),
    apply_url: job.apply_url || null,
    posted_at: new Date(job.posted_at || Date.now()).toISOString(),
    expires_at: job.expires_at ? new Date(job.expires_at).toISOString() : null,
    dedupe_key: dedupeKey(job),
    posted_by_user_id: job.posted_by_user_id ?? null,
    company_domain: job.company_domain || null,
  };

  const existing = await db.get('SELECT id FROM jobs WHERE source = $1 AND external_id = $2', [row.source, row.external_id]);
  // Imported jobs are de-duplicated across sources; an employer's own posts always go live.
  if (!existing && row.source !== 'direct') {
    const dup = await db.get(
      "SELECT id FROM jobs WHERE dedupe_key = $1 AND status = 'active' AND NOT (source = $2 AND external_id = $3)",
      [row.dedupe_key, row.source, row.external_id]
    );
    if (dup) return 'duplicate';
  }

  const cols = Object.keys(row);
  await db.run(
    `INSERT INTO jobs (${cols.join(', ')}, last_seen_at, status)
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}, now(), 'active')
     ON CONFLICT (source, external_id) DO UPDATE SET
       ${cols.filter((c) => !['source', 'external_id', 'posted_at'].includes(c)).map((c) => `${c} = excluded.${c}`).join(', ')},
       last_seen_at = now(), status = 'active'`,
    cols.map((c) => row[c])
  );
  return existing ? 'updated' : 'inserted';
}

/** Build WHERE clause + params from search filters. */
function buildWhere(f) {
  const where = ["j.status = 'active'"];
  const params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  if (f.q) {
    for (const term of f.q.trim().split(/\s+/).slice(0, 6)) {
      const t = p(`%${term}%`);
      where.push(`(j.title ILIKE ${t} OR j.company ILIKE ${t} OR j.description_text ILIKE ${t})`);
    }
  }
  if (f.location) {
    const loc = f.location.trim().toLowerCase();
    const terms = LOCATION_ALIASES[loc] ?? [loc];
    where.push(`j.location ILIKE ANY(${p(terms.map((t) => `%${t}%`))}::text[])`);
  }
  if (f.remote) where.push('j.remote = 1');
  // minSalary is in the market currency (INR); compare in USD so every currency is comparable.
  if (f.minSalary) where.push(`${USD_SQL} >= ${p(Number(f.minSalary) * (USD_RATES[MARKET.currency] ?? 1))}`);
  if (f.seniority) where.push(`j.seniority = ${p(f.seniority)}`);
  if (f.category) where.push(`j.category = ${p(f.category)}`);
  if (f.type) where.push(`j.employment_type = ${p(f.type)}`);
  if (f.since) where.push(`j.created_at > ${p(f.since)}`);
  if (f.country) where.push(`j.country = ${p(String(f.country).toUpperCase())}`);
  if (f.module === 'EWM') where.push(`j.category ILIKE '%EWM%'`);
  if (f.module === 'TM') where.push(`j.category ILIKE '%TM%'`);
  if (f.posted && [1, 3, 7, 14, 30].includes(Number(f.posted))) where.push(`j.posted_at > now() - ${p(`${Number(f.posted)} days`)}::interval`);
  return { sql: where.join(' AND '), params };
}

export const CARD_COLS = `j.id, j.title, j.company, j.location, j.remote, j.employment_type, j.seniority, j.category,
  j.salary_min, j.salary_max, j.currency, j.posted_at, j.source, j.company_domain, j.country, (j.featured_until > now()) AS featured`;

export async function searchJobs(db, f = {}) {
  const page = Math.max(1, Math.floor(Number(f.page)) || 1);
  const pageSize = Math.min(50, Math.floor(Number(f.pageSize)) || 20);
  const { sql, params } = buildWhere(f);
  // Featured (paid) jobs float to the top of the default sort.
  const order = f.sort === 'salary' ? `COALESCE(${USD_SQL}, 0) DESC, j.posted_at DESC` : '(j.featured_until > now()) DESC NULLS LAST, j.posted_at DESC';
  const { n: total } = await db.get(`SELECT COUNT(*)::int AS n FROM jobs j WHERE ${sql}`, params);
  const jobs = await db.all(
    `SELECT ${CARD_COLS}, substr(j.description_text, 1, 220) AS snippet
     FROM jobs j WHERE ${sql} ORDER BY ${order}
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params
  );
  return { jobs, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function facetCounts(db) {
  const [categories, stats] = await Promise.all([
    db.all("SELECT category AS name, COUNT(*)::int AS n FROM jobs WHERE status='active' GROUP BY category ORDER BY n DESC"),
    db.get(`SELECT COUNT(*)::int AS total, COUNT(DISTINCT company)::int AS companies,
              (COUNT(*) FILTER (WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL))::int AS "withSalary"
            FROM jobs WHERE status='active'`),
  ]);
  return { categories, ...stats };
}

export async function getJob(db, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) return undefined;
  return db.get('SELECT * FROM jobs WHERE id = $1', [n]);
}

export async function similarJobs(db, job, limit = 4) {
  return db.all(
    `SELECT ${CARD_COLS} FROM jobs j
     WHERE status='active' AND id != $1 AND (category = $2 OR company = $3)
     ORDER BY (company = $3) DESC, posted_at DESC LIMIT ${limit}`,
    [job.id, job.category, job.company]
  );
}

/** Mark jobs from `source` not seen since `runStartedAt` as expired, plus anything past expires_at / 60 days old. */
export async function expireStale(db, { source, companies, runStartedAt } = {}) {
  let n = 0;
  if (source && runStartedAt && companies?.length) {
    n += (await db.run(
      `UPDATE jobs SET status='expired' WHERE status='active' AND source = $1 AND last_seen_at < $2 AND company = ANY($3)`,
      [source, runStartedAt, companies]
    )).rowCount;
  }
  n += (await db.run(
    `UPDATE jobs SET status='expired' WHERE status='active' AND (
       (expires_at IS NOT NULL AND expires_at < now())
       OR (source NOT IN ('direct','seed') AND posted_at < now() - interval '60 days'))`
  )).rowCount;
  return n;
}
