import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getJob, similarJobs } from '@/lib/jobs.mjs';
import { getCurrentUser } from '@/lib/auth';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import { toggleSave, applyToJob } from '@/app/actions';
import CompanyMark from '@/components/CompanyMark';
import JobCard from '@/components/JobCard';

export async function generateMetadata({ params }) {
  const job = getJob(getDb(), (await params).id);
  return job ? { title: `${job.title} at ${job.company}`, description: job.description_text.slice(0, 160) } : {};
}

export default async function JobPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const job = getJob(db, id);
  if (!job) notFound();
  const user = await getCurrentUser();
  const saved = user && db.prepare('SELECT 1 FROM saved_jobs WHERE user_id = ? AND job_id = ?').get(user.id, job.id);
  const applied = user && db.prepare('SELECT 1 FROM applications WHERE user_id = ? AND job_id = ?').get(user.id, job.id);
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const similar = similarJobs(db, job);
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
      {!expired && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <Link href="/jobs" className="text-sm text-ink/60 hover:text-ink">← Back to search</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <CompanyMark name={job.company} size="lg" />
            <div>
              <h1 className="text-3xl leading-tight">{job.title}</h1>
              <p className="mt-1 text-ink/60">{job.company} · {job.location}</p>
            </div>
          </div>
          {expired && <p className="alert-error mt-6">This job is no longer accepting applications.</p>}
          {sp.applied && <p className="alert-ok mt-6">Application sent with your CV. Track it on your <Link href="/dashboard" className="underline">dashboard</Link>.</p>}
          <div className="prose-job mt-6" dangerouslySetInnerHTML={{ __html: job.description_html || '<p>No description provided.</p>' }} />
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
                  {applied ? 'Applied ✓ · Open again' : job.apply_url ? 'Apply on company site ↗' : 'Apply with my CV'}
                </button>
              </form>
            )}
            <form action={toggleSave}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost w-full">{saved ? '★ Saved' : '☆ Save job'}</button>
            </form>
            {!user && <p className="text-center text-xs text-ink/50">You’ll be asked to sign in, which takes about 30 seconds.</p>}
          </div>
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
