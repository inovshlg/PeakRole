/**
 * Job source connectors. Each `fetchX` returns an array of normalised jobs:
 * { source, external_id, title, company, location, remote, employment_type,
 *   salary_min, salary_max, currency, description_html, apply_url, posted_at }
 *
 * All of these are public, documented endpoints that companies/aggregators
 * publish specifically so job boards can list their openings.
 */

const UA = { 'User-Agent': 'PeakRoleJobBot/1.0 (+job board ingestion)' };

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function decodeEntities(s = '') {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

const isRemote = (...parts) => parts.some((p) => /remote|anywhere|work from home/i.test(p || ''));

function mapType(s = '') {
  const t = s.toLowerCase();
  if (t.includes('part')) return 'Part-time';
  if (t.includes('contract') || t.includes('temp') || t.includes('freelance')) return 'Contract';
  if (t.includes('intern')) return 'Internship';
  return 'Full-time';
}

/** Convert hourly/monthly pay to yearly so salary filters compare like with like. */
function annualise(value, interval = '') {
  if (!value) return null;
  const i = interval.toLowerCase();
  if (i.includes('hour')) return value * 2080;
  if (i.includes('month')) return value * 12;
  if (i.includes('week')) return value * 52;
  return value;
}

/* ---------------- Greenhouse ---------------- */
export function parseGreenhouse(board, company) {
  return (board.jobs ?? []).map((j) => {
    const loc = j.location?.name ?? '';
    return {
      source: 'greenhouse',
      external_id: j.id,
      title: j.title,
      company,
      location: loc,
      remote: isRemote(loc, j.title),
      employment_type: 'Full-time',
      description_html: decodeEntities(j.content ?? ''),
      apply_url: j.absolute_url,
      posted_at: j.first_published ?? j.updated_at,
    };
  });
}

export async function fetchGreenhouse(token) {
  const [meta, board] = await Promise.all([
    getJson(`https://boards-api.greenhouse.io/v1/boards/${token}`).catch(() => ({})),
    getJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`),
  ]);
  return parseGreenhouse(board, meta.name || token);
}

/* ---------------- Lever ---------------- */
export function parseLever(postings, company) {
  return (postings ?? []).map((p) => {
    const lists = (p.lists ?? []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`).join('');
    const sr = p.salaryRange;
    return {
      source: 'lever',
      external_id: p.id,
      title: p.text,
      company,
      location: p.categories?.location ?? '',
      remote: p.workplaceType === 'remote' || isRemote(p.categories?.location),
      employment_type: mapType(p.categories?.commitment),
      salary_min: sr ? annualise(sr.min, sr.interval) : null,
      salary_max: sr ? annualise(sr.max, sr.interval) : null,
      currency: sr?.currency ?? null,
      description_html: `${p.description ?? ''}${lists}${p.additional ?? ''}`,
      apply_url: p.applyUrl ?? p.hostedUrl,
      posted_at: p.createdAt,
    };
  });
}

export async function fetchLever(token) {
  const postings = await getJson(`https://api.lever.co/v0/postings/${token}?mode=json`);
  const company = token.charAt(0).toUpperCase() + token.slice(1);
  return parseLever(postings, company);
}

/* ---------------- Ashby ---------------- */
export function parseAshby(board, company) {
  return (board.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const comp = j.compensation?.summaryComponents?.find((c) => c.compensationType === 'Salary');
      return {
        source: 'ashby',
        external_id: j.id,
        title: j.title,
        company,
        location: j.location ?? '',
        remote: j.isRemote || j.workplaceType === 'Remote',
        employment_type: mapType(j.employmentType),
        salary_min: comp ? annualise(comp.minValue, comp.interval) : null,
        salary_max: comp ? annualise(comp.maxValue, comp.interval) : null,
        currency: comp?.currencyCode ?? null,
        description_html: j.descriptionHtml ?? '',
        apply_url: j.applyUrl ?? j.jobUrl,
        posted_at: j.publishedAt,
      };
    });
}

export async function fetchAshby(token) {
  const board = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`);
  const company = token.charAt(0).toUpperCase() + token.slice(1);
  return parseAshby(board, company);
}

/* ---------------- Adzuna (aggregator, needs free API key) ---------------- */
const ADZUNA_CURRENCY = { gb: 'GBP', us: 'USD', de: 'EUR', fr: 'EUR', nl: 'EUR', in: 'INR', ca: 'CAD', au: 'AUD', at: 'EUR', it: 'EUR', es: 'EUR' };

export function parseAdzuna(data, country) {
  return (data.results ?? []).map((r) => ({
    source: 'adzuna',
    external_id: r.id,
    title: r.title.replace(/<\/?strong>/g, ''),
    company: r.company?.display_name ?? 'Confidential',
    location: r.location?.display_name ?? '',
    remote: isRemote(r.title, r.description),
    employment_type: mapType(r.contract_time),
    salary_min: r.salary_is_predicted === '1' ? null : r.salary_min,
    salary_max: r.salary_is_predicted === '1' ? null : r.salary_max,
    currency: ADZUNA_CURRENCY[country] ?? null,
    description_html: `<p>${r.description ?? ''}</p>`,
    apply_url: r.redirect_url, // must link via redirect_url per Adzuna terms
    posted_at: r.created,
  }));
}

export async function fetchAdzuna({ country = 'gb', queries = [''], pages = 1 }) {
  const { ADZUNA_APP_ID: id, ADZUNA_APP_KEY: key } = process.env;
  if (!id || !key) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping');
  const out = [];
  for (const what of queries) {
    for (let page = 1; page <= pages; page++) {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${id}&app_key=${key}&results_per_page=50&what=${encodeURIComponent(what)}&content-type=application/json`;
      out.push(...parseAdzuna(await getJson(url), country));
    }
  }
  return out;
}
