import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getJob, similarJobs } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { formatSalary, timeAgo, slugify } from '@/lib/format.mjs';
import { typicalPayFor } from '@/lib/salaries.mjs';
import { toggleSave, applyToJob, checkMyFit, createAlert } from '@/app/actions';
import { countryByCode } from '@/lib/niche.mjs';
import { aiEnabled } from '@/lib/ai.mjs';
import SubmitButton from '@/components/SubmitButton';
import MatchBadge from '@/components/MatchBadge';
import Flash from '@/components/Flash';
import CompanyMark from '@/components/CompanyMark';
import JobCard, { experienceLabel } from '@/components/JobCard';
import Icon from '@/components/Icon';
import ShareMenu from '@/components/ShareMenu';

// AI calls run in this page's server actions; allow them time to finish.
export const maxDuration = 300;

export async function generateMetadata({ params }) {
  const job = await getJob(await getDb(), (await params).id);
  return job ? { title: `${job.title} at ${job.company}`, description: job.description_text.slice(0, 160) } : {};
}

function AiTool({ title, text, children }) {
  return (
    <div className="border-t border-canvas-100 pt-4 first:border-0 first:pt-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{text}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function JobPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const job = await getJob(db, id);
  if (!job) notFound();
  const user = await getCurrentUser();
  const candidate = !user || user.role === 'candidate';
  const [saved, applied, match, similar, prep, typical, poster, companyJobs] = await Promise.all([
    user && db.get('SELECT 1 AS x FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT stage FROM applications WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT * FROM job_matches WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    similarJobs(db, job),
    user && db.get('SELECT 1 AS x FROM interview_preps WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    typicalPayFor(db, job),
    job.posted_by_user_id ? db.get('SELECT id, name, company, recruiter_type FROM users WHERE id = $1', [job.posted_by_user_id]) : null,
    db.get("SELECT COUNT(*)::int AS n FROM jobs WHERE status = 'active' AND company = $1", [job.company]),
  ]);
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const expired = job.status !== 'active';
  const ai = aiEnabled();
  const loginFor = (what) => <Link href={`/login?next=/jobs/${job.id}`} className="btn-ghost w-full">Log in to {what}</Link>;
  const module = /TM/.test(job.category || '') && !/EWM/.test(job.category || '') ? 'TM' : /EWM/.test(job.category || '') ? 'EWM' : '';
  const country = job.country && countryByCode(job.country);
  const exp = experienceLabel(job);
  const applyLabel = applied
    ? `Applied ✓${applied.stage && applied.stage !== 'new' ? ` · ${applied.stage}` : ''}`
    : job.source === 'adzuna' ? 'View full job & apply' : job.apply_url ? 'Apply on company site' : 'Apply with my resume';

  // Structured data so Google for Jobs can index this listing (not for Adzuna's listings).
  const jsonLd = {
    '@context': 'https://schema.org/', '@type': 'JobPosting',
    title: job.title, description: job.description_html, datePosted: job.posted_at,
    ...(job.expires_at && { validThrough: job.expires_at }),
    employmentType: job.employment_type?.toUpperCase().replace('-', '_'),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    ...(job.remote ? { jobLocationType: 'TELECOMMUTE' } : {}),
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, ...(job.country && { addressCountry: job.country }) } },
    ...(job.salary_min && {
      baseSalary: { '@type': 'MonetaryAmount', currency: job.currency, value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max ?? job.salary_min, unitText: 'YEAR' } },
    }),
  };

  const facts = [
    ['money', 'Salary', salary || 'Not disclosed', salary ? 'text-positive' : 'text-muted'],
    ['clock', 'Experience', exp || 'Not stated', ''],
    ['pin', 'Location', job.remote && !/remote/i.test(job.location || '') ? `${job.location} · Remote` : job.location || 'Not stated', ''],
    ['briefcase', 'Contract', job.employment_type === 'Contract' ? 'Contract / freelance' : job.employment_type || 'Full-time', ''],
  ];

  return (
    <div className="container-x pb-28 pt-5 lg:pb-10">
      {!expired && job.source !== 'adzuna' && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted">
        <Link href="/jobs" className="shrink-0 hover:text-brand-500">Jobs</Link>
        {module && <><Icon name="chevronRight" className="h-4 w-4 shrink-0" /><Link href={module === 'TM' ? '/sap-tm-jobs' : '/sap-ewm-jobs'} className="shrink-0 hover:text-brand-500">SAP {module}</Link></>}
        {country && <><Icon name="chevronRight" className="h-4 w-4 shrink-0" /><Link href={`/jobs?country=${job.country}${module ? `&module=${module}` : ''}`} className="shrink-0 hover:text-brand-500">{country.name}</Link></>}
        <Icon name="chevronRight" className="h-4 w-4 shrink-0" /><span className="truncate text-ink">{job.title}</span>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <header className="card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <CompanyMark name={job.company} domain={job.company_domain} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {job.featured_until && new Date(job.featured_until) > new Date() && <span className="tag bg-accent-500 text-accent-ink">Featured</span>}
                  {Date.now() - new Date(job.posted_at).getTime() < 3 * 86_400_000 && <span className="tag bg-positive text-white">New</span>}
                  {job.min_experience === 0 && <span className="tag bg-mint text-positive">Freshers welcome</span>}
                  {job.category && <span className="tag bg-brand-100 text-brand-700">{job.category}</span>}
                </div>
                <h1 className="mt-1.5 font-display text-[22px] font-bold leading-tight sm:text-[28px]">{job.title}</h1>
                <p className="mt-1 text-sm text-muted">
                  <Link href={`/companies/${slugify(job.company)}`} className="font-semibold text-brand-500 hover:underline">{job.company}</Link> · Posted {timeAgo(job.posted_at)}{job.source === 'adzuna' ? ' · via Adzuna' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <ShareMenu title={`${job.title} at ${job.company}`} path={`/jobs/${job.id}`} />
                <form action={toggleSave}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <button aria-label={saved ? 'Remove from saved jobs' : 'Save job'} aria-pressed={!!saved} className={`flex h-10 w-10 items-center justify-center rounded-lg hover:bg-canvas-100 ${saved ? 'text-brand-500' : 'text-muted hover:text-brand-500'}`}>
                    <Icon name="bookmark" filled={!!saved} />
                  </button>
                </form>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([icon, k, v, cls]) => (
                <div key={k} className="rounded-lg bg-brand-50 p-3">
                  <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted"><Icon name={icon} className="h-4 w-4" />{k}</dt>
                  <dd className={`mt-1 text-sm font-semibold ${cls}`}>{v}</dd>
                </div>
              ))}
            </dl>
            {match && !match.detailed && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-mint/40 p-3 text-sm"><span className="match-pill shrink-0 !bg-white !py-0.5 !text-xs">{match.score}% match</span><span className="text-ink/80">{match.reason}</span></p>
            )}
          </header>

          <article className="card p-5 sm:p-8">
            {expired && <p className="alert-error mb-4">This job is no longer accepting applications.</p>}
            <Flash error={sp.error} ok={sp.applied && <>Application sent with your CV. Track it on your <Link href="/dashboard" className="underline">dashboard</Link>.</>} />
            {match?.detailed ? <FitReport match={match} /> : null}
            <h2 className="mb-3 font-display text-lg font-semibold">About the role</h2>
            <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.description_html || '<p>No description provided.</p>' }} />
            {job.source === 'adzuna' && (
              <p className="mt-6 rounded-lg bg-brand-50 p-4 text-sm text-ink/70">
                This is a summary. The full description and application are on the original listing.{' '}
                <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="font-semibold text-brand-500">Jobs by Adzuna</a>
              </p>
            )}
          </article>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {!expired && (
            <div className="card hidden space-y-2 p-5 lg:block">
              <form action={applyToJob}>
                <input type="hidden" name="jobId" value={job.id} />
                <button className="btn-primary w-full gap-2">{applyLabel}{!applied && (job.apply_url || job.source === 'adzuna') && <Icon name="arrowRight" className="h-4 w-4" />}</button>
              </form>
              <p className="text-center text-xs text-muted">{job.apply_url || job.source === 'adzuna' ? 'Opens the employer’s page. We keep track of it on your dashboard.' : 'Your saved resume is sent to the employer.'}</p>
            </div>
          )}

          {candidate && !expired && (
            <div className="card p-5">
              <p className="eyebrow mb-3 flex items-center gap-1"><Icon name="sparkle" className="h-4 w-4 text-brand-500" />AI application tools</p>
              {!ai ? (
                <p className="text-sm text-muted">AI tools (fit check, interview prep) are being switched on for this site. Check back soon.</p>
              ) : (
                <div className="space-y-4">
                  <AiTool title="How well do you fit?" text={match && !match.detailed ? match.reason : 'Strengths, gaps and what to emphasise.'}>
                    {match?.detailed ? <a href="#fit" className="btn-quiet w-full">See your fit report ↑</a>
                      : user ? (
                        <form action={checkMyFit}><input type="hidden" name="jobId" value={job.id} />
                          <SubmitButton className="btn-ghost w-full" pendingText="Analysing your fit…">Check my fit</SubmitButton></form>
                      ) : loginFor('check your fit')}
                  </AiTool>
                  <AiTool title="Interview preparation" text="Likely questions with answers built from your CV.">
                    {user ? <Link href={`/jobs/${job.id}/interview`} className="btn-ghost w-full">{prep ? 'Open interview prep →' : 'Prepare for the interview'}</Link> : loginFor('prepare')}
                  </AiTool>
                </div>
              )}
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <CompanyMark name={job.company} domain={job.company_domain} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{job.company}</p>
                <p className="text-xs text-muted">{companyJobs.n} open SAP EWM/TM job{companyJobs.n === 1 ? '' : 's'}</p>
              </div>
            </div>
            <Link href={`/companies/${slugify(job.company)}`} className="btn-ghost mt-3 w-full">View company</Link>
          </div>

          {typical && (
            <div className="card p-5 text-sm">
              <p className="eyebrow">Typical pay</p>
              <p className="mt-1 text-lg font-bold text-positive">{formatSalary(typical.p25, typical.p75, typical.currency)}</p>
              <p className="text-xs text-muted">Middle 50% for {typical.scope} ({typical.n} listings) · <Link href="/salaries" className="text-brand-500">Salary insights</Link></p>
            </div>
          )}

          {candidate && (module || country) && (
            <form action={createAlert} className="flex items-center gap-3 rounded-full bg-brand-900 py-2 pl-4 pr-2 text-white">
              <input type="hidden" name="back" value={`/jobs?${new URLSearchParams({ ...(module && { module }), ...(job.country && { country: job.country }) })}`} />
              {module && <input type="hidden" name="module" value={module} />}
              {job.country && <input type="hidden" name="country" value={job.country} />}
              <input type="hidden" name="frequency" value="daily" />
              <Icon name="bell" className="h-5 w-5 shrink-0 text-accent-500" />
              <span className="min-w-0 flex-1 text-sm">Alerts for {module ? `SAP ${module}` : 'SAP'} jobs{country ? ` in ${country.name}` : ''}</span>
              {user ? <button className="btn-accent shrink-0 !rounded-full !px-4 !py-1.5 text-sm">Turn on</button>
                : <Link href={`/signup?next=/jobs/${job.id}`} className="btn-accent shrink-0 !rounded-full !px-4 !py-1.5 text-sm">Turn on</Link>}
            </form>
          )}

          {poster && (
            <div className="card p-5 text-sm">
              <p className="eyebrow">Posted by</p>
              <p className="mt-1 font-semibold">{poster.name}</p>
              <p className="text-muted">{poster.recruiter_type === 'headhunter' ? `Headhunter · ${poster.company}` : poster.company}</p>
              {poster.recruiter_type === 'headhunter' && <Link href={`/headhunters/${poster.id}`} className="btn-quiet mt-2 !px-0">View profile & contact →</Link>}
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold">Similar roles</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{similar.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      )}

      {!expired && (
        <div className={`fixed inset-x-0 z-30 flex items-center gap-3 border-t border-canvas-200 bg-white px-4 py-3 lg:hidden ${user && candidate ? 'bottom-[60px]' : 'bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{job.title}</p>
            <p className={`truncate text-xs ${salary ? 'font-bold text-positive' : 'text-muted'}`}>{salary || job.company}</p>
          </div>
          <form action={applyToJob} className="shrink-0">
            <input type="hidden" name="jobId" value={job.id} />
            <button className="btn-primary !px-5">{applied ? 'Applied ✓' : 'Apply'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function FitReport({ match }) {
  const extra = match.strengths || {};
  const gaps = match.gaps || [];
  return (
    <section id="fit" className="mb-6 scroll-mt-24 rounded-xl bg-brand-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Your fit for this role</h2>
        <MatchBadge score={match.score} />
      </div>
      <p className="mt-2 text-sm text-ink/80">{match.reason}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[['Strengths', extra.strengths], ['Gaps', gaps], ['In your application, emphasise', extra.tips]].map(([title, items]) =>
          items?.length ? (
            <div key={title}>
              <h3 className="eyebrow">{title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink/80">{items.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ) : null
        )}
      </div>
      <p className="mt-4 text-xs text-ink/50">AI-generated from your CV and the job description. Use it as a guide.</p>
    </section>
  );
}
