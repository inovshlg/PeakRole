import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, facetCounts, CARD_COLS } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { countryByCode } from '@/lib/niche.mjs';
import { slugify } from '@/lib/format.mjs';
import { SALARY_ROLES, SALARY_LOCATIONS } from '@/lib/salary-api.mjs';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';
import CompanyMark from '@/components/CompanyMark';
import Icon from '@/components/Icon';

export const dynamic = 'force-dynamic';

const TRENDING = ['EWM consultant', 'Embedded EWM', 'SAP TM functional', 'EWM ABAP', 'MFS', 'Freight settlement', 'Yard logistics'];

function telegramUrl() {
  const id = process.env.TELEGRAM_CHANNEL_ID || '';
  return /^@\w{4,}$/.test(id) ? `https://t.me/${id.slice(1)}` : null;
}

export default async function Home() {
  const db = await getDb();
  const user = await getCurrentUser();
  const candidate = user?.role === 'candidate' ? user : null;
  const [stats, latest, companies, countries, modules, recommended, savedRows] = await Promise.all([
    facetCounts(db),
    searchJobs(db, { pageSize: 6 }),
    db.all(
      `SELECT company, MAX(company_domain) AS domain, COUNT(*)::int AS n FROM jobs WHERE status = 'active'
       GROUP BY company ORDER BY n DESC, (MAX(company_domain) IS NOT NULL) DESC LIMIT 12`
    ),
    db.all("SELECT country, COUNT(*)::int AS n FROM jobs WHERE status = 'active' AND country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 8"),
    db.get(`SELECT COUNT(*) FILTER (WHERE category ILIKE '%EWM%')::int AS ewm, COUNT(*) FILTER (WHERE category ILIKE '%TM%')::int AS tm,
              COUNT(*) FILTER (WHERE employment_type = 'Contract')::int AS contract, COUNT(*) FILTER (WHERE remote = 1)::int AS remote,
              COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS today
            FROM jobs WHERE status = 'active'`),
    candidate
      ? db.all(
        `SELECT ${CARD_COLS}, substr(j.description_text, 1, 220) AS snippet, m.score, m.ai FROM job_matches m JOIN jobs j ON j.id = m.job_id
         WHERE m.user_id = $1 AND j.status = 'active' ORDER BY m.score DESC, j.posted_at DESC LIMIT 6`, [candidate.id])
      : [],
    candidate ? db.all('SELECT job_id FROM saved_jobs WHERE user_id = $1', [candidate.id]) : [],
  ]);
  const savedIds = new Set(savedRows.map((r) => r.job_id));
  const feed = recommended.length ? recommended : latest.jobs;
  const tg = telegramUrl();

  const moduleCards = [
    ['/sap-ewm-jobs', 'SAP EWM', 'Inbound, outbound, wave & slotting, RF, MFS', modules.ewm, 'roles', 'warehouse', 'bg-brand-100 text-brand-600', 'text-brand-600'],
    ['/sap-tm-jobs', 'SAP TM', 'Freight orders, carrier selection, charge calculation', modules.tm, 'roles', 'truck', 'bg-accent-50 text-accent-600', 'text-accent-600'],
    ['/jobs?type=Contract', 'Contract & freelance', 'Day-rate and fixed-term SAP projects', modules.contract, 'gigs', 'calendar', 'bg-canvas-200 text-ink', 'text-ink'],
    ['/jobs?remote=1', 'Remote', 'Work from anywhere, across time zones', modules.remote, 'roles', 'globe', 'bg-mint text-positive', 'text-positive'],
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-brand-50">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[280px] w-[720px] -translate-x-1/2 rounded-full bg-brand-100 opacity-60 blur-3xl" />
        <div className="container-x relative pb-14 pt-8 sm:pt-10">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1 shadow-card">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-positive" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Live SAP logistics market</span>
            <span className="text-xs font-semibold text-positive">{stats.total.toLocaleString('en-IN')} open roles · {stats.companies.toLocaleString('en-IN')} companies{modules.today ? ` · ${modules.today} new today` : ''}</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]">SAP EWM &amp; SAP TM jobs worldwide</h1>
          <p className="mt-2 max-w-2xl text-base text-muted sm:text-lg">The job board for warehouse, transportation and yard logistics consultants. Permanent, contract and remote roles, updated every day.</p>
          <div className="mt-6"><SearchBar withLevel /></div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">Trending:</span>
            {TRENDING.map((t) => <Link key={t} href={`/jobs?q=${encodeURIComponent(t)}`} className="rounded-md bg-white/70 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-white">{t}</Link>)}
          </div>
        </div>
      </section>

      <section className="container-x relative z-10 -mt-7">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {moduleCards.map(([href, title, desc, n, unit, icon, iconCls, textCls]) => (
            <Link key={href} href={href} className="group flex flex-col rounded-xl bg-white p-4 shadow-card transition hover:shadow-raised">
              <div className="flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconCls}`}><Icon name={icon} className="h-6 w-6" /></span>
                <span className={`rounded-full bg-canvas-100 px-2 py-0.5 text-xs font-bold ${textCls}`}>{n} {n === 1 ? unit.replace(/s$/, '') : unit}</span>
              </div>
              <h3 className="mt-3 font-display text-[17px] font-semibold group-hover:text-brand-500">{title}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{desc}</p>
              <span className={`mt-3 inline-flex items-center gap-1 text-[13px] font-medium ${textCls}`}>Browse <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-brand-100 p-2 text-brand-500"><Icon name={recommended.length ? 'sparkle' : 'briefcase'} className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-xl font-semibold">{recommended.length ? 'Recommended for you' : 'Latest SAP EWM & TM jobs'}</h2>
              <p className="text-xs text-muted">
                {recommended.length
                  ? <>Matched to your profile{candidate.sap_modules ? <>: <b className="text-ink">{candidate.sap_modules}</b></> : ''}</>
                  : candidate ? <><Link href="/matches" className="font-medium text-brand-500 hover:underline">Upload your CV</Link> to see jobs ranked for you</> : 'Fresh roles from company career pages and job boards'}
              </p>
            </div>
          </div>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">All {stats.total.toLocaleString('en-IN')} jobs <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="space-y-3">
          {feed.map((j) => <JobCard key={j.id} job={j} match={recommended.length ? j : undefined} saved={candidate ? savedIds.has(j.id) : undefined} />)}
          {feed.length === 0 && <p className="card p-6 text-sm text-muted">No jobs yet. The daily import adds new roles every morning.</p>}
        </div>
      </section>

      <section className="container-x mt-12 grid gap-4 lg:grid-cols-2">
        <form action="/salaries" className="card flex flex-col p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-mint p-2 text-positive"><Icon name="money" className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-lg font-semibold">What are you worth?</h2>
              <p className="text-xs text-muted">Salary ranges for SAP EWM/TM roles from public salary sources</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select name="role" required defaultValue="" className="input" aria-label="Role">
              <option value="" disabled>Your role</option>{SALARY_ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
            <select name="location" required defaultValue="" className="input" aria-label="Location">
              <option value="" disabled>Location</option>{SALARY_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button className="btn-primary mt-4 self-start">Check salary</button>
        </form>

        {tg ? (
          <div className="card flex flex-col p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-brand-100 p-2 text-brand-500"><Icon name="bell" className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-lg font-semibold">Instant alerts on Telegram</h2>
                <p className="text-xs text-muted">Every new SAP EWM/TM job, posted to our channel as it arrives</p>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-brand-50 p-4 text-sm">
              {latest.jobs[0] ? <><p className="font-semibold">🆕 {latest.jobs[0].title}</p><p className="text-muted">{latest.jobs[0].company} · {latest.jobs[0].location}</p></> : <p className="text-muted">New roles appear here every day.</p>}
            </div>
            <a href={tg} target="_blank" rel="noopener" className="btn-primary mt-4 self-start">Join the channel</a>
          </div>
        ) : (
          <div className="card flex flex-col p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-brand-100 p-2 text-brand-500"><Icon name="bell" className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-lg font-semibold">Never miss an EWM/TM role</h2>
                <p className="text-xs text-muted">Daily or weekly email when new jobs match your search</p>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-ink/80">
              {['Choose module, country and keywords', 'Daily or weekly, your choice', 'Unsubscribe with one click'].map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-positive" />{t}</li>)}
            </ul>
            <Link href={candidate ? '/alerts' : '/signup?next=/alerts'} className="btn-primary mt-4 self-start">Set up job alerts</Link>
          </div>
        )}
      </section>

      {companies.length > 0 && (
        <section className="container-x mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Companies hiring now</h2>
            <Link href="/companies" className="shrink-0 text-sm font-semibold text-brand-500 hover:underline">All companies</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {companies.map((c) => (
              <Link key={c.company} href={`/companies/${slugify(c.company)}`} className="flex flex-col items-center rounded-xl bg-white p-4 text-center shadow-card transition hover:shadow-raised">
                <CompanyMark name={c.company} domain={c.domain} />
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{c.company}</p>
                <p className="text-xs font-medium text-brand-500">{c.n} open job{c.n === 1 ? '' : 's'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {countries.length > 0 && (
        <section className="container-x mt-12">
          <h2 className="mb-4 font-display text-xl font-semibold">Jobs by country</h2>
          <div className="flex flex-wrap gap-2">
            {countries.map(({ country, n }) => {
              const c = countryByCode(country);
              return c ? (
                <Link key={country} href={`/jobs?country=${country}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-card hover:text-brand-500">
                  {c.name}<span className="text-muted">{n}</span>
                </Link>
              ) : null;
            })}
            <Link href="/jobs?remote=1" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-card hover:text-brand-500">Remote<span className="text-muted">{modules.remote}</span></Link>
          </div>
        </section>
      )}

      <section className="container-x mt-12">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">For employers</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">Hiring SAP EWM or TM consultants?</h2>
            <p className="mt-1 text-white/75">Tell us the role and get a shortlist of screened consultants who have agreed to be introduced.</p>
          </div>
          <Link href="/employers" className="btn-accent shrink-0">Send a hiring enquiry</Link>
        </div>
      </section>
    </>
  );
}
