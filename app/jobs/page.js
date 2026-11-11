import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, facetCounts, SENIORITIES, EMPLOYMENT_TYPES } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';

export const metadata = { title: 'Search jobs' };

const SALARY_STEPS = [50000, 80000, 100000, 150000, 200000];

export default async function JobsPage({ searchParams }) {
  const sp = await searchParams;
  const f = {
    q: sp.q || '', location: sp.location || '', remote: sp.remote === '1', minSalary: sp.minSalary || '',
    seniority: sp.seniority || '', category: sp.category || '', type: sp.type || '', sort: sp.sort || 'recent', page: sp.page || 1,
  };
  const db = getDb();
  const result = searchJobs(db, f);
  const { categories } = facetCounts(db);
  const user = await getCurrentUser();
  const savedIds = new Set(
    user ? db.prepare('SELECT job_id FROM saved_jobs WHERE user_id = ?').all(user.id).map((r) => r.job_id) : []
  );

  const qs = (over) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, remote: f.remote ? '1' : '', ...over })) if (v && !(k === 'page' && v == 1) && !(k === 'sort' && v === 'recent')) p.set(k, v);
    return `/jobs?${p}`;
  };

  return (
    <div className="container-x py-8">
      <SearchBar q={f.q} location={f.location} hidden={{ category: f.category, seniority: f.seniority, sort: f.sort !== 'recent' && f.sort }} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <form action="/jobs" className="card space-y-6 p-5 lg:sticky lg:top-24">
            <input type="hidden" name="q" value={f.q} />
            <input type="hidden" name="location" value={f.location} />
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-sm font-semibold">Filters</h2>
              <Link href={`/jobs?${new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.location && { location: f.location }) })}`} className="text-xs text-ink/50 hover:text-ink">Reset</Link>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remote" value="1" defaultChecked={f.remote} className="h-4 w-4 accent-moss-700" /> Remote only
            </label>
            <div>
              <label className="label" htmlFor="minSalary">Minimum salary (USD equiv.)</label>
              <select id="minSalary" name="minSalary" defaultValue={f.minSalary} className="input">
                <option value="">Any</option>
                {SALARY_STEPS.map((s) => <option key={s} value={s}>${(s / 1000).toLocaleString()}k+</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="seniority">Seniority</label>
              <select id="seniority" name="seniority" defaultValue={f.seniority} className="input">
                <option value="">Any</option>
                {SENIORITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">Field</label>
              <select id="category" name="category" defaultValue={f.category} className="input">
                <option value="">All fields</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.n})</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="type">Job type</label>
              <select id="type" name="type" defaultValue={f.type} className="input">
                <option value="">Any</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <input type="hidden" name="sort" value={f.sort} />
            <button className="btn-primary w-full">Apply filters</button>
          </form>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/60">
              <strong className="text-ink">{result.total.toLocaleString()}</strong> jobs{f.q && <> for “{f.q}”</>}{f.location && <> in {f.location}</>}
            </p>
            <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1 text-sm">
              {[['recent', 'Newest'], ['salary', 'Highest salary']].map(([v, l]) => (
                <Link key={v} href={qs({ sort: v, page: 1 })} className={`rounded-full px-3 py-1 ${f.sort === v ? 'bg-moss-700 text-white' : 'text-ink/60 hover:text-ink'}`}>{l}</Link>
              ))}
            </div>
          </div>

          {user && (f.q || f.location) && (
            <Link href={`/alerts?query=${encodeURIComponent(f.q)}&location=${encodeURIComponent(f.location)}`} className="alert-ok mb-4 block hover:underline">
              🔔 Get an email when new “{[f.q, f.location].filter(Boolean).join(' in ')}” jobs are posted
            </Link>
          )}

          <div className="space-y-3">
            {result.jobs.map((j) => <JobCard key={j.id} job={j} saved={savedIds.has(j.id)} />)}
            {result.jobs.length === 0 && (
              <div className="card p-10 text-center">
                <p className="font-display text-xl">No jobs match these filters</p>
                <p className="mt-2 text-sm text-ink/60">Try a broader title, a different location or remove some filters.</p>
              </div>
            )}
          </div>

          {result.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
              {result.page > 1 && <Link className="btn-ghost !py-2" href={qs({ page: result.page - 1 })}>← Previous</Link>}
              <span className="px-3 text-ink/60">Page {result.page} of {result.pages}</span>
              {result.page < result.pages && <Link className="btn-ghost !py-2" href={qs({ page: result.page + 1 })}>Next →</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
