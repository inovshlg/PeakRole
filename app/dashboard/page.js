import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import { updateApplicationStatus, toggleSave } from '@/app/actions';
import JobCard from '@/components/JobCard';
import { CARD_COLS } from '@/lib/jobs.mjs';
import Flash from '@/components/Flash';

export const metadata = { title: 'Dashboard' };

const STATUSES = { applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', rejected: 'Not selected' };

export default async function Dashboard({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/dashboard', 'candidate');
  const db = await getDb();
  const [saved, apps, { n: alertCount }, topMatches] = await Promise.all([
    db.all(`SELECT ${CARD_COLS} FROM saved_jobs s JOIN jobs j ON j.id = s.job_id WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [user.id]),
    db.all(
      `SELECT a.status, a.created_at AS applied_at, j.id, j.title, j.company, j.location, j.salary_min, j.salary_max, j.currency
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [user.id]
    ),
    db.get('SELECT COUNT(*)::int AS n FROM alerts WHERE user_id = $1', [user.id]),
    db.all(
      `SELECT ${CARD_COLS}, m.score, m.ai FROM job_matches m JOIN jobs j ON j.id = m.job_id
       WHERE m.user_id = $1 AND j.status = 'active' AND j.id NOT IN (SELECT job_id FROM applications WHERE user_id = $1)
       ORDER BY m.score DESC LIMIT 4`,
      [user.id]
    ),
  ]);

  const checklist = [
    ['Add a headline', !!user.headline], ['Set your desired salary', !!user.desired_salary],
    ['Upload your CV', !!user.cv_name], ['Get AI job matches', !!user.matches_refreshed_at], ['Create a job alert', alertCount > 0], ['Become visible to recruiters', !!user.visible_to_recruiters],
  ];
  const done = checklist.filter(([, d]) => d).length;

  return (
    <div className="container-x py-10">
      {sp.upgraded && <div className="mb-6"><Flash ok="You’re now Premium 🎉 Unlimited alerts and priority recruiter visibility are on." /></div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Hi {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-ink/60">{user.headline || 'Complete your profile to get better recommendations.'}</p>
        </div>
        <Link href="/jobs" className="btn-primary">Find jobs</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[['Saved jobs', saved.length], ['Applications', apps.length], ['Interviews', apps.filter((a) => a.status === 'interviewing').length], ['Job alerts', alertCount]].map(([k, v]) => (
          <div key={k} className="card p-5"><p className="text-sm text-ink/60">{k}</p><p className="mt-1 font-display text-3xl">{v}</p></div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-2xl">Applications</h2>
            {apps.length === 0 ? (
              <p className="card p-6 text-sm text-ink/60">No applications yet. When you apply to a job, it shows up here so you can track its progress.</p>
            ) : (
              <div className="card divide-y divide-ink/10">
                {apps.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${a.id}`} className="font-semibold hover:text-moss-700">{a.title}</Link>
                      <p className="text-sm text-ink/60">{a.company} · {a.location} · applied {timeAgo(a.applied_at)}{formatSalary(a.salary_min, a.salary_max, a.currency) && ` · ${formatSalary(a.salary_min, a.salary_max, a.currency)}`}</p>
                    </div>
                    <form action={updateApplicationStatus} className="flex items-center gap-2">
                      <input type="hidden" name="jobId" value={a.id} />
                      <select name="status" defaultValue={a.status} className="input !w-auto !py-1.5">
                        {Object.entries(STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button className="btn-ghost !px-3 !py-1.5">Update</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-2xl">Saved jobs</h2>
            {saved.length === 0 ? (
              <p className="card p-6 text-sm text-ink/60">Save jobs from search results to compare them later.</p>
            ) : (
              <div className="space-y-3">
                {saved.map((j) => (
                  <div key={j.id} className="relative">
                    <JobCard job={j} />
                    <form action={toggleSave} className="absolute right-4 top-4">
                      <input type="hidden" name="jobId" value={j.id} />
                      <button className="text-xs text-ink/50 hover:text-clay-600">Remove</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl">Your best matches</h2>
              <Link href="/matches" className="shrink-0 text-sm font-semibold text-moss-700 hover:underline">All matches →</Link>
            </div>
            {topMatches.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{topMatches.map((j) => <JobCard key={j.id} job={j} match={j} />)}</div>
            ) : (
              <div className="card p-6 text-sm text-ink/60">
                Upload your CV and we’ll rank open jobs by how well they fit you. <Link href="/matches" className="font-semibold text-moss-700">Find my matches →</Link>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-semibold">Profile strength</h3>
              <span className="text-sm text-ink/60">{done}/{checklist.length}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-sand-100"><div className="h-2 rounded-full bg-moss-500" style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
            <ul className="mt-4 space-y-2 text-sm">
              {checklist.map(([l, d]) => <li key={l} className={d ? 'text-ink/40 line-through' : ''}>{d ? '✓' : '○'} {l}</li>)}
            </ul>
            <Link href="/profile" className="btn-ghost mt-4 w-full">Edit profile</Link>
          </div>
          {user.plan !== 'premium' && (
            <div className="card bg-moss-900 p-6 text-sand-50">
              <h3 className="text-xl">Go Premium</h3>
              <p className="mt-2 text-sm text-sand-100/75">Unlimited job alerts and AI fit checks, match refreshes every 10 minutes, and top placement in recruiter search.</p>
              <Link href="/pricing" className="btn-accent mt-4 w-full">See plans</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
