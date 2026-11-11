import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { getSalaryData, SALARY_ROLES, SALARY_LOCATIONS, salaryApiEnabled } from '@/lib/salary-api.mjs';
import { formatSalary } from '@/lib/format.mjs';
import { COUNTRIES } from '@/lib/niche.mjs';

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

  return (
    <div className="container-x max-w-5xl py-8">
      <h1 className="page-title">{role && location ? `${role} salary in ${location}` : 'SAP EWM & TM salaries'}</h1>
      <p className="mt-1 text-ink/60">Annual salary estimates from public salary sources (Glassdoor, Indeed, Payscale and others).</p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr_auto]">
        <select name="role" defaultValue={role} required className="input" aria-label="Role">
          <option value="">Choose a role</option>{SALARY_ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select name="location" defaultValue={location} required className="input" aria-label="Location">
          <option value="">Choose a location</option>{SALARY_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button className="btn-primary">Show salary</button>
      </form>

      {error && <p className="alert-error mt-6">{error}</p>}

      {data && (results.length ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="card p-6">
            <p className="text-sm text-ink/60">Typical annual pay</p>
            <p className="mt-1 font-display text-4xl font-semibold">{median ? fmt(median, cur) : `${fmt(lo, cur)} – ${fmt(hi, cur)}`}</p>
            {median && Number.isFinite(lo) && Number.isFinite(hi) && <p className="mt-1 text-ink/65">Range {fmt(lo, cur)} – {fmt(hi, cur)}</p>}
            <p className="mt-4 text-xs text-ink/50">Estimates combine {results.length} source{results.length > 1 ? 's' : ''}; actual offers vary with experience, S/4HANA exposure and company. Updated {new Date(data.fetched_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={country ? `/sap-${module}-jobs/${country.slug}` : `/sap-${module}-jobs`} className="btn-primary">See {module.toUpperCase()} jobs{country ? ` in ${country.name}` : ''}</Link>
              <Link href="/signup" className="btn-ghost">Get matched to roles</Link>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="section-title">By source</h2>
            <ul className="mt-3 divide-y divide-canvas-100 text-sm">
              {results.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{r.link ? <a href={r.link} target="_blank" rel="noopener nofollow" className="text-brand-600">{r.source}</a> : r.source}{r.count ? <span className="text-ink/45"> · {r.count} salaries</span> : null}</span>
                  <span className="text-right"><b>{r.median ? fmt(r.median, r.currency) : '—'}</b>{r.min && r.max ? <span className="block text-xs text-ink/50">{fmt(r.min, r.currency)} – {fmt(r.max, r.currency)}</span> : null}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : <p className="card mt-6 p-6 text-sm text-ink/60">No salary data published for {role} in {location} yet. Try the nearest bigger location or a broader role.</p>)}

      {!role && (
        <section className="mt-8">
          <h2 className="section-title mb-3">Popular comparisons</h2>
          {!salaryApiEnabled() && <p className="mb-3 text-sm text-ink/55">Salary data is being connected.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[['SAP EWM Consultant', 'Bengaluru, India'], ['SAP EWM Consultant', 'Germany'], ['SAP TM Consultant', 'Pune, India'], ['SAP TM Consultant', 'United States'], ['SAP EWM Architect', 'Netherlands'], ['Senior SAP EWM Consultant', 'United Kingdom']].map(([r, l]) => (
              <Link key={r + l} href={`/salaries?role=${encodeURIComponent(r)}&location=${encodeURIComponent(l)}`} className="card card-hover p-4">
                <p className="font-semibold">{r}</p><p className="text-sm text-ink/55">{l}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
