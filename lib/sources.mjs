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

/**
 * Every request counts against your Adzuna quota (a trial key has very few), so a run makes
 * at most ADZUNA_MAX_CALLS requests (default 6) and stops paging when a query runs out.
 */
export async function fetchAdzuna({ country = 'in', queries = [''], pages = 1, maxDaysOld = 30 }) {
  const { ADZUNA_APP_ID: id, ADZUNA_APP_KEY: key } = process.env;
  if (!id || !key) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping');
  let budget = Math.max(1, Number(process.env.ADZUNA_MAX_CALLS) || 6);
  const out = [];
  for (const what of queries) {
    for (let page = 1; page <= pages && budget > 0; page++) {
      budget--;
      const qs = new URLSearchParams({
        app_id: id, app_key: key, results_per_page: '50', what, max_days_old: String(maxDaysOld),
        sort_by: 'date', 'content-type': 'application/json',
      });
      const data = await getJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${qs}`);
      const jobs = parseAdzuna(data, country);
      out.push(...jobs);
      if (jobs.length < 50) break; // no more pages for this query
    }
  }
  return out;
}

/* ---------------- SmartRecruiters (public Posting API) ---------------- */
const htmlOf = (...parts) => parts.filter(Boolean).join('');

export function parseSmartRecruitersPosting(p, detail = {}) {
  const loc = p.location || {};
  const s = detail.jobAd?.sections || {};
  return {
    source: 'smartrecruiters',
    external_id: p.id,
    title: p.name,
    company: p.company?.name || p.company?.identifier || 'Company',
    location: [loc.city, loc.region, loc.country === 'in' ? 'India' : (loc.country || '').toUpperCase()].filter(Boolean).join(', '),
    remote: !!loc.remote,
    employment_type: mapType(p.typeOfEmployment?.label),
    description_html: htmlOf(
      s.jobDescription?.text && `<h3>${s.jobDescription.title || 'Job description'}</h3>${s.jobDescription.text}`,
      s.qualifications?.text && `<h3>${s.qualifications.title || 'Qualifications'}</h3>${s.qualifications.text}`,
      s.additionalInformation?.text && `<h3>${s.additionalInformation.title || 'Additional information'}</h3>${s.additionalInformation.text}`
    ),
    apply_url: detail.applyUrl || detail.postingUrl || `https://jobs.smartrecruiters.com/${p.company?.identifier}/${p.id}`,
    posted_at: p.releasedDate,
  };
}

/** Lists India postings (country=in), then fetches up to `maxDetails` descriptions, 8 at a time. */
export async function fetchSmartRecruiters(company, { country = 'in', maxDetails = 60 } = {}) {
  const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings`;
  const list = await getJson(`${base}?limit=100&country=${country}`);
  const postings = (list.content ?? []).slice(0, maxDetails);
  const out = [];
  for (let i = 0; i < postings.length; i += 8) {
    const batch = postings.slice(i, i + 8);
    const details = await Promise.all(batch.map((p) => getJson(`${base}/${p.id}`).catch(() => ({}))));
    batch.forEach((p, k) => out.push(parseSmartRecruitersPosting(p, details[k])));
  }
  return out;
}

/* ---------------- Recruitee (public careers API) ---------------- */
export function parseRecruitee(data, fallbackCompany) {
  return (data.offers ?? []).map((o) => ({
    source: 'recruitee',
    external_id: o.id,
    title: o.title,
    company: o.company_name || fallbackCompany,
    location: o.location || [o.city, o.country].filter(Boolean).join(', '),
    remote: !!o.remote,
    employment_type: mapType(o.employment_type_code),
    salary_min: o.salary?.min ? annualise(Number(o.salary.min), o.salary.period) : null,
    salary_max: o.salary?.max ? annualise(Number(o.salary.max), o.salary.period) : null,
    currency: o.salary?.currency || null,
    description_html: `${o.description || ''}${o.requirements ? `<h3>Requirements</h3>${o.requirements}` : ''}`,
    apply_url: o.careers_apply_url || o.careers_url,
    posted_at: o.published_at || o.created_at,
  }));
}

export async function fetchRecruitee(slug) {
  return parseRecruitee(await getJson(`https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`), slug);
}

/* ---------------- Workable (public account widget API) ---------------- */
export function parseWorkable(data, slug) {
  return (data.jobs ?? []).map((j) => ({
    source: 'workable',
    external_id: j.shortcode || j.id,
    title: j.title,
    company: data.name || slug,
    location: [j.city, j.state, j.country].filter(Boolean).join(', '),
    remote: !!j.telecommuting,
    employment_type: mapType(j.employment_type),
    description_html: j.description || '',
    apply_url: j.application_url || j.url || j.shortlink,
    posted_at: j.published_on || j.created_at,
  }));
}

export async function fetchWorkable(slug) {
  return parseWorkable(await getJson(`https://www.workable.com/api/accounts/${encodeURIComponent(slug)}?details=true`), slug);
}

/* ---------------- JSearch (RapidAPI; Google for Jobs data) ---------------- */
const textToHtml = (t = '') =>
  String(t).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => {
      const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (lines.length > 1 && lines.every((l) => /^[-•*·]\s?/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-•*·]\s?/, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(esc).join('<br>')}</p>`;
    }).join('');

/** Handles both the classic and the newer JSearch response shapes. */
export function parseJSearch(data, fallbackCountry) {
  return (data.data ?? []).map((j) => {
    const types = j.job_employment_types ?? (j.job_employment_type ? [j.job_employment_type] : []);
    const type = types.join(' ').toUpperCase();
    const period = String(j.job_salary_period || '').toLowerCase();
    const loc = j.job_location || [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ');
    return {
      source: 'jsearch',
      external_id: j.job_id,
      title: j.job_title,
      company: j.employer_name || 'Confidential',
      company_domain: j.employer_website ? String(j.employer_website).replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
      location: loc || (j.job_is_remote ? 'Remote' : ''),
      country: (j.job_country || fallbackCountry || '').toUpperCase() || null,
      remote: !!j.job_is_remote,
      employment_type: type.includes('CONTRACT') ? 'Contract' : type.includes('PART') ? 'Part-time' : type.includes('INTERN') ? 'Internship' : 'Full-time',
      salary_min: j.job_min_salary ? annualise(j.job_min_salary, period) : null,
      salary_max: j.job_max_salary ? annualise(j.job_max_salary, period) : null,
      currency: j.job_salary_currency || null,
      description_html: textToHtml(j.job_description),
      apply_url: j.job_apply_link || j.job_google_link,
      posted_at: j.job_posted_at_datetime_utc || (j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : Date.now()),
      expires_at: j.job_offer_expiration_datetime_utc || null,
      publisher: j.job_publisher || null,
      min_experience: j.job_required_experience?.no_experience_required ? 0
        : j.job_required_experience?.required_experience_in_months != null ? Math.floor(j.job_required_experience.required_experience_in_months / 12) : null,
    };
  });
}

/**
 * Rotating JSearch queries: each run uses at most JSEARCH_MAX_CALLS requests (default 4),
 * walking through (query × country) combinations day by day, so every combination is
 * refreshed every few days while staying inside the free tier.
 */
export async function fetchJSearch({ queries = ['SAP EWM', 'SAP TM'], countries = ['in', 'de', 'us'], datePosted = 'week' } = {}) {
  const key = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('JSEARCH_API_KEY not set — skipping');
  const combos = queries.flatMap((q) => countries.map((c) => [q, c]));
  const perRun = Math.max(1, Math.min(combos.length, Number(process.env.JSEARCH_MAX_CALLS) || 4));
  const day = Math.floor(Date.now() / 86_400_000);
  const start = (day * perRun) % combos.length;
  const out = [];
  for (let i = 0; i < perRun; i++) {
    const [q, country] = combos[(start + i) % combos.length];
    const qs = new URLSearchParams({ query: q, page: '1', num_pages: '1', country, date_posted: datePosted });
    const res = await fetch(`${process.env.JSEARCH_BASE_URL || 'https://jsearch.p.rapidapi.com'}/search?${qs}`, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com', Accept: 'application/json' },
    });
    if (res.status === 429) throw new Error('JSearch quota reached for this period (429)');
    if (!res.ok) {
      // RapidAPI explains 401/403 in the body, e.g. "You are not subscribed to this API."
      const why = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
      const hint = res.status === 403 || res.status === 401 ? ' (check the key and that this RapidAPI account is subscribed to JSearch)' : '';
      throw new Error(`JSearch ${res.status} for "${q}" in ${country}: ${why}${hint}`);
    }
    out.push(...parseJSearch(await res.json(), country));
  }
  return out;
}
