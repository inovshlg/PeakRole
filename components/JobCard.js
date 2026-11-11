import Link from 'next/link';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import CompanyMark from './CompanyMark';
import MatchBadge from './MatchBadge';

export default function JobCard({ job, saved, match }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  return (
    <Link href={`/jobs/${job.id}`} className="card group flex min-w-0 gap-4 p-5 transition hover:border-moss-500/50 hover:shadow-sm">
      <CompanyMark name={job.company} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-sans text-base font-semibold text-ink group-hover:text-moss-700">{job.title}</h3>
            <p className="mt-0.5 truncate text-sm text-ink/60">{job.company} · {job.location || 'Location flexible'}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {match && <MatchBadge score={match.score} ai={!!match.ai} />}
            {saved && <span className="chip !bg-moss-50 !text-moss-700">★ Saved</span>}
          </div>
        </div>
        {job.snippet && <p className="mt-2 line-clamp-2 text-sm text-ink/55">{job.snippet}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {salary ? <span className="chip !bg-moss-700 !text-white">{salary}</span> : <span className="chip">Salary on request</span>}
          {job.remote ? <span className="chip">Remote</span> : null}
          {job.seniority && <span className="chip">{job.seniority}</span>}
          {job.employment_type && job.employment_type !== 'Full-time' && <span className="chip">{job.employment_type}</span>}
          <span className="ml-auto text-xs text-ink/45">{timeAgo(job.posted_at)}</span>
        </div>
      </div>
    </Link>
  );
}
