import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { createClient } from '@/app/admin/actions';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function AdminClients({ searchParams }) {
  const sp = await searchParams;
  const clients = await (await getDb()).all(
    `SELECT c.*, (SELECT COUNT(*)::int FROM requirements r WHERE r.client_id = c.id AND r.status = 'open') AS open_reqs,
            (SELECT COUNT(*)::int FROM submissions s JOIN requirements r ON r.id = s.requirement_id WHERE r.client_id = c.id) AS subs,
            (SELECT COUNT(*)::int FROM submissions s JOIN requirements r ON r.id = s.requirement_id WHERE r.client_id = c.id AND s.status = 'joined') AS placed
     FROM clients c ORDER BY c.created_at DESC`
  );
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        <h1 className="page-title">Clients & placements</h1>
        <div className="mt-4 space-y-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`} className="card card-hover flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{c.name} {c.source === 'enquiry' && <span className="chip ml-1 bg-accent-500/15 text-accent-600">Website enquiry</span>}</p>
                <p className="text-sm text-ink/55">{[c.contact_name, c.contact_email].filter(Boolean).join(' · ') || 'No contact yet'} · added {timeAgo(c.created_at).toLowerCase()}</p>
              </div>
              <p className="text-sm text-ink/70">{c.open_reqs} open · {c.subs} submitted · <b>{c.placed} placed</b></p>
            </Link>
          ))}
          {clients.length === 0 && <p className="card p-6 text-sm text-ink/55">No clients yet. Add one, or share your “Hire consultants” page with companies.</p>}
        </div>
      </section>
      <form action={createClient} className="card h-fit space-y-3 p-5">
        <h2 className="section-title">Add a client</h2>
        <Flash error={sp.error} />
        <input name="name" required className="input" placeholder="Company name" aria-label="Company name" />
        <input name="contact_name" className="input" placeholder="Contact person" aria-label="Contact person" />
        <input name="contact_email" type="email" className="input" placeholder="Contact email" aria-label="Contact email" />
        <input name="contact_phone" className="input" placeholder="Phone" aria-label="Phone" />
        <textarea name="notes" rows={3} className="input" placeholder="Terms, fee agreement, notes" aria-label="Notes" />
        <button className="btn-primary w-full">Add client</button>
      </form>
    </div>
  );
}
