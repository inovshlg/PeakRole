import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getJob, similarJobs } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { formatSalary, timeAgo, slugify } from '@/lib/format.mjs';
import { typicalPayFor } from '@/lib/salaries.mjs';
import { toggleSave, applyToJob, checkMyFit } from '@/app/actions';
import { tailorCvForJob } from '@/app/cv/actions';
import { aiEnabled } from '@/lib/ai.mjs';
import SubmitButton from '@/components/SubmitButton';
import MatchBadge from '@/components/MatchBadge';
import Flash from '@/components/Flash';
import CompanyMark from '@/components/CompanyMark';
import JobCard from '@/components/JobCard';

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
      <p className="mt-0.5 text-xs text-ink/55">{text}</p>
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
  const [saved, applied, match, similar, tailored, prep, typical, poster] = await Promise.all([
    user && db.get('SELECT 1 AS x FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT stage FROM applications WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT * FROM job_matches WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    similarJobs(db, job),
    user && db.get("SELECT id FROM cvs WHERE user_id = $1 AND job_id = $2 AND kind = 'tailored' ORDER BY updated_at DESC LIMIT 1", [user.id, job.id]),
    user && db.get('SELECT 1 AS x FROM interview_preps WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    typicalPayFor(db, job),
    job.posted_by_user_id ? db.get('SELECT id, name, company, recruiter_type FROM users WHERE id = $1', [job.posted_by_user_id]) : null,
  ]);
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const expired = job.status !== 'active';
  const ai = aiEnabled();
  const loginFor = (what) => <Link href={`/login?next=/jobs/${job.id}`} className="btn-ghost w-full">Log in to {what}</Link>;

  // Structured data so Google for Jobs can index this listing (not for Adzuna's listings).
  const jsonLd = {
    '@context': 'https://schema.org/', '@type': 'JobPosting',
    title: job.title, description: job.description_html, datePosted: job.posted_at,
    ...(job.expires_at && { validThrough: job.expires_at }),
    employmentType: job.employment_type?.toUpperCase().replace('-', '_'),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    ...(job.remote ? { jobLocationType: 'TELECOMMUTE' } : {}),
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'IN' } },
    ...(job.salary_min && {
      baseSalary: { '@type': 'MonetaryAmount', currency: job.currency, value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max ?? job.salary_min, unitText: 'YEAR' } },
    }),
  };

  return (
    <div className="container-x py-6">
      {!expired && job.source !== 'adzuna' && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <Link href="/jobs" className="text-sm text-ink/60 hover:text-brand-600">← Back to search</Link>

      <header className="card mt-3 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <CompanyMark name={job.company} domain={job.company_domain} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight sm:text-[28px]">{job.title}</h1>
          <p className="mt-1 text-ink/65">
            <Link href={`/companies/${slugify(job.company)}`} className="font-medium text-brand-600 hover:underline">{job.company}</Link> · {job.location} · {timeAgo(job.posted_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.seniority && <span className="chip">{job.seniority}</span>}
            <span className="chip">{job.employment_type}</span>
            {job.remote ? <span className="chip">Remote</span> : null}
            {match && <MatchBadge score={match.score} ai={!!match.ai} />}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="eyebrow">Salary</p>
          <p className="text-2xl font-semibold text-positive">{salary || <span className="text-base font-medium text-ink/50">Not disclosed</span>}</p>
          {salary && <p className="text-xs text-ink/50">per year</p>}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="card p-6 sm:p-8">
          {expired && <p className="alert-error mb-4">This job is no longer accepting applications.</p>}
          <Flash error={sp.error} ok={sp.applied && <>Application sent with your CV. Track it on your <Link href="/dashboard" className="underline">dashboard</Link>.</>} />
          {match?.detailed ? <FitReport match={match} /> : null}
          <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.description_html || '<p>No description provided.</p>' }} />
          {job.source === 'adzuna' && (
            <p className="mt-6 rounded-lg bg-canvas-50 p-4 text-sm text-ink/70">
              This is a summary. The full description and application are on the original listing.{' '}
              <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="font-semibold text-brand-600">Jobs by Adzuna</a>
            </p>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            {!expired && (
              <form action={applyToJob}>
                <input type="hidden" name="jobId" value={job.id} />
                <button className="btn-primary w-full">
                  {applied ? `Applied ✓${applied.stage && applied.stage !== 'new' ? ` · ${applied.stage}` : ''}` : job.source === 'adzuna' ? 'View full job & apply ↗' : job.apply_url ? 'Apply on company site ↗' : tailored ? 'Apply with my tailored CV' : 'Apply with my CV'}
                </button>
              </form>
            )}
            <form action={toggleSave}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost w-full">{saved ? '★ Saved' : '☆ Save job'}</button>
            </form>
          </div>

          {candidate && !expired && (
            <div className="card p-5">
              <p className="eyebrow mb-3">✦ AI application tools</p>
              {!ai ? (
                <p className="text-sm text-ink/60">AI tools (tailored CV, fit check, interview prep) are being switched on for this site. Check back soon.</p>
              ) : (
                <div className="space-y-4">
                  <AiTool title="Tailored CV & cover letter" text="Your CV rewritten for this role, using only your real experience.">
                    {tailored ? <Link href={`/cv/${tailored.id}`} className="btn-ghost w-full">Open your tailored CV →</Link>
                      : user ? (
                        <form action={tailorCvForJob}><input type="hidden" name="jobId" value={job.id} />
                          <SubmitButton className="btn-primary w-full" pendingText="Tailoring your CV… (up to a minute)">✦ Generate CV for this job</SubmitButton></form>
                      ) : loginFor('generate your CV')}
                  </AiTool>
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

          {typical && (
            <div className="card p-5 text-sm">
              <p className="eyebrow">Typical pay</p>
              <p className="mt-1 text-lg font-semibold">{formatSalary(typical.p25, typical.p75, 'INR')}</p>
              <p className="text-xs text-ink/55">Middle 50% for {typical.scope} ({typical.n} listings) · <Link href="/salaries" className="text-brand-600">Salary insights</Link></p>
            </div>
          )}

          {poster && (
            <div className="card p-5 text-sm">
              <p className="eyebrow">Posted by</p>
              <p className="mt-1 font-semibold">{poster.name}</p>
              <p className="text-ink/60">{poster.recruiter_type === 'headhunter' ? `Headhunter · ${poster.company}` : poster.company}</p>
              {poster.recruiter_type === 'headhunter' && <Link href={`/headhunters/${poster.id}`} className="btn-quiet mt-2 !px-0">View profile & contact →</Link>}
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl">Similar roles</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{similar.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      )}
    </div>
  );
}

function FitReport({ match }) {
  const extra = match.strengths || {};
  const gaps = match.gaps || [];
  return (
    <section id="fit" className="mb-6 scroll-mt-24 rounded-xl border border-brand-200 bg-brand-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">✦ Your fit for this role</h2>
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
