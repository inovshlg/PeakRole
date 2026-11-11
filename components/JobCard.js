import Link from 'next/link';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import CompanyMark from './CompanyMark';
import MatchBadge from './MatchBadge';

const EXPERIENCE = { Executive: '15+ yrs', Director: '12+ yrs', Lead: '8+ yrs', Senior: '5+ yrs', 'Mid-level': '3-6 yrs', Entry: '0-2 yrs' };

function Meta({ d, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-ink/45" aria-hidden><path d={d} /></svg>
      {children}
    </span>
  );
}

export default function JobCard({ job, saved, match }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const fresh = Date.now() - new Date(job.posted_at).getTime() < 3 * 86_400_000;
  return (
    <Link href={`/jobs/${job.id}`} className={`card card-hover group block min-w-0 p-5 ${job.featured ? 'border-accent-500/50' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {job.featured && <span className="rounded bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-600">Featured</span>}
            {fresh && <span className="rounded bg-positive/10 px-1.5 py-0.5 text-[11px] font-semibold text-positive">New</span>}
          </div>
          <h3 className="mt-0.5 truncate font-display text-[17px] font-semibold text-ink group-hover:text-brand-600">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm font-medium text-ink/70">{job.company}</p>
        </div>
        <CompanyMark name={job.company} domain={job.company_domain} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink/70">
        {job.seniority && <Meta d="M4 8h16v11H4zM9 8V5h6v3">{EXPERIENCE[job.seniority] || job.seniority}</Meta>}
        <Meta d="M7 5h10M7 9h10M7 5c5 0 5 8 0 8l7 7">{salary || 'Not disclosed'}</Meta>
        <Meta d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z">{job.remote && !/remote/i.test(job.location) ? `${job.location || 'India'} · Remote` : job.location || 'India'}</Meta>
      </div>
      {job.snippet && <p className="mt-3 line-clamp-2 text-sm text-ink/55">{job.snippet}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-canvas-100 pt-3">
        {job.category && <span className="chip">{job.category}</span>}
        {job.employment_type && job.employment_type !== 'Full-time' && <span className="chip">{job.employment_type}</span>}
        {match && <MatchBadge score={match.score} ai={!!match.ai} />}
        {saved && <span className="chip-info">Saved</span>}
        <span className="ml-auto text-xs text-ink/45">{job.source === 'adzuna' ? 'via Adzuna · ' : ''}{timeAgo(job.posted_at)}</span>
      </div>
    </Link>
  );
}
