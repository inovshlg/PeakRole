import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { getSalaryData, SALARY_ROLES, SALARY_LOCATIONS, salaryApiEnabled } from '@/lib/salary-api.mjs';
import { formatSalary } from '@/lib/format.mjs';
import { COUNTRIES } from '@/lib/niche.mjs';
import Icon from '@/components/Icon';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  if (SALARY_ROLES.includes(sp.role) && SALARY_LOCATIONS.includes(sp.location)) {
    return { title: `${sp.role} salary in ${sp.location}`, description: `How much does a ${sp.role} earn in ${sp.location}? Salary ranges from Glassdoor, Indeed and other sources.` };
  }
  return { title: 'SAP EWM & TM salaries', description: 'What SAP EWM and SAP TM consultants earn, by role and location.' };
}

const fmt = (n, cur) => formatSalary(n, null, cur);

export default async function Salaries({ searchParams }) {
  const sp = await searchParams;
  const role = SALARY_ROLES.includes(sp.role) ? sp.role : '';
  const location = SALARY_LOCATIONS.includes(sp.location) ? sp.location : '';
  let data = null;
  let error = null;
  if (role && location) {
    try { data = await getSalaryData(await getDb(), role, location); } catch (err) { error = err.message; }
  }
  const results = data?.results ?? [];
  const cur = results[0]?.currency;
  const medians = results.map((r) => r.median).filter(Boolean).sort((a, b) => a - b);
  const median = medians.length ? medians[Math.floor(medians.length / 2)] : null;
  const lo = Math.min(...results.map((r) => r.min || r.median).filter(Boolean));
  const hi = Math.max(...results.map((r) => r.max || r.median).filter(Boolean));
  const country = COUNTRIES.find((c) => location.endsWith(c.name) || location === c.name);
  const module = /TM/.test(role) ? 'tm' : 'ewm';

  const mine = Math.round(Number(String(sp.mine || '').replace(/[^\d.]/g, ''))) || null;
  const span = Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? hi - lo : null;
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  return (
    <div className="pb-10">
      <section className="bg-brand-50">
        <div className="container-x max-w-5xl py-8">
          <p className="eyebrow">Salary insights</p>
          <h1 className="mt-1 font-display text-[26px] font-bold leading-tight sm:text-[34px]">{role && location ? `${role} salary in ${location}` : 'What do SAP EWM & TM consultants earn?'}</h1>
          <p className="mt-1 text-muted">Annual salary estimates combined from public salary sources (Glassdoor, Indeed, Payscale and others).</p>
          <form className="mt-5 grid gap-2 rounded-xl bg-white p-3 shadow-raised sm:grid-cols-[1.3fr_1fr_auto]">
            <label className="flex h-12 items-center gap-2 rounded-lg bg-brand-50 px-3">
              <Icon name="briefcase" className="h-5 w-5 shrink-0 text-[#747686]" />
              <select name="role" defaultValue={role} required className="w-full bg-transparent text-[15px] outline-none" aria-label="Role">
                <option value="">Choose a role</option>{SALARY_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex h-12 items-center gap-2 rounded-lg bg-brand-50 px-3">
              <Icon name="pin" className="h-5 w-5 shrink-0 text-[#747686]" />
              <select name="location" defaultValue={location} required className="w-full bg-transparent text-[15px] outline-none" aria-label="Location">
                <option value="">Choose a location</option>{SALARY_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <button className="btn-primary h-12 !px-6">Show salary</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SALARY_ROLES.slice(0, 6).map((r) => (
              <Link key={r} href={`/salaries?${new URLSearchParams({ role: r, location: location || 'India' })}`} className={`rounded-md px-2.5 py-1 text-xs font-medium ${r === role ? 'bg-brand-500 text-white' : 'bg-white/70 text-brand-600 hover:bg-white'}`}>{r}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-x max-w-5xl">
        {error && <p className="alert-error mt-6">{error}</p>}

        {data && (results.length ? (
          <>
            <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="card p-6">
                <p className="eyebrow">Typical annual pay</p>
                <p className="mt-1 font-display text-[40px] font-bold leading-none text-positive">{median ? fmt(median, cur) : `${fmt(lo, cur)} – ${fmt(hi, cur)}`}</p>
                {median && span && <p className="mt-2 text-sm text-muted">Range {fmt(lo, cur)} – {fmt(hi, cur)}</p>}
                {span && (
                  <div className="mt-6">
                    <div className="relative h-3 rounded-full bg-gradient-to-r from-brand-100 via-brand-500 to-brand-700">
                      {median && <span className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full bg-accent-500 ring-2 ring-white" style={{ left: `${pos(median)}%` }} title="Median" />}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted"><span>{fmt(lo, cur)}</span>{median && <span className="font-semibold text-accent-600">Median</span>}<span>{fmt(hi, cur)}</span></div>
                  </div>
                )}
                <p className="mt-5 text-xs text-muted">Combines {results.length} source{results.length > 1 ? 's' : ''}; actual offers vary with experience, S/4HANA exposure and company. Updated {new Date(data.fetched_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={country ? `/sap-${module}-jobs/${country.slug}` : `/sap-${module}-jobs`} className="btn-primary">See {module.toUpperCase()} jobs{country ? ` in ${country.name}` : ''}</Link>
                </div>
              </div>
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold">By source</h2>
                <ul className="mt-3 divide-y divide-canvas-100 text-sm">
                  {results.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span>{r.link ? <a href={r.link} target="_blank" rel="noopener nofollow" className="font-medium text-brand-500">{r.source}</a> : r.source}{r.count ? <span className="text-muted"> · {r.count} salaries</span> : null}</span>
                      <span className="text-right"><b>{r.median ? fmt(r.median, r.currency) : '—'}</b>{r.min && r.max ? <span className="block text-xs text-muted">{fmt(r.min, r.currency)} – {fmt(r.max, r.currency)}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {span && (
              <section className="card mt-4 grid gap-6 p-6 md:grid-cols-2">
                <form action="/salaries">
                  <input type="hidden" name="role" value={role} />
                  <input type="hidden" name="location" value={location} />
                  <h2 className="font-display text-lg font-semibold">Where do you stand?</h2>
                  <p className="mt-1 text-sm text-muted">Enter your current annual salary in {cur} to compare it with this range. It is not saved.</p>
                  <div className="mt-4 flex gap-2">
                    <input name="mine" inputMode="numeric" defaultValue={mine || ''} placeholder={`e.g. ${Math.round(median || lo)}`} className="input" aria-label={`Your annual salary in ${cur}`} />
                    <button className="btn-primary shrink-0">Compare</button>
                  </div>
                </form>
                <div className="flex flex-col justify-center rounded-xl bg-brand-50 p-5">
                  {mine ? (() => {
                    const p = pos(mine);
                    const diff = median ? Math.round(((mine - median) / median) * 100) : null;
                    return (
                      <>
                        <p className="text-sm text-muted">Your salary {fmt(mine, cur)} is</p>
                        <p className={`font-display text-2xl font-bold ${diff !== null && diff < 0 ? 'text-accent-600' : 'text-positive'}`}>
                          {diff === null ? `at ${Math.round(p)}% of the range` : diff === 0 ? 'right at the median' : `${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} the median`}
                        </p>
                        <div className="relative mt-4 h-2 rounded-full bg-canvas-200"><span className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-brand-500 shadow" style={{ left: `${p}%` }} /></div>
                        {diff !== null && diff < -10 && <p className="mt-4 text-sm"><Link href={`/jobs?sort=salary&module=${module.toUpperCase()}${country ? `&country=${country.code}` : ''}`} className="font-semibold text-brand-500">Browse better-paid roles →</Link></p>}
                      </>
                    );
                  })() : <p className="text-sm text-muted">Your position in the range will show here.</p>}
                </div>
              </section>
            )}
          </>
        ) : <p className="card mt-6 p-6 text-sm text-muted">No salary data published for {role} in {location} yet. Try the nearest bigger location or a broader role.</p>)}

        {!role && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-semibold">Popular comparisons</h2>
            {!salaryApiEnabled() && <p className="mb-3 text-sm text-muted">Salary data is being connected.</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[['SAP EWM Consultant', 'Bengaluru, India'], ['SAP EWM Consultant', 'Germany'], ['SAP TM Consultant', 'Pune, India'], ['SAP TM Consultant', 'United States'], ['SAP EWM Architect', 'Netherlands'], ['Senior SAP EWM Consultant', 'United Kingdom']].map(([r, l]) => (
                <Link key={r + l} href={`/salaries?role=${encodeURIComponent(r)}&location=${encodeURIComponent(l)}`} className="group flex items-center gap-3 rounded-xl bg-white p-4 shadow-card transition hover:shadow-raised">
                  <span className="rounded-lg bg-mint p-2 text-positive"><Icon name="money" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold group-hover:text-brand-500">{r}</span><span className="text-sm text-muted">{l}</span></span>
                  <Icon name="chevronRight" className="h-4 w-4 text-muted" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
