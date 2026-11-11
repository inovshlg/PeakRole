import Link from 'next/link';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import CompanyMark from './CompanyMark';
import MatchBadge from './MatchBadge';

export default function JobCard({ job, saved, match }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  return (
    <Link href={`/jobs/${job.id}`} className={`card card-hover group flex min-w-0 gap-4 p-5 ${job.featured ? 'ring-1 ring-accent-500/40' : ''}`}>
      <CompanyMark name={job.company} domain={job.company_domain} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {job.featured && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-600">Featured</p>}
            <h3 className="truncate text-[15px] font-semibold text-ink group-hover:text-brand-600">{job.title}</h3>
            <p className="mt-0.5 truncate text-sm text-ink/60">{job.company} · {job.location || 'Location flexible'}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {match && <MatchBadge score={match.score} ai={!!match.ai} />}
            {saved && <span className="chip-info">★ Saved</span>}
          </div>
        </div>
        {job.snippet && <p className="mt-2 line-clamp-2 text-sm text-ink/55">{job.snippet}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {salary ? <span className="chip bg-positive/10 font-semibold text-positive">{salary}</span> : <span className="chip">Salary not disclosed</span>}
          {job.remote ? <span className="chip">Remote</span> : null}
          {job.seniority && <span className="chip">{job.seniority}</span>}
          {job.employment_type && job.employment_type !== 'Full-time' && <span className="chip">{job.employment_type}</span>}
          <span className="ml-auto text-xs text-ink/45">{job.source === 'adzuna' && 'via Adzuna · '}{timeAgo(job.posted_at)}</span>
        </div>
      </div>
    </Link>
  );
}
