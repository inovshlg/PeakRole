import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, quickCounts, SENIORITIES } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { MARKET } from '@/lib/market.mjs';
import { COUNTRIES, countryByCode } from '@/lib/niche.mjs';
import { formatSalary } from '@/lib/format.mjs';
import { createAlert } from '@/app/actions';
import { matchMap } from '@/lib/matching.mjs';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';
import AutoSubmitForm from '@/components/AutoSubmitForm';
import Icon from '@/components/Icon';

export const metadata = { title: 'Search SAP EWM & TM jobs' };

function Group({ title, name, value, options }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-2">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, label]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={name} value={v} defaultChecked={value === v} className="peer sr-only" />
            <span className="inline-block rounded-lg bg-canvas-100 px-3 py-1.5 text-[13px] font-medium text-ink/80 hover:bg-canvas-200 peer-checked:bg-brand-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function JobsPage({ searchParams }) {
  const sp = await searchParams;
  const f = {
    q: sp.q || '', location: sp.location || '', remote: sp.remote === '1', minSalary: sp.minSalary || '',
    seniority: SENIORITIES.includes(sp.seniority) ? sp.seniority : '', category: sp.category || '', type: ['Full-time', 'Contract'].includes(sp.type) ? sp.type : '',
    sort: sp.sort === 'salary' ? 'salary' : 'recent', page: sp.page || 1,
    module: ['EWM', 'TM'].includes(sp.module) ? sp.module : '', country: COUNTRIES.some((c) => c.code === sp.country) ? sp.country : '',
    posted: ['1', '3', '7', '14', '30'].includes(sp.posted) ? sp.posted : '',
    maxExp: ['0', '2', '5', '8'].includes(sp.maxExp) ? sp.maxExp : '',
  };
  const db = await getDb();
  const user = await getCurrentUser();
  const [result, counts, savedRows, matches] = await Promise.all([
    searchJobs(db, f),
    quickCounts(db, f),
    user ? db.all('SELECT job_id FROM saved_jobs WHERE user_id = $1', [user.id]) : [],
    matchMap(db, user?.id),
  ]);
  const savedIds = new Set(savedRows.map((r) => r.job_id));

  const params = (over = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, remote: f.remote ? '1' : '', ...over })) if (v && !(k === 'page' && v == 1) && !(k === 'sort' && v === 'recent')) p.set(k, v);
    return p;
  };
  const qs = (over) => `/jobs?${params(over)}`;
  const here = qs({});
  const country = f.country && countryByCode(f.country);
  const label = [f.module ? `SAP ${f.module}` : 'SAP EWM & TM', f.q && `“${f.q}”`].filter(Boolean).join(' ');
  const where = f.location || country?.name;
  const activeFilters = ['remote', 'minSalary', 'seniority', 'type', 'module', 'country', 'posted', 'maxExp'].filter((k) => f[k]).length;

  const chips = [
    ['module', 'EWM', 'SAP EWM', counts.ewm],
    ['module', 'TM', 'SAP TM', counts.tm],
    ['remote', '1', 'Remote', counts.remote],
    ['type', 'Contract', 'Contract', counts.contract],
    ['maxExp', '2', 'Freshers & junior', counts.junior],
    ['posted', '1', 'Last 24 hours', counts.today],
  ];
  const isOn = (k, v) => (k === 'remote' ? f.remote : f[k] === v);

  return (
    <div className="pb-10">
      <section className="bg-brand-50">
        <div className="container-x py-6 sm:py-8">
          <h1 className="font-display text-2xl font-bold sm:text-[28px]">{label} jobs{where ? ` in ${where}` : ''}</h1>
          <p className="mt-1 text-sm text-muted">{result.total.toLocaleString()} open role{result.total === 1 ? '' : 's'}, updated daily</p>
          <div className="mt-4"><SearchBar q={f.q} location={f.location} hidden={{ module: f.module, country: f.country, seniority: f.seniority, type: f.type, maxExp: f.maxExp, remote: f.remote && '1', sort: f.sort !== 'recent' && f.sort }} /></div>

          {sp.alert ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-positive shadow-card">
              <Icon name="checkCircle" /> Alert created. We’ll email you new matching jobs. <Link href="/alerts" className="ml-auto text-brand-500 hover:underline">Manage alerts</Link>
            </p>
          ) : (
            <form action={createAlert} className="mt-3 flex flex-col gap-3 rounded-lg bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center">
              <input type="hidden" name="back" value={here} />
              {[['query', f.q], ['location', f.location], ['module', f.module], ['country', f.country], ['remote', f.remote ? '1' : '']].map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
              <span className="flex items-center gap-2 text-sm"><span className="rounded-full bg-accent-50 p-1.5 text-accent-600"><Icon name="bell" className="h-4 w-4" /></span>
                <span>Get new <b>{label}</b> jobs{where ? <> in <b>{where}</b></> : ''} by email</span>
              </span>
              <div className="flex items-center gap-2 sm:ml-auto">
                <div className="flex rounded-lg bg-canvas-100 p-0.5 text-[13px] font-medium" role="radiogroup" aria-label="How often">
                  {[['daily', 'Daily'], ['weekly', 'Weekly']].map(([v, l]) => (
                    <label key={v} className="cursor-pointer">
                      <input type="radio" name="frequency" value={v} defaultChecked={v === 'daily'} className="peer sr-only" />
                      <span className="block rounded-md px-3 py-1 text-muted peer-checked:bg-white peer-checked:text-brand-500 peer-checked:shadow-card">{l}</span>
                    </label>
                  ))}
                </div>
                {user
                  ? <button className="btn-primary !px-4 !py-1.5 text-sm">Create alert</button>
                  : <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn-primary !px-4 !py-1.5 text-sm">Sign up for alerts</Link>}
              </div>
            </form>
          )}
        </div>
      </section>

      <div className="container-x mt-5">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map(([k, v, l, n]) => {
            const on = isOn(k, v);
            return (
              <Link key={k + v} href={qs({ [k]: on ? '' : v, page: 1 })} aria-pressed={on}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${on ? 'bg-brand-500 text-white' : 'bg-white text-ink/80 shadow-card hover:text-brand-500'}`}>
                {on && <Icon name="check" className="h-3.5 w-3.5" />}{l}<span className={on ? 'text-white/75' : 'text-muted'}>{n}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div>
            <input type="checkbox" id="filters-toggle" className="peer sr-only" />
            <label htmlFor="filters-toggle" className="btn-ghost w-full gap-2 lg:hidden">
              <Icon name="filter" className="h-4 w-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}
            </label>
            <AutoSubmitForm action="/jobs" className="card mt-3 hidden space-y-5 p-5 peer-checked:block lg:sticky lg:top-24 lg:mt-0 lg:block">
              <input type="hidden" name="q" value={f.q} />
              <input type="hidden" name="location" value={f.location} />
              <input type="hidden" name="sort" value={f.sort} />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Filters</h2>
                <Link href={`/jobs?${new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.location && { location: f.location }) })}`} className="text-xs font-medium text-brand-500 hover:underline">Clear all</Link>
              </div>
              <Group title="SAP module" name="module" value={f.module} options={[['', 'EWM & TM'], ['EWM', 'SAP EWM'], ['TM', 'SAP TM']]} />
              <Group title="Experience required" name="maxExp" value={f.maxExp} options={[['', 'Any'], ['0', 'Freshers'], ['2', 'Up to 2 yrs'], ['5', 'Up to 5 yrs'], ['8', 'Up to 8 yrs']]} />
              <Group title="Contract type" name="type" value={f.type} options={[['', 'Any'], ['Full-time', 'Permanent'], ['Contract', 'Contract / freelance']]} />
              <Group title="Date posted" name="posted" value={f.posted} options={[['', 'Any time'], ['1', '24 hours'], ['3', '3 days'], ['7', '7 days'], ['30', '30 days']]} />
              <label className="flex items-center justify-between gap-2 text-sm font-medium">
                Remote only
                <span className="relative inline-flex">
                  <input type="checkbox" name="remote" value="1" defaultChecked={f.remote} className="peer sr-only" />
                  <span className="h-6 w-11 rounded-full bg-canvas-200 transition peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>
              <div>
                <label className="eyebrow mb-2 block" htmlFor="country">Country</label>
                <select id="country" name="country" defaultValue={f.country} className="input">
                  <option value="">All countries</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-2 block" htmlFor="minSalary">Minimum salary (per year)</label>
                <select id="minSalary" name="minSalary" defaultValue={f.minSalary} className="input">
                  <option value="">Any</option>
                  {MARKET.salarySteps.map((s) => <option key={s} value={s}>{formatSalary(s, null, MARKET.currency)}+</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-2 block" htmlFor="seniority">Seniority</label>
                <select id="seniority" name="seniority" defaultValue={f.seniority} className="input">
                  <option value="">Any</option>
                  {SENIORITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button className="btn-primary w-full">Show {result.total.toLocaleString()} jobs</button>
            </AutoSubmitForm>
          </div>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {result.total > 0 ? <>Showing <b className="text-ink">{(result.page - 1) * result.pageSize + 1}–{Math.min(result.total, result.page * result.pageSize)}</b> of <b className="text-ink">{result.total.toLocaleString()}</b></> : 'No results'}
              </p>
              <div className="flex items-center gap-1 rounded-lg bg-canvas-100 p-0.5 text-[13px] font-medium">
                {[['recent', 'Newest'], ['salary', 'Highest salary']].map(([v, l]) => (
                  <Link key={v} href={qs({ sort: v, page: 1 })} className={`rounded-md px-3 py-1 ${f.sort === v ? 'bg-white text-brand-500 shadow-card' : 'text-muted hover:text-ink'}`}>{l}</Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {result.jobs.map((j) => <JobCard key={j.id} job={j} saved={user ? savedIds.has(j.id) : undefined} match={matches.get(j.id)} />)}
              {result.jobs.length === 0 && (
                <div className="card flex flex-col items-center p-10 text-center">
                  <span className="rounded-full bg-brand-50 p-4 text-brand-500"><Icon name="search" className="h-7 w-7" /></span>
                  <p className="mt-4 font-display text-lg font-semibold">No jobs match these filters right now</p>
                  <p className="mt-1 max-w-md text-sm text-muted">New SAP EWM/TM roles arrive every day. Create the alert above and we’ll email you the moment one matches, or widen your search.</p>
                  <Link href="/jobs" className="btn-ghost mt-5">See all jobs</Link>
                </div>
              )}
            </div>

            {result.pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
                {result.page > 1 && <Link className="btn-ghost !py-2" href={qs({ page: result.page - 1 })}>← Previous</Link>}
                <span className="px-3 text-muted">Page {result.page} of {result.pages}</span>
                {result.page < result.pages && <Link className="btn-ghost !py-2" href={qs({ page: result.page + 1 })}>Next →</Link>}
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
