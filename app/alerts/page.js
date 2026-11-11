import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { createAlert, deleteAlert } from '@/app/actions';
import Flash from '@/components/Flash';
import { formatSalary } from '@/lib/format.mjs';
import { MARKET } from '@/lib/market.mjs';

export const metadata = { title: 'Job alerts' };

export default async function AlertsPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/alerts', 'candidate');
  const alerts = await (await getDb()).all('SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
  const limitReached = user.plan !== 'premium' && alerts.length >= 1;

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-4xl">Job alerts</h1>
      <p className="mt-1 text-ink/60">We email you once a day when new jobs match your alert.</p>

      <form action={createAlert} className="card mt-8 space-y-4 p-6">
        <Flash error={sp.error} ok={sp.created && 'Alert created.'} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1"><label className="label" htmlFor="query">Job title or keyword</label><input id="query" name="query" defaultValue={sp.query} className="input" placeholder="e.g. Head of Product" /></div>
          <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" defaultValue={sp.location} className="input" placeholder="Any" /></div>
          <div><label className="label" htmlFor="min_salary">Min. salary (₹ per year)</label><input id="min_salary" name="min_salary" inputMode="numeric" className="input" placeholder="e.g. 2500000" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remote" className="h-4 w-4 accent-brand-700" /> Remote only</label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn-primary" disabled={limitReached}>Create alert</button>
          {limitReached && <span className="text-sm text-ink/60">Free accounts get 1 alert. <Link href="/pricing" className="font-semibold text-accent-600">Upgrade for unlimited →</Link></span>}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="card flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold">{a.query || 'Any role'}{a.location && ` in ${a.location}`}</p>
              <p className="text-sm text-ink/60">
                {[a.min_salary && formatSalary(a.min_salary, null, MARKET.currency), a.remote && 'Remote only', 'Daily email'].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/jobs?${new URLSearchParams({ q: a.query, location: a.location, ...(a.min_salary && { minSalary: a.min_salary }), ...(a.remote && { remote: '1' }) })}`} className="text-sm font-semibold text-brand-700">View jobs</Link>
              <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button className="text-sm text-ink/50 hover:text-accent-600">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
