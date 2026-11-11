import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, facetCounts } from '@/lib/jobs.mjs';
import { MARKET, LOCATION_ALIASES } from '@/lib/market.mjs';
import { slugify } from '@/lib/format.mjs';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';
import CompanyMark from '@/components/CompanyMark';

export const dynamic = 'force-dynamic';

const POPULAR = ['Product Manager', 'Engineering Manager', 'Finance Controller', 'Sales Director', 'Data Scientist', 'HR Head'];
const CATEGORY_ICON = {
  Engineering: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12', 'Data & AI': 'M4 19V9M10 19V5M16 19v-7M22 19H2', Product: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z',
  Design: 'M12 3a9 9 0 1 0 9 9c0-1.5-1.5-2-3-2h-2a2 2 0 0 1-2-2V6c0-1.5-.5-3-2-3z', Sales: 'M3 17l6-6 4 4 8-8M15 7h6v6', Marketing: 'M3 11v2l13 5V6zM16 9a3 3 0 0 1 0 6',
  Finance: 'M7 5h10M7 9h10M7 5c5 0 5 8 0 8l7 7', Operations: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2', 'People & HR': 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0',
  Legal: 'M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z', 'Customer Success': 'M4 12a8 8 0 1 1 16 0v5h-3v-5M4 12v5h3v-5', Other: 'M4 8h16v11H4zM9 8V5h6v3',
};

function Icon({ d }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden><path d={d} /></svg>;
}

export default async function Home() {
  const db = await getDb();
  const cityCount = (city) => db.get(
    "SELECT COUNT(*)::int AS n FROM jobs WHERE status = 'active' AND location ILIKE ANY($1::text[])",
    [(LOCATION_ALIASES[city.toLowerCase()] ?? [city.toLowerCase()]).map((x) => `%${x}%`)]
  ).then((r) => [city, r.n]);
  const [stats, { jobs }, companies, cities] = await Promise.all([
    facetCounts(db),
    searchJobs(db, { pageSize: 6 }),
    db.all(
      `SELECT company, MAX(company_domain) AS domain, COUNT(*)::int AS n FROM jobs WHERE status = 'active'
       GROUP BY company ORDER BY (MAX(company_domain) IS NOT NULL) DESC, n DESC LIMIT 12`
    ),
    Promise.all(MARKET.cities.map(cityCount)),
  ]);

  return (
    <>
      <section className="border-b border-canvas-200 bg-white">
        <div className="container-x py-12 text-center sm:py-16">
          <h1 className="text-3xl font-bold leading-tight sm:text-[44px]">Find your next senior role in India</h1>
          <p className="mx-auto mt-3 max-w-2xl text-ink/65 sm:text-lg">
            {stats.total.toLocaleString('en-IN')} open jobs from {stats.companies.toLocaleString('en-IN')} companies, with salaries shown on most listings.
          </p>
          <div className="mx-auto mt-8 max-w-4xl text-left"><SearchBar withLevel /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-2 gap-y-2 text-sm">
            <span className="text-ink/55">Popular:</span>
            {POPULAR.map((p) => <Link key={p} href={`/jobs?q=${encodeURIComponent(p)}`} className="rounded-full border border-canvas-200 px-3 py-0.5 text-ink/70 hover:border-brand-500 hover:text-brand-600">{p}</Link>)}
          </div>
        </div>
      </section>

      {companies.length > 0 && (
        <section className="container-x mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl sm:text-2xl">Top companies hiring now</h2>
            <Link href="/companies" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">View all companies</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {companies.map((c) => (
              <Link key={c.company} href={`/companies/${slugify(c.company)}`} className="card card-hover flex flex-col items-center p-4 text-center">
                <CompanyMark name={c.company} domain={c.domain} />
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{c.company}</p>
                <p className="text-xs text-brand-600">{c.n} job{c.n === 1 ? '' : 's'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-x mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl sm:text-2xl">Latest jobs</h2>
            <Link href="/jobs" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">View all jobs</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </div>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg">Jobs by city</h2>
            <ul className="mt-3 divide-y divide-canvas-100 text-[15px]">
              {cities.map(([c, n]) => (
                <li key={c}><Link href={`/jobs?location=${encodeURIComponent(c)}`} className="flex justify-between py-2.5 hover:text-brand-600"><span>Jobs in {c}</span><span className="text-ink/50">{n}</span></Link></li>
              ))}
              <li><Link href="/jobs?remote=1" className="flex justify-between py-2.5 hover:text-brand-600"><span>Remote jobs</span><span className="text-ink/50">→</span></Link></li>
            </ul>
          </div>
          <div className="card bg-brand-50 p-5">
            <h2 className="text-lg">Not getting interview calls?</h2>
            <p className="mt-1 text-sm text-ink/70">Make a fresh CV in minutes and adapt it to every job you apply for. Free to start.</p>
            <Link href="/cv" className="btn-primary mt-4">Create my CV</Link>
          </div>
        </aside>
      </section>

      <section className="container-x mt-12">
        <h2 className="mb-4 text-xl sm:text-2xl">Explore jobs by department</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.categories.map((c) => (
            <Link key={c.name} href={`/jobs?category=${encodeURIComponent(c.name)}`} className="card card-hover p-4">
              <span className="text-brand-500"><Icon d={CATEGORY_ICON[c.name] || CATEGORY_ICON.Other} /></span>
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-ink/50">{c.n} jobs</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-12 grid gap-4 md:grid-cols-3">
        {[
          ['/headhunters', 'Talk to a headhunter', 'Search consultants by industry and city and send them your profile directly.'],
          ['/salaries', 'Check salaries', 'See what companies pay for your role in your city, in lakhs per annum.'],
          ['/alerts', 'Get job alerts', 'We email you when new jobs match what you’re looking for.'],
        ].map(([href, t, d]) => (
          <Link key={href} href={href} className="card card-hover p-5">
            <h3 className="text-base">{t} →</h3>
            <p className="mt-1 text-sm text-ink/60">{d}</p>
          </Link>
        ))}
      </section>

      <section className="container-x mt-12">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl text-white">Hiring? Post a job for free</h2>
            <p className="mt-1 text-white/75">Reach experienced professionals across India and manage applicants in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup?role=employer" className="btn-accent">Post a job</Link>
            <Link href="/signup?role=headhunter" className="btn border border-white/40 text-white hover:bg-white/10">Join as a headhunter</Link>
          </div>
        </div>
      </section>
    </>
  );
}
