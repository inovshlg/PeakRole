import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import { updateApplicationStatus, setAlertFrequency, deleteAlert } from '@/app/actions';
import { CARD_COLS } from '@/lib/jobs.mjs';
import { countryByCode } from '@/lib/niche.mjs';
import JobCard from '@/components/JobCard';
import Flash from '@/components/Flash';
import Icon from '@/components/Icon';

export const metadata = { title: 'Dashboard' };

const STATUSES = { applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', rejected: 'Not selected' };
const STEPS = ['Applied', 'Under review', 'Interview', 'Offer'];

/** Where an application is: employer-updated stage first, otherwise the candidate's own status. */
function stepOf(a) {
  if (a.posted_by_user_id && a.stage && a.stage !== 'new') {
    return { screening: 1, interview: 2, offer: 3, hired: 3, rejected: -1 }[a.stage] ?? 0;
  }
  return { applied: 0, interviewing: 2, offer: 3, rejected: -1 }[a.status] ?? 0;
}

function Ring({ pct }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#eaedfd" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={pct >= 80 ? '#006a28' : '#1f4fd1'} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

export default async function Dashboard({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/dashboard', 'candidate');
  const db = await getDb();
  const [{ n: savedCount }, apps, alerts, topMatches] = await Promise.all([
    db.get('SELECT COUNT(*)::int AS n FROM saved_jobs WHERE user_id = $1', [user.id]),
    db.all(
      `SELECT a.status, a.stage, a.created_at AS applied_at, j.posted_by_user_id, j.id, j.title, j.company, j.location, j.salary_min, j.salary_max, j.currency
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 20`,
      [user.id]
    ),
    db.all('SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC', [user.id]),
    db.all(
      `SELECT ${CARD_COLS}, m.score, m.ai FROM job_matches m JOIN jobs j ON j.id = m.job_id
       WHERE m.user_id = $1 AND j.status = 'active' AND j.id NOT IN (SELECT job_id FROM applications WHERE user_id = $1)
       ORDER BY m.score DESC LIMIT 4`,
      [user.id]
    ),
  ]);

  const checklist = [
    ['Add your SAP modules', !!user.sap_modules, '/onboarding'],
    ['Add years of experience', user.years_experience !== null && user.years_experience !== undefined, '/onboarding'],
    ['Upload your CV', !!user.cv_name, '/profile'],
    ['Add a headline', !!user.headline, '/profile'],
    ['Set your notice period', !!user.notice_period, '/onboarding'],
    ['Create a job alert', alerts.length > 0, '/alerts'],
    ['Share your profile with hiring companies', !!user.consent_at, '/profile#privacy'],
  ];
  const done = checklist.filter(([, d]) => d).length;
  const pct = Math.round((done / checklist.length) * 100);
  const interviews = apps.filter((a) => stepOf(a) === 2).length;

  return (
    <div className="container-x py-8">
      <div className="space-y-3">
        {sp.welcome && <Flash ok={sp.parsed ? 'Profile saved and your CV has been read. Here are jobs picked for you.' : 'Profile saved. Welcome to EWM-TM Jobs!'} />}
        {sp.error && <Flash error={sp.error} />}
        {sp.upgraded && <Flash ok="You’re now Premium. Unlimited alerts and priority recruiter visibility are on." />}
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-[26px] font-bold sm:text-[30px]">Hi {user.name.split(' ')[0]}</h1>
          <p className="text-muted">{[user.sap_modules && `SAP ${user.sap_modules}`, Number.isInteger(user.years_experience) && `${user.years_experience} yrs`, user.location].filter(Boolean).join(' · ') || 'Complete your profile to get better recommendations.'}</p>
        </div>
        <Link href="/jobs" className="btn-primary gap-2"><Icon name="search" className="h-4 w-4" />Find jobs</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Saved jobs', savedCount, 'bookmark', '/saved'], ['Applications', apps.length, 'briefcase', '#applications'], ['Interviews', interviews, 'calendar', '#applications'], ['Job alerts', alerts.length, 'bell', '#alerts']].map(([k, v, icon, href]) => (
          <Link key={k} href={href} className="rounded-xl bg-white p-4 shadow-card transition hover:shadow-raised">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Icon name={icon} className="h-4 w-4 text-brand-500" />{k}</span>
            <p className="mt-1 font-display text-3xl font-bold">{v}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <section id="applications" className="scroll-mt-24">
            <h2 className="mb-3 font-display text-xl font-semibold">Applications</h2>
            {apps.length === 0 ? (
              <div className="card p-6 text-sm text-muted">No applications yet. When you apply to a job, it shows up here so you can track its progress. <Link href="/jobs" className="font-semibold text-brand-500">Browse jobs →</Link></div>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => {
                  const step = stepOf(a);
                  const sal = formatSalary(a.salary_min, a.salary_max, a.currency);
                  return (
                    <div key={a.id} className="card p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/jobs/${a.id}`} className="font-display font-semibold hover:text-brand-500">{a.title}</Link>
                          <p className="text-sm text-muted">{a.company} · {a.location} · applied {timeAgo(a.applied_at)}{sal && <> · <span className="font-semibold text-positive">{sal}</span></>}</p>
                        </div>
                        {!a.posted_by_user_id && (
                          <form action={updateApplicationStatus} className="flex items-center gap-2">
                            <input type="hidden" name="jobId" value={a.id} />
                            <label className="sr-only" htmlFor={`st-${a.id}`}>Update status</label>
                            <select id={`st-${a.id}`} name="status" defaultValue={a.status} className="input !w-auto !py-1.5 text-sm">
                              {Object.entries(STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            <button className="btn-ghost !px-3 !py-1.5 text-sm">Update</button>
                          </form>
                        )}
                      </div>
                      {step < 0 ? (
                        <p className="mt-3 text-sm font-medium text-muted">Not progressing. Keep going, new roles arrive daily.</p>
                      ) : (
                        <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Application progress">
                          {STEPS.map((s, i) => (
                            <li key={s} className="min-w-0">
                              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-canvas-200'}`} />
                              <p className={`mt-1.5 truncate text-[11px] font-medium ${i === step ? 'text-brand-500' : i < step ? 'text-ink/70' : 'text-muted'}`}>{s}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                      {a.posted_by_user_id && <p className="mt-2 text-xs text-muted">Updated by the employer</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 className="font-display text-xl font-semibold">Recommended for you</h2>
              <Link href="/matches" className="shrink-0 text-sm font-semibold text-brand-500 hover:underline">All matches →</Link>
            </div>
            {topMatches.length > 0 ? (
              <div className="space-y-3">{topMatches.map((j) => <JobCard key={j.id} job={j} match={j} />)}</div>
            ) : (
              <div className="card flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
                <span className="rounded-lg bg-brand-100 p-2 text-brand-500"><Icon name="sparkle" className="h-6 w-6" /></span>
                <p className="flex-1 text-sm text-muted">Upload your CV and we’ll rank open SAP EWM/TM jobs by how well they fit you.</p>
                <Link href="/matches" className="btn-primary shrink-0">Find my matches</Link>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Ring pct={pct} />
                <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold">{pct}%</span>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold">Profile strength</h3>
                <p className="text-sm text-muted">{done === checklist.length ? 'All set. Recruiters see your full profile.' : `${checklist.length - done} step${checklist.length - done === 1 ? '' : 's'} left`}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {checklist.map(([l, d, href]) => (
                <li key={l}>
                  {d ? (
                    <span className="flex items-center gap-2 py-1 text-muted"><Icon name="checkCircle" className="h-4 w-4 text-positive" />{l}</span>
                  ) : (
                    <Link href={href} className="flex items-center gap-2 rounded-md py-1 font-medium hover:text-brand-500"><span className="h-4 w-4 rounded-full border-2 border-line" />{l}<Icon name="chevronRight" className="ml-auto h-4 w-4 text-muted" /></Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div id="alerts" className="card scroll-mt-24 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Job alerts</h3>
              <Link href="/alerts" className="text-sm font-semibold text-brand-500">+ New</Link>
            </div>
            {alerts.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No alerts yet. <Link href="/alerts" className="font-medium text-brand-500">Create one</Link> to get new jobs by email.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-lg bg-brand-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-semibold">{[a.module && `SAP ${a.module}`, a.query].filter(Boolean).join(' · ') || 'Any role'}{(a.location || a.country) && <span className="font-normal text-muted"> in {a.location || countryByCode(a.country)?.name}</span>}</p>
                      <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button aria-label="Delete alert" className="text-muted hover:text-negative"><Icon name="close" className="h-4 w-4" /></button></form>
                    </div>
                    <form action={setAlertFrequency} className="mt-2 flex gap-1 text-xs font-medium">
                      <input type="hidden" name="id" value={a.id} />
                      {['daily', 'weekly'].map((fq) => (
                        <button key={fq} name="frequency" value={fq} aria-pressed={a.frequency === fq} className={`rounded-md px-2.5 py-1 capitalize ${a.frequency === fq ? 'bg-brand-500 text-white' : 'bg-white text-muted hover:text-ink'}`}>{fq}</button>
                      ))}
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user.plan !== 'premium' && (
            <div className="rounded-xl bg-brand-900 p-5 text-white">
              <h3 className="font-display text-lg font-bold text-white">Go Premium</h3>
              <p className="mt-1 text-sm text-white/75">Unlimited job alerts and AI fit checks, faster match refreshes, and top placement when recruiters search.</p>
              <Link href="/pricing" className="btn-accent mt-4 w-full">See plans</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
