import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { createRequirement, setRequirementStatus, updateSubmission } from '@/app/admin/actions';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';
const STATUSES = ['submitted', 'interview', 'offer', 'joined', 'rejected', 'withdrawn'];

export default async function AdminClient({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const db = await getDb();
  const client = await db.get('SELECT * FROM clients WHERE id = $1', [n]);
  if (!client) notFound();
  const [reqs, subs] = await Promise.all([
    db.all('SELECT * FROM requirements WHERE client_id = $1 ORDER BY created_at DESC', [n]),
    db.all(`SELECT s.*, u.name, u.sap_modules, u.notice_period FROM submissions s JOIN users u ON u.id = s.candidate_id
            JOIN requirements r ON r.id = s.requirement_id WHERE r.client_id = $1 ORDER BY s.created_at DESC`, [n]),
  ]);
  const earned = subs.filter((s) => s.status === 'joined' && s.fee_amount).reduce((m, s) => ({ ...m, [s.fee_currency || '']: (m[s.fee_currency || ''] || 0) + s.fee_amount }), {});

  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-ink/60 hover:text-brand-600">← Clients</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="text-sm text-ink/60">{[client.contact_name, client.contact_email, client.contact_phone].filter(Boolean).join(' · ')}</p>
          {client.notes && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-ink/70">{client.notes}</p>}
        </div>
        {Object.keys(earned).length > 0 && <div className="card p-4 text-sm">Fees from placements: <b>{Object.entries(earned).map(([c, v]) => `${c} ${v.toLocaleString('en-IN')}`).join(' + ')}</b></div>}
      </div>
      <div className="mt-3"><Flash error={sp.error} /></div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {reqs.map((r) => (
            <section key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{r.title}</h2>
                  <p className="text-sm text-ink/55">{[r.module, r.location, r.fee && `Fee: ${r.fee}`].filter(Boolean).join(' · ')} · {timeAgo(r.created_at)}</p>
                  {r.details && <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{r.details}</p>}
                </div>
                <form action={setRequirementStatus} className="flex items-center gap-2">
                  <input type="hidden" name="requirementId" value={r.id} /><input type="hidden" name="clientId" value={client.id} />
                  <select name="status" defaultValue={r.status} className="input !w-auto !py-1.5" aria-label="Requirement status">{['open', 'on hold', 'filled', 'closed'].map((s) => <option key={s}>{s}</option>)}</select>
                  <button className="btn-ghost !py-1.5">Save</button>
                </form>
              </div>
              <div className="mt-4 space-y-3">
                {subs.filter((s) => s.requirement_id === r.id).map((s) => (
                  <form key={s.id} action={updateSubmission} className="grid gap-2 rounded-lg border border-canvas-200 p-3 text-sm sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] sm:items-center">
                    <input type="hidden" name="submissionId" value={s.id} />
                    <div className="min-w-0"><Link href={`/admin/candidates/${s.candidate_id}`} className="font-semibold text-brand-600">{s.name}</Link><p className="truncate text-xs text-ink/50">{s.sap_modules} · {s.notice_period || 'notice ?'} · submitted {timeAgo(s.created_at).toLowerCase()}</p></div>
                    <select name="status" defaultValue={s.status} className="input !py-1.5" aria-label="Submission status">{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                    <div className="flex gap-1"><input name="fee_currency" defaultValue={s.fee_currency || ''} placeholder="INR" className="input !w-16 !py-1.5" aria-label="Fee currency" /><input name="fee_amount" defaultValue={s.fee_amount || ''} placeholder="Fee" inputMode="numeric" className="input !py-1.5" aria-label="Fee amount" /></div>
                    <button className="btn-ghost !py-1.5">Update</button>
                    <input name="notes" defaultValue={s.notes || ''} placeholder="Notes (interview dates, feedback…)" className="input !py-1.5 sm:col-span-4" aria-label="Notes" />
                  </form>
                ))}
                {!subs.some((s) => s.requirement_id === r.id) && <p className="text-sm text-ink/50">No candidates submitted yet. Submit from a candidate’s page.</p>}
              </div>
            </section>
          ))}
          {reqs.length === 0 && <p className="card p-6 text-sm text-ink/55">No requirements yet.</p>}
        </div>
        <form action={createRequirement} className="card h-fit space-y-3 p-5">
          <input type="hidden" name="clientId" value={client.id} />
          <h2 className="section-title">Add a requirement</h2>
          <input name="title" required className="input" placeholder="e.g. Senior SAP EWM Consultant" aria-label="Title" />
          <select name="module" className="input" aria-label="Module"><option value="">Module</option>{['SAP EWM', 'SAP TM', 'SAP EWM & TM'].map((m) => <option key={m}>{m}</option>)}</select>
          <input name="location" className="input" placeholder="Location / remote" aria-label="Location" />
          <input name="fee" className="input" placeholder="Agreed fee, e.g. 8.33% of CTC" aria-label="Fee" />
          <textarea name="details" rows={4} className="input" placeholder="Must-haves, budget, timeline" aria-label="Details" />
          <button className="btn-primary w-full">Add requirement</button>
        </form>
      </div>
    </div>
  );
}
