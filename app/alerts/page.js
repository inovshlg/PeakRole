import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { createAlert, deleteAlert, setAlertFrequency } from '@/app/actions';
import Flash from '@/components/Flash';
import Icon from '@/components/Icon';
import { COUNTRIES, countryByCode } from '@/lib/niche.mjs';

export const metadata = { title: 'Job alerts' };

const FREE_LIMIT = 3;

export default async function AlertsPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/alerts', 'candidate');
  const alerts = await (await getDb()).all('SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
  const limitReached = user.plan !== 'premium' && alerts.length >= FREE_LIMIT;

  return (
    <div className="container-x max-w-3xl py-8">
      <p className="eyebrow">Job alerts</p>
      <h1 className="font-display text-[26px] font-bold sm:text-[30px]">Get new SAP jobs by email</h1>
      <p className="mt-1 text-muted">We email you when new jobs match, daily or weekly. {user.plan !== 'premium' && `Free accounts can keep ${FREE_LIMIT} alerts.`}</p>

      <form action={createAlert} className="card mt-6 space-y-4 p-5 sm:p-6">
        <Flash error={sp.error} ok={sp.created && 'Alert created.'} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="module">Module</label>
            <select id="module" name="module" defaultValue={sp.module || ''} className="input">
              <option value="">SAP EWM & TM</option><option value="EWM">SAP EWM</option><option value="TM">SAP TM</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <select id="country" name="country" defaultValue={sp.country || ''} className="input">
              <option value="">Any country</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="query">Keyword (optional)</label><input id="query" name="query" defaultValue={sp.query} className="input" placeholder="e.g. Embedded EWM, architect" /></div>
          <div><label className="label" htmlFor="location">City (optional)</label><input id="location" name="location" defaultValue={sp.location} className="input" placeholder="e.g. Pune" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="remote" className="h-4 w-4 accent-brand-500" /> Remote only</label>
          <div className="flex rounded-lg bg-canvas-100 p-0.5 font-medium" role="radiogroup" aria-label="How often">
            {[['daily', 'Daily'], ['weekly', 'Weekly']].map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="frequency" value={v} defaultChecked={v === 'daily'} className="peer sr-only" />
                <span className="block rounded-md px-3 py-1 text-muted peer-checked:bg-white peer-checked:text-brand-500 peer-checked:shadow-card">{l}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn-primary" disabled={limitReached}>Create alert</button>
          {limitReached && <span className="text-sm text-muted">You’ve reached {FREE_LIMIT} alerts. Delete one or <Link href="/pricing" className="font-semibold text-accent-600">upgrade for unlimited →</Link></span>}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {alerts.map((a) => {
          const where = a.location || countryByCode(a.country)?.name;
          const p = new URLSearchParams({ ...(a.query && { q: a.query }), ...(a.location && { location: a.location }), ...(a.module && { module: a.module }), ...(a.country && { country: a.country }), ...(a.remote && { remote: '1' }) });
          return (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-full bg-accent-50 p-2 text-accent-600"><Icon name="bell" className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-semibold">{[a.module ? `SAP ${a.module}` : 'SAP EWM & TM', a.query && `“${a.query}”`].filter(Boolean).join(' ')}{where && ` in ${where}`}</p>
                  <p className="text-sm text-muted">{[a.remote && 'Remote only', `${a.frequency === 'weekly' ? 'Weekly' : 'Daily'} email`].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <form action={setAlertFrequency} className="flex gap-1 text-xs font-medium">
                  <input type="hidden" name="id" value={a.id} />
                  {['daily', 'weekly'].map((fq) => (
                    <button key={fq} name="frequency" value={fq} aria-pressed={a.frequency === fq} className={`rounded-md px-2.5 py-1 capitalize ${a.frequency === fq ? 'bg-brand-500 text-white' : 'bg-canvas-100 text-muted hover:text-ink'}`}>{fq}</button>
                  ))}
                </form>
                <Link href={`/jobs?${p}`} className="text-sm font-semibold text-brand-500">View jobs</Link>
                <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button className="text-sm text-muted hover:text-negative">Delete</button></form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
