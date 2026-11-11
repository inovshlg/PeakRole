import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';
import { postJob, closeJob } from '@/app/actions';
import { featureJob } from '@/app/network/actions';
import { SENIORITIES, EMPLOYMENT_TYPES } from '@/lib/jobs.mjs';
import { FEATURE_COST, FEATURE_DAYS } from '@/lib/credits.mjs';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Employers' };

function Landing({ user }) {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="container-x py-16">
          <p className="text-sm text-white/60">For employers & headhunters</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-[44px]">Hire senior talent in India, faster.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">Post roles for free, search AI-ranked candidates, and manage applicants in one pipeline.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup?role=employer" className="btn-primary">I’m hiring for my company</Link>
            <Link href="/signup?role=headhunter" className="btn border border-white/30 text-white hover:bg-white/10">I’m a headhunter</Link>
            <Link href="/login?next=/employers" className="btn text-white/80 hover:bg-white/10">Log in</Link>
          </div>
          {user && <p className="mt-6 text-sm text-white/60">You’re signed in as a job seeker. Create a separate recruiter account to hire.</p>}
        </div>
      </section>
      <section className="container-x mt-10 grid gap-4 md:grid-cols-3">
        {[['Free job posts', 'Publish roles in minutes. Applicants apply with CVs tailored to your job.'], ['AI talent search', 'Paste a job description and get the best-fit candidates, ranked and explained.'], ['Applicant pipeline', 'Move applicants from New to Hired, with AI fit scores on every profile.']].map(([t, d]) => (
          <div key={t} className="card p-6"><h2 className="section-title">{t}</h2><p className="mt-2 text-sm text-ink/60">{d}</p></div>
        ))}
      </section>
    </>
  );
}

export default async function EmployersPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== 'employer') return <Landing user={user} />;

  const db = await getDb();
  const [jobs, stats] = await Promise.all([
    db.all(
      `SELECT j.*, (j.featured_until > now()) AS featured,
              (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicants,
              (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id AND a.stage = 'new') AS new_applicants
       FROM jobs j WHERE posted_by_user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    ),
    db.get(
      `SELECT (SELECT COUNT(*)::int FROM unlocks WHERE recruiter_id = $1) AS unlocked,
              (SELECT COUNT(*)::int FROM conversations WHERE recruiter_id = $1) AS conversations`,
      [user.id]
    ),
  ]);
  const live = jobs.filter((j) => j.status === 'active');
  const profileIncomplete = !user.bio && !user.company_about;

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{user.recruiter_type === 'headhunter' ? 'Headhunter' : 'Employer'} workspace</p>
          <h1 className="page-title mt-1">{user.company}</h1>
        </div>
        <div className="flex gap-2"><Link href="/employers/candidates" className="btn-primary">Find candidates</Link><Link href="/employers/profile" className="btn-ghost">Edit profile</Link></div>
      </div>

      <div className="mt-6 space-y-3">
        <Flash error={sp.error} ok={(sp.posted && 'Your job is live. It appears in search and alerts straight away.') || (sp.featured && `Job featured for ${FEATURE_DAYS} days. It now shows at the top of search.`)} />
        {profileIncomplete && <p className="alert-ok">Complete your <Link href="/employers/profile" className="font-semibold underline">{user.recruiter_type === 'headhunter' ? 'headhunter profile' : 'company profile'}</Link> so candidates know who you are.</p>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Live jobs', live.length], ['Applicants', jobs.reduce((n, j) => n + j.applicants, 0)], ['Unlocked candidates', stats.unlocked], ['Credits', user.credits]].map(([k, v]) => (
          <div key={k} className="card p-5"><p className="text-sm text-ink/60">{k}</p><p className="mt-1 text-3xl font-semibold">{v}</p></div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <h2 className="section-title mb-3">Your jobs</h2>
          {jobs.length === 0 && <p className="card p-6 text-sm text-ink/60">No jobs posted yet. Use the form to publish your first role.</p>}
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/employers/jobs/${j.id}`} className="font-semibold hover:text-brand-600">{j.title}</Link>
                    <p className="text-sm text-ink/60">{j.location} · posted {timeAgo(j.posted_at).toLowerCase()}{formatSalary(j.salary_min, j.salary_max, j.currency) && ` · ${formatSalary(j.salary_min, j.salary_max, j.currency)}`}</p>
                  </div>
                  <span className={`chip ${j.status === 'active' ? 'bg-positive/10 text-positive' : ''}`}>{j.status === 'active' ? (j.featured ? 'Featured' : 'Live') : 'Closed'}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <Link href={`/employers/jobs/${j.id}`} className="font-semibold text-brand-600">{j.applicants} applicant{j.applicants === 1 ? '' : 's'}{j.new_applicants ? ` · ${j.new_applicants} new` : ''} →</Link>
                  {j.status === 'active' && !j.featured && (
                    <form action={featureJob}><input type="hidden" name="jobId" value={j.id} /><button className="text-ink/60 hover:text-accent-600">★ Feature ({FEATURE_COST} credits)</button></form>
                  )}
                  {j.status === 'active' && (
                    <form action={closeJob} className="ml-auto"><input type="hidden" name="jobId" value={j.id} /><button className="text-xs text-ink/50 hover:text-negative">Close job</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <form action={postJob} className="card h-fit space-y-4 p-6">
          <h2 className="section-title">Post a new job</h2>
          <div><label className="label" htmlFor="title">Job title</label><input id="title" name="title" required className="input" placeholder="e.g. Director of Engineering" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" className="input" placeholder="e.g. Bengaluru" /></div>
            <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="remote" className="h-4 w-4 accent-brand-500" /> Remote OK</label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="seniority">Seniority</label><select id="seniority" name="seniority" className="input"><option value="">Detect from title</option>{SENIORITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="employment_type">Type</label><select id="employment_type" name="employment_type" className="input">{EMPLOYMENT_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="salary_min">CTC from (₹/yr)</label><input id="salary_min" name="salary_min" inputMode="numeric" className="input" placeholder="2500000" /></div>
            <div><label className="label" htmlFor="salary_max">CTC to (₹/yr)</label><input id="salary_max" name="salary_max" inputMode="numeric" className="input" placeholder="3500000" /></div>
            <div><label className="label" htmlFor="currency">Currency</label><select id="currency" name="currency" className="input">{['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'].map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" required rows={9} className="input" placeholder={'About the role…\n\nResponsibilities\n- Lead the team\n- Own the roadmap'} />
            <p className="mt-1 text-xs text-ink/50">Blank line = new paragraph. Lines starting with “- ” become bullet points.</p>
          </div>
          <div><label className="label" htmlFor="apply_url">External apply link (optional)</label><input id="apply_url" name="apply_url" type="url" className="input" placeholder="Leave blank to receive applications on PeakRole" /></div>
          <SubmitButton pendingText="Publishing…">Publish job</SubmitButton>
        </form>
      </div>
    </div>
  );
}
