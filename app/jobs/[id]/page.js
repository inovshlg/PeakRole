import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getJob, similarJobs } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import { toggleSave, applyToJob, checkMyFit } from '@/app/actions';
import { aiEnabled } from '@/lib/ai.mjs';
import SubmitButton from '@/components/SubmitButton';
import MatchBadge from '@/components/MatchBadge';
import Flash from '@/components/Flash';
import { tailorCvForJob } from '@/app/cv/actions';
import CompanyMark from '@/components/CompanyMark';
import JobCard from '@/components/JobCard';

// AI calls run in this page's server actions; allow them time to finish.
export const maxDuration = 300;

export async function generateMetadata({ params }) {
  const job = await getJob(await getDb(), (await params).id);
  return job ? { title: `${job.title} at ${job.company}`, description: job.description_text.slice(0, 160) } : {};
}

export default async function JobPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const job = await getJob(db, id);
  if (!job) notFound();
  const user = await getCurrentUser();
  const [saved, applied, match, similar, tailored] = await Promise.all([
    user && db.get('SELECT 1 AS x FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT 1 AS x FROM applications WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    user && db.get('SELECT * FROM job_matches WHERE user_id = $1 AND job_id = $2', [user.id, job.id]),
    similarJobs(db, job),
    user && db.get("SELECT id FROM cvs WHERE user_id = $1 AND job_id = $2 AND kind = 'tailored' ORDER BY updated_at DESC LIMIT 1", [user.id, job.id]),
  ]);
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const expired = job.status !== 'active';

  // Structured data so Google for Jobs can index this listing.
  const jsonLd = {
    '@context': 'https://schema.org/', '@type': 'JobPosting',
    title: job.title, description: job.description_html, datePosted: job.posted_at,
    ...(job.expires_at && { validThrough: job.expires_at }),
    employmentType: job.employment_type?.toUpperCase().replace('-', '_'),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    ...(job.remote ? { jobLocationType: 'TELECOMMUTE' } : {}),
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } },
    ...(job.salary_min && {
      baseSalary: { '@type': 'MonetaryAmount', currency: job.currency, value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max ?? job.salary_min, unitText: 'YEAR' } },
    }),
  };

  return (
    <div className="container-x py-8">
      {!expired && job.source !== 'adzuna' && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <Link href="/jobs" className="text-sm text-ink/60 hover:text-ink">← Back to search</Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <CompanyMark name={job.company} size="lg" />
            <div>
              <h1 className="text-3xl leading-tight">{job.title}</h1>
              <p className="mt-1 text-ink/60">{job.company} · {job.location}</p>
            </div>
          </div>
          {expired && <p className="alert-error mt-6">This job is no longer accepting applications.</p>}
          {sp.error && <div className="mt-6"><Flash error={sp.error} /></div>}
          {match?.detailed ? <FitReport match={match} /> : null}
          {sp.applied && <p className="alert-ok mt-6">Application sent with your CV. Track it on your <Link href="/dashboard" className="underline">dashboard</Link>.</p>}
          <div className="prose-job mt-6" dangerouslySetInnerHTML={{ __html: job.description_html || '<p>No description provided.</p>' }} />
          {job.source === 'adzuna' && (
            <p className="mt-6 rounded-xl bg-sand-100 p-4 text-sm text-ink/70">
              This is a summary. The full description and application are on the original listing.{' '}
              <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="font-semibold text-moss-700">Jobs by Adzuna</a>
            </p>
          )}
        </article>

        <aside className="space-y-4">
          <div className="card space-y-4 p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Salary</p>
              <p className="mt-1 font-display text-2xl">{salary ? `${salary} / year` : 'Not disclosed'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[['Seniority', job.seniority], ['Type', job.employment_type], ['Work', job.remote ? 'Remote' : 'On-site / hybrid'], ['Posted', timeAgo(job.posted_at)]].map(([k, v]) => (
                <div key={k}><dt className="text-ink/50">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {!expired && (
              <form action={applyToJob}>
                <input type="hidden" name="jobId" value={job.id} />
                <button className="btn-accent w-full">
                  {applied ? 'Applied ✓ · Open again' : job.source === 'adzuna' ? 'View full job & apply ↗' : job.apply_url ? 'Apply on company site ↗' : 'Apply with my CV'}
                </button>
              </form>
            )}
            <form action={toggleSave}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost w-full">{saved ? '★ Saved' : '☆ Save job'}</button>
            </form>
            {!user && <p className="text-center text-xs text-ink/50">You’ll be asked to sign in, which takes about 30 seconds.</p>}
          </div>
          {!expired && aiEnabled() && user?.role !== 'employer' && (
            <div className="card p-6">
              <h3 className="font-sans font-semibold">Apply with a CV made for this job</h3>
              <p className="mt-2 text-sm text-ink/60">AI rewrites your CV around this role’s requirements, using only your real experience, and writes a cover letter.</p>
              {tailored ? (
                <Link href={`/cv/${tailored.id}`} className="btn-ghost mt-4 w-full">Open your tailored CV →</Link>
              ) : user ? (
                <form action={tailorCvForJob} className="mt-4">
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton className="btn-accent w-full" pendingText="Tailoring your CV… (up to a minute)">✦ Tailor my CV for this job</SubmitButton>
                </form>
              ) : (
                <Link href={`/login?next=/jobs/${job.id}`} className="btn-accent mt-4 w-full">Log in to tailor your CV</Link>
              )}
            </div>
          )}
          {!expired && aiEnabled() && user?.role !== 'employer' && (
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-sans font-semibold">How well do you fit?</h3>
                {match && <MatchBadge score={match.score} ai={!!match.ai} />}
              </div>
              {match && !match.detailed && <p className="mt-2 text-sm text-ink/60">{match.reason}</p>}
              {!match && <p className="mt-2 text-sm text-ink/60">AI compares your CV with this job and tells you your strengths, gaps and what to emphasise.</p>}
              {match?.detailed ? (
                <a href="#fit" className="btn-ghost mt-4 w-full">See your fit report ↑</a>
              ) : user ? (
                <form action={checkMyFit} className="mt-4">
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton className="btn-primary w-full" pendingText="Analysing your fit…">✦ Check my fit</SubmitButton>
                </form>
              ) : (
                <Link href={`/login?next=/jobs/${job.id}`} className="btn-primary mt-4 w-full">Log in to check your fit</Link>
              )}
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl">Similar roles</h2>
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
    <section id="fit" className="mt-6 scroll-mt-24 rounded-2xl border border-moss-500/30 bg-moss-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">✦ Your fit for this role</h2>
        <MatchBadge score={match.score} />
      </div>
      <p className="mt-2 text-sm text-ink/80">{match.reason}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[['Strengths', extra.strengths], ['Gaps', gaps], ['In your application, emphasise', extra.tips]].map(([title, items]) =>
          items?.length ? (
            <div key={title}>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink/80">{items.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ) : null
        )}
      </div>
      <p className="mt-4 text-xs text-ink/50">AI-generated from your CV and the job description. It can be wrong; use it as a guide.</p>
    </section>
  );
}
