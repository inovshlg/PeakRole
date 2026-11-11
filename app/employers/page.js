import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';
import { postJob, closeJob } from '@/app/actions';
import { SENIORITIES, EMPLOYMENT_TYPES } from '@/lib/jobs.mjs';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import Flash from '@/components/Flash';

export const metadata = { title: 'For employers' };

export default async function EmployersPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  if (!user || user.role !== 'employer') {
    return (
      <div className="container-x py-16">
        <div className="max-w-2xl">
          <h1 className="text-5xl leading-tight">Hire experienced leaders, faster.</h1>
          <p className="mt-4 text-lg text-ink/60">Post a role in minutes. Reach senior candidates who are actively looking, and search profiles of people open to new opportunities.</p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup?role=employer" className="btn-accent">Create employer account</Link>
            <Link href="/login?next=/employers" className="btn-ghost">Log in</Link>
          </div>
          {user && <p className="mt-6 text-sm text-ink/60">You’re signed in as a candidate. Create a separate employer account to post jobs.</p>}
        </div>
      </div>
    );
  }

  const db = await getDb();
  const jobs = await db.all(
    `SELECT j.*, (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicants,
            (SELECT COUNT(*)::int FROM saved_jobs s WHERE s.job_id = j.id) AS saves
     FROM jobs j WHERE posted_by_user_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{user.company}</h1>
          <p className="mt-1 text-ink/60">Post roles and manage your listings.</p>
        </div>
        <Link href="/employers/candidates" className="btn-ghost">Search candidates →</Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form action={postJob} className="card space-y-4 p-6 sm:p-8">
          <h2 className="text-2xl">Post a new job</h2>
          <Flash error={sp.error} ok={sp.posted && 'Your job is live. It appears in search and alerts straight away.'} />
          <div><label className="label" htmlFor="title">Job title</label><input id="title" name="title" required className="input" placeholder="e.g. Director of Engineering" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" className="input" placeholder="e.g. Bengaluru" /></div>
            <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="remote" className="h-4 w-4 accent-moss-700" /> Remote OK</label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="seniority">Seniority</label><select id="seniority" name="seniority" className="input"><option value="">Detect from title</option>{SENIORITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="employment_type">Type</label><select id="employment_type" name="employment_type" className="input">{EMPLOYMENT_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="salary_min">Salary from</label><input id="salary_min" name="salary_min" inputMode="numeric" className="input" placeholder="2500000" /></div>
            <div><label className="label" htmlFor="salary_max">Salary to</label><input id="salary_max" name="salary_max" inputMode="numeric" className="input" placeholder="3500000" /></div>
            <div><label className="label" htmlFor="currency">Currency</label><select id="currency" name="currency" className="input">{['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'].map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" required rows={10} className="input" placeholder={'About the role…\n\nResponsibilities\n- Lead the team\n- Own the roadmap'} />
            <p className="mt-1 text-xs text-ink/50">Separate paragraphs with a blank line. Lines starting with “- ” become bullet points.</p>
          </div>
          <div><label className="label" htmlFor="apply_url">External apply link (optional)</label><input id="apply_url" name="apply_url" type="url" className="input" placeholder="https://… (leave blank to receive CVs on PeakRole)" /></div>
          <button className="btn-accent">Publish job</button>
        </form>

        <section>
          <h2 className="mb-4 text-2xl">Your listings</h2>
          {jobs.length === 0 && <p className="card p-6 text-sm text-ink/60">No jobs posted yet.</p>}
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/jobs/${j.id}`} className="font-semibold hover:text-moss-700">{j.title}</Link>
                    <p className="text-sm text-ink/60">{j.location} · {timeAgo(j.posted_at)}{formatSalary(j.salary_min, j.salary_max, j.currency) && ` · ${formatSalary(j.salary_min, j.salary_max, j.currency)}`}</p>
                  </div>
                  <span className={`chip ${j.status === 'active' ? '!bg-moss-50 !text-moss-700' : ''}`}>{j.status === 'active' ? 'Live' : 'Closed'}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-ink/60">
                  <span><b className="text-ink">{j.applicants}</b> applicants</span>
                  <span><b className="text-ink">{j.saves}</b> saves</span>
                  {j.status === 'active' && (
                    <form action={closeJob} className="ml-auto"><input type="hidden" name="jobId" value={j.id} /><button className="text-xs hover:text-clay-600">Close job</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
