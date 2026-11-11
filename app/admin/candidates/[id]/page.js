import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { addCandidateNote, setCandidateTags, submitCandidate } from '@/app/admin/actions';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function AdminCandidate({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const db = await getDb();
  const c = await db.get("SELECT * FROM users WHERE id = $1 AND role = 'candidate'", [n]);
  if (!c) notFound();
  const [notes, subs, reqs, apps] = await Promise.all([
    db.all('SELECT n.body, n.created_at, a.name AS author FROM candidate_notes n LEFT JOIN users a ON a.id = n.author_id WHERE n.candidate_id = $1 ORDER BY n.created_at DESC', [n]),
    db.all(`SELECT s.status, s.created_at, r.title, cl.name AS client, cl.id AS client_id FROM submissions s
            JOIN requirements r ON r.id = s.requirement_id JOIN clients cl ON cl.id = r.client_id WHERE s.candidate_id = $1 ORDER BY s.created_at DESC`, [n]),
    db.all(`SELECT r.id, r.title, cl.name AS client FROM requirements r JOIN clients cl ON cl.id = r.client_id WHERE r.status = 'open' ORDER BY r.created_at DESC`),
    db.all('SELECT j.id, j.title, j.company, a.created_at FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 20', [n]),
  ]);
  const cv = c.cv_parsed || {};
  const row = (k, v) => v ? <div><dt className="text-xs text-ink/50">{k}</dt><dd className="font-medium">{v}</dd></div> : null;

  return (
    <div>
      <Link href="/admin/candidates" className="text-sm text-ink/60 hover:text-brand-600">← Candidates</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{c.name}</h1>
          <p className="text-ink/65">{c.headline || cv.headline || ''}</p>
          <p className="mt-1 text-sm"><a href={`mailto:${c.email}`} className="text-brand-600">{c.email}</a>{c.phone && <> · <a href={`tel:${c.phone}`} className="text-brand-600">{c.phone}</a></>}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/cv/${c.id}`} className="btn-primary">Download CV</a>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Flash error={sp.error} ok={sp.submitted && 'Candidate submitted to the requirement.'} />
        {c.consent_at
          ? <p className="text-sm text-positive">✓ Sharing consent given {new Date(c.consent_at).toLocaleString('en-GB')}</p>
          : <p className="alert-error">No sharing consent. Do not share this profile with clients.</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title">Profile</h2>
            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
              {row('SAP modules', c.sap_modules)}{row('S/4HANA', c.s4hana ? 'Yes' : null)}{row('Implementations', c.implementations)}
              {row('Experience', (c.years_experience ?? cv.years_experience) && `${c.years_experience ?? cv.years_experience} years`)}{row('Location', c.location)}{row('Notice period', c.notice_period)}
              {row('Current salary', c.current_salary)}{row('Expected', c.expected_salary)}
              {row('Open to', [c.open_relocation && 'Relocation', c.open_remote && 'Remote', c.open_contract && 'Contract'].filter(Boolean).join(', '))}
            </dl>
            {cv.summary && <p className="mt-4 text-sm text-ink/75">{cv.summary}</p>}
            {(cv.experience || []).length > 0 && (
              <ol className="mt-4 space-y-2 border-l-2 border-brand-100 pl-4 text-sm">
                {cv.experience.map((e, i) => <li key={i}><b>{e.title}</b> · {e.company} <span className="text-ink/50">{e.start} – {e.end}</span><br /><span className="text-ink/65">{e.highlight}</span></li>)}
              </ol>
            )}
            {c.skills && <p className="mt-4 text-sm text-ink/65"><b>Skills:</b> {c.skills}</p>}
          </section>
          <section className="card p-5">
            <h2 className="section-title">Private notes</h2>
            <form action={addCandidateNote} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="candidateId" value={c.id} />
              <textarea name="body" rows={2} required className="input flex-1" placeholder="e.g. Strong in RF & wave mgmt; prefers Pune; available from March" />
              <button className="btn-primary self-start">Add note</button>
            </form>
            <ul className="mt-4 space-y-3 text-sm">
              {notes.map((x, i) => <li key={i} className="rounded-lg bg-canvas-50 p-3"><p className="whitespace-pre-line">{x.body}</p><p className="mt-1 text-xs text-ink/45">{x.author || 'Admin'} · {timeAgo(x.created_at)}</p></li>)}
              {notes.length === 0 && <li className="text-ink/50">No notes yet.</li>}
            </ul>
          </section>
          {apps.length > 0 && (
            <section className="card p-5">
              <h2 className="section-title">Applied to</h2>
              <ul className="mt-2 space-y-1 text-sm">{apps.map((a) => <li key={a.id}><Link href={`/jobs/${a.id}`} className="text-brand-600">{a.title}</Link> · {a.company} <span className="text-ink/45">{timeAgo(a.created_at)}</span></li>)}</ul>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <form action={setCandidateTags} className="card space-y-2 p-5">
            <input type="hidden" name="candidateId" value={c.id} />
            <h2 className="section-title">Tags</h2>
            <input name="tags" defaultValue={c.admin_tags || ''} className="input" placeholder="shared with Client X, top EWM" />
            <button className="btn-ghost w-full">Save tags</button>
          </form>
          <form action={submitCandidate} className="card space-y-2 p-5">
            <input type="hidden" name="candidateId" value={c.id} />
            <h2 className="section-title">Submit to a client</h2>
            {reqs.length ? (
              <>
                <select name="requirementId" className="input" aria-label="Requirement">{reqs.map((r) => <option key={r.id} value={r.id}>{r.client}: {r.title}</option>)}</select>
                <button className="btn-primary w-full" disabled={!c.consent_at}>Submit candidate</button>
              </>
            ) : <p className="text-sm text-ink/55">No open requirements. <Link href="/admin/clients" className="text-brand-600">Add a client</Link>.</p>}
            {subs.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-canvas-100 pt-3 text-sm">
                {subs.map((s, i) => <li key={i}><Link href={`/admin/clients/${s.client_id}`} className="text-brand-600">{s.client}</Link>: {s.title} <span className="chip ml-1">{s.status}</span></li>)}
              </ul>
            )}
          </form>
        </aside>
      </div>
    </div>
  );
}
