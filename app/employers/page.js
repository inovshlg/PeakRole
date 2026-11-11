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
import SpamGuard from '@/components/SpamGuard';
import { submitEnquiry } from '@/app/admin/actions';

export const metadata = { title: 'Hire SAP EWM & TM consultants' };

function Landing({ user, sent, error }) {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="container-x py-14">
          <p className="text-sm text-white/70">For companies & SAP partners</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-[44px]">Hire SAP EWM & TM consultants, faster.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">Tell us the role. We shortlist pre-screened consultants from our network (permanent, contract or remote) and you only pay when someone joins.</p>
        </div>
      </section>
      <section className="container-x mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {[['Niche network', 'Consultants with hands-on S/4HANA EWM and TM project experience: functional, technical and architects.'],
            ['Shortlist in days', 'We send 3–5 matched profiles with notice period, rate and availability, all with the candidate’s consent.'],
            ['Pay on success', 'No retainer. A placement fee only when a candidate joins.']].map(([t, d]) => (
            <div key={t} className="card p-5"><h2 className="text-base font-semibold">{t}</h2><p className="mt-1 text-sm text-ink/65">{d}</p></div>
          ))}
          {user && <p className="text-sm text-ink/55">You’re signed in as a job seeker; you can still send a hiring enquiry.</p>}
        </div>
        <form action={submitEnquiry} className="card space-y-3 p-6">
          <h2 className="section-title">Tell us what you need</h2>
          <Flash error={error} ok={sent && 'Thanks! We’ll be in touch within one working day.'} />
          <SpamGuard />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="company" required className="input" placeholder="Company" aria-label="Company" />
            <input name="name" className="input" placeholder="Your name" aria-label="Your name" />
            <input name="email" type="email" required className="input" placeholder="Work email" aria-label="Work email" />
            <input name="phone" className="input" placeholder="Phone (optional)" aria-label="Phone" />
          </div>
          <input name="role" required className="input" placeholder="Role, e.g. SAP EWM Lead (S/4HANA, MFS)" aria-label="Role" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="module" className="input" aria-label="Module"><option value="">Module</option>{['SAP EWM', 'SAP TM', 'SAP EWM & TM'].map((m) => <option key={m}>{m}</option>)}</select>
            <input name="location" className="input" placeholder="Location / remote" aria-label="Location" />
          </div>
          <textarea name="details" rows={4} className="input" placeholder="Must-have skills, duration or permanent, budget, start date" aria-label="Details" />
          <button className="btn-primary w-full">Send enquiry</button>
        </form>
      </section>
    </>
  );
}

export default async function EmployersPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== 'employer') return <Landing user={user} sent={sp.sent} error={sp.error} />;

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
