import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { runImportNow } from '@/app/admin/actions';
import SubmitButton from '@/components/SubmitButton';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export default async function AdminHome({ searchParams }) {
  const sp = await searchParams;
  const db = await getDb();
  const [k, recent, enquiries, runs, bySource] = await Promise.all([
    db.get(`SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'candidate' AND consent_at IS NOT NULL) AS candidates,
      (SELECT COUNT(*)::int FROM users WHERE role = 'candidate' AND created_at > now() - interval '7 days') AS new_week,
      (SELECT COUNT(*)::int FROM jobs WHERE status = 'active') AS jobs,
      (SELECT COUNT(*)::int FROM requirements WHERE status = 'open') AS open_reqs,
      (SELECT COUNT(*)::int FROM submissions WHERE status IN ('submitted', 'interview', 'offer')) AS pipeline,
      (SELECT COUNT(*)::int FROM submissions WHERE status = 'joined') AS placements`),
    db.all(`SELECT id, name, headline, sap_modules, location, created_at FROM users WHERE role = 'candidate' ORDER BY created_at DESC LIMIT 8`),
    db.all(`SELECT c.id, c.name, r.title, c.created_at FROM clients c JOIN requirements r ON r.client_id = c.id WHERE c.source = 'enquiry' ORDER BY c.created_at DESC LIMIT 6`),
    db.all('SELECT trigger, totals, report, created_at FROM import_runs ORDER BY created_at DESC LIMIT 8'),
    db.all("SELECT source, COUNT(*)::int AS n FROM jobs WHERE status = 'active' GROUP BY source ORDER BY n DESC"),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="page-title">Overview</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[['Consenting candidates', k.candidates], ['New this week', k.new_week], ['Active jobs', k.jobs], ['Open requirements', k.open_reqs], ['In pipeline', k.pipeline], ['Placements', k.placements]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-sm text-ink/60">{l}</p><p className="mt-1 font-display text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      <section id="imports" className="card scroll-mt-20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Job imports</h2>
            <p className="text-sm text-ink/55">Runs daily at 05:17 UTC. Active jobs by source: {bySource.map((r) => `${r.source} ${r.n}`).join(' · ') || 'none'}</p>
          </div>
          <form action={runImportNow}><SubmitButton pendingText="Importing… (up to 2 minutes)">Run import now</SubmitButton></form>
        </div>
        <div className="mt-3"><Flash ok={sp.imported && 'Import finished. See the latest run below.'} /></div>
        <ul className="mt-3 space-y-3 text-sm">
          {runs.map((r, i) => (
            <li key={i} className="rounded-lg border border-canvas-200 p-3">
              <p className="font-medium">{new Date(r.created_at).toLocaleString('en-GB')} · {r.trigger} · +{r.totals.inserted} new, {r.totals.updated} updated, {r.totals.failed} failed{r.totals.telegram ? `, ${r.totals.telegram} posted to Telegram` : ''}</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                {r.report.map((line, j) => <li key={j} className={line.startsWith('✗') ? 'text-negative' : 'text-ink/70'}>{line}</li>)}
              </ul>
            </li>
          ))}
          {runs.length === 0 && <li className="text-ink/55">No imports recorded yet. Press “Run import now”.</li>}
        </ul>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="section-title">Newest candidates</h2><Link href="/admin/candidates" className="text-sm text-brand-600">All →</Link></div>
          <ul className="mt-3 divide-y divide-canvas-100 text-sm">
            {recent.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 py-2.5">
                <Link href={`/admin/candidates/${c.id}`} className="min-w-0"><span className="font-medium text-brand-600">{c.name}</span> <span className="text-ink/55">· {c.sap_modules || c.headline || '—'}</span></Link>
                <span className="shrink-0 text-xs text-ink/45">{timeAgo(c.created_at)}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-3 text-ink/55">No candidates yet.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="section-title">Hiring enquiries</h2><Link href="/admin/clients" className="text-sm text-brand-600">All clients →</Link></div>
          <ul className="mt-3 divide-y divide-canvas-100 text-sm">
            {enquiries.map((e) => (
              <li key={`${e.id}-${e.title}`} className="flex justify-between gap-3 py-2.5">
                <Link href={`/admin/clients/${e.id}`} className="min-w-0"><span className="font-medium text-brand-600">{e.name}</span> <span className="text-ink/55">· {e.title}</span></Link>
                <span className="shrink-0 text-xs text-ink/45">{timeAgo(e.created_at)}</span>
              </li>
            ))}
            {enquiries.length === 0 && <li className="py-3 text-ink/55">No enquiries yet. Companies can send one from the “Hire consultants” page.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
