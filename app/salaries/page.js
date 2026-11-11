import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { salaryStats } from '@/lib/salaries.mjs';
import { formatSalary } from '@/lib/format.mjs';
import { MARKET } from '@/lib/market.mjs';

export const metadata = { title: 'Salary insights', description: `Salary ranges for senior roles across ${MARKET.country}, from live job listings.` };
export const dynamic = 'force-dynamic';

const POPULAR = ['Product Manager', 'Engineering Manager', 'Director', 'Head of Sales', 'Finance Controller', 'Data Scientist', 'CFO', 'VP'];
const inr = (n) => formatSalary(n, null, MARKET.currency);

export default async function Salaries({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim().slice(0, 80);
  const location = (sp.location || '').trim().slice(0, 60);
  const db = await getDb();
  const stats = q ? await salaryStats(db, { q, location }) : null;
  const popular = q ? [] : await Promise.all(POPULAR.map(async (p) => ({ p, s: await salaryStats(db, { q: p }) })));
  const max = stats?.enough ? Math.max(stats.p75, ...stats.bySeniority.map((r) => r.p50)) : 1;

  return (
    <div className="container-x max-w-5xl py-8">
      <p className="eyebrow">Know your worth</p>
      <h1 className="page-title mt-1">Salary insights</h1>
      <p className="mt-1 text-ink/60">Annual salary ranges from live SAP EWM/TM listings that show a salary.</p>
      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_auto]">
        <input name="q" defaultValue={q} required className="input" placeholder="Job title, e.g. Product Manager" aria-label="Job title" />
        <select name="location" defaultValue={location} className="input" aria-label="City"><option value="">All locations</option>{MARKET.cities.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn-primary">Show salaries</button>
      </form>

      {stats && (stats.enough ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="card p-6">
            <p className="text-sm text-ink/60">{q}{location ? ` in ${location}` : ''} · based on {stats.n} listings</p>
            <p className="mt-2 text-4xl font-semibold">{inr(stats.p50)}</p>
            <p className="text-sm text-ink/60">median annual CTC</p>
            <div className="mt-6">
              <div className="relative h-3 rounded-full bg-canvas-100">
                <div className="absolute inset-y-0 rounded-full bg-brand-500" style={{ left: `${(stats.p25 / max) * 100}%`, width: `${Math.max(2, ((stats.p75 - stats.p25) / max) * 100)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink/60"><span>25th percentile: <b className="text-ink">{inr(stats.p25)}</b></span><span>75th percentile: <b className="text-ink">{inr(stats.p75)}</b></span></div>
            </div>
            <Link href={`/jobs?q=${encodeURIComponent(q)}${location ? `&location=${encodeURIComponent(location)}` : ''}&sort=salary`} className="btn-ghost mt-6">See these jobs →</Link>
          </div>
          {stats.bySeniority.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title">By seniority (median)</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {stats.bySeniority.map((r) => (
                  <li key={r.seniority}>
                    <div className="flex justify-between"><span>{r.seniority} <span className="text-ink/45">({r.n})</span></span><b>{inr(r.p50)}</b></div>
                    <div className="mt-1 h-2 rounded-full bg-canvas-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.p50 / max) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <p className="card mt-6 p-6 text-sm text-ink/60">Not enough salaried listings for “{q}”{location ? ` in ${location}` : ''} yet ({stats.n} found). Try a broader title or all of {MARKET.country}.</p>
      ))}

      {!q && (
        <section className="mt-8">
          <h2 className="section-title mb-3">Popular roles</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map(({ p, s }) => (
              <Link key={p} href={`/salaries?q=${encodeURIComponent(p)}`} className="card card-hover p-4">
                <p className="text-sm font-semibold">{p}</p>
                <p className="mt-1 text-lg font-semibold text-brand-600">{s.enough ? inr(s.p50) : '—'}</p>
                <p className="text-xs text-ink/50">{s.enough ? `median · ${s.n} listings` : 'not enough data yet'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
