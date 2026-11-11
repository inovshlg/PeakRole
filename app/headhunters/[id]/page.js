import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';
import { CARD_COLS } from '@/lib/jobs.mjs';
import { initials } from '@/lib/format.mjs';
import { contactRecruiter } from '@/app/network/actions';
import { CANDIDATE_CONTACT_LIMIT } from '@/lib/messaging.mjs';
import JobCard from '@/components/JobCard';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export default async function HeadhunterProfile({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const db = await getDb();
  const p = await db.get("SELECT * FROM users WHERE id = $1 AND role = 'employer' AND recruiter_type = 'headhunter'", [n]);
  if (!p) notFound();
  const [user, jobs] = await Promise.all([
    getCurrentUser(),
    db.all(`SELECT ${CARD_COLS} FROM jobs j WHERE posted_by_user_id = $1 AND status = 'active' ORDER BY posted_at DESC LIMIT 6`, [n]),
  ]);
  const existing = user?.role === 'candidate' && await db.get('SELECT id FROM conversations WHERE candidate_id = $1 AND recruiter_id = $2', [user.id, n]);
  const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="container-x py-8">
      <Link href="/headhunters" className="text-sm text-ink/60 hover:text-brand-600">← All headhunters</Link>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="card p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">{initials(p.name)}</span>
            <div>
              <h1 className="page-title">{p.name}</h1>
              <p className="text-ink/60">Headhunter · {p.company}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            {[['Specialisms', list(p.specialisms)], ['Regions', list(p.regions)], ['Levels', list(p.levels)]].map(([k, v]) => v.length > 0 && (
              <div key={k}><dt className="eyebrow">{k}</dt><dd className="mt-1.5 flex flex-wrap gap-1.5">{v.map((x) => <span key={x} className="chip-info">{x}</span>)}</dd></div>
            ))}
            {(p.years_recruiting || p.placements) && (
              <div><dt className="eyebrow">Track record</dt><dd className="mt-1.5">{[p.years_recruiting && `${p.years_recruiting} years recruiting`, p.placements && `${p.placements} placements`].filter(Boolean).join(' · ')}</dd></div>
            )}
          </dl>
          {p.bio && <div className="mt-6"><h2 className="section-title">About</h2><p className="mt-2 whitespace-pre-line text-ink/80">{p.bio}</p></div>}
          {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener nofollow" className="btn-quiet mt-4 !px-0">LinkedIn profile ↗</a>}
        </article>

        <aside className="card h-fit p-6 lg:sticky lg:top-20">
          <h2 className="section-title">Contact {p.name.split(' ')[0]}</h2>
          {existing ? (
            <Link href={`/messages/${existing.id}`} className="btn-primary mt-4 w-full">Open your conversation</Link>
          ) : user?.role === 'candidate' ? (
            <form action={contactRecruiter} className="mt-4 space-y-3">
              <Flash error={sp.error} />
              <input type="hidden" name="recruiterId" value={p.id} />
              <label className="label" htmlFor="body">Introduce yourself: your current role, what you’re looking for, and your expected CTC.</label>
              <textarea id="body" name="body" rows={6} required minLength={10} maxLength={4000} className="input" />
              <SubmitButton className="btn-primary w-full" pendingText="Sending…">Send message</SubmitButton>
              <p className="text-xs text-ink/55">Your profile and CV are shared with this headhunter. {user.plan === 'premium' ? '' : `Free accounts can contact ${CANDIDATE_CONTACT_LIMIT.free} headhunters a month.`}</p>
            </form>
          ) : user ? (
            <p className="mt-3 text-sm text-ink/60">Messaging headhunters is for job seekers.</p>
          ) : (
            <Link href={`/login?next=/headhunters/${p.id}`} className="btn-primary mt-4 w-full">Log in to contact</Link>
          )}
        </aside>
      </div>
      {jobs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl">Roles {p.name.split(' ')[0]} is recruiting for</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      )}
    </div>
  );
}
