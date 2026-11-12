import Link from 'next/link';
import { formatSalary, timeAgo } from '@/lib/format.mjs';
import { toggleSave } from '@/app/actions';
import CompanyMark from './CompanyMark';
import Icon from './Icon';

const EXPERIENCE = { Executive: '15+ yrs', Director: '12+ yrs', Lead: '8+ yrs', Senior: '5+ yrs', 'Mid-level': '3-6 yrs', Entry: '0-2 yrs' };

export function experienceLabel(job) {
  if (job.min_experience === 0) return 'Freshers welcome';
  if (Number.isInteger(job.min_experience)) return `${job.min_experience}+ yr${job.min_experience === 1 ? '' : 's'} experience`;
  return EXPERIENCE[job.seniority] || job.seniority || null;
}

/**
 * Job card in the Stitch layout. Pass `saved` (true/false) to show the bookmark button;
 * pass `match` ({ score }) to show the match pill.
 */
export default function JobCard({ job, saved, match }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const fresh = Date.now() - new Date(job.posted_at).getTime() < 3 * 86_400_000;
  const exp = experienceLabel(job);
  const location = job.remote && !/remote/i.test(job.location || '') ? `${job.location || 'Location not stated'} · Remote` : job.location || 'Location not stated';
  return (
    <article className="group relative min-w-0 rounded-xl bg-white p-4 shadow-card transition-shadow hover:shadow-raised sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <CompanyMark name={job.company} domain={job.company_domain} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 font-display text-[17px] font-semibold leading-snug text-ink group-hover:text-brand-500">
              <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-xl">{job.title}</Link>
            </h3>
            {job.featured && <span className="tag bg-accent-500 text-accent-ink">Featured</span>}
            {fresh && <span className="tag bg-positive text-white">New</span>}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {job.company} <span className="mx-1">·</span><span className="text-xs">{job.source === 'adzuna' ? 'via Adzuna · ' : ''}{timeAgo(job.posted_at)}</span>
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {match && (
            <span className="match-pill hidden !py-0.5 !text-xs sm:inline-flex" title={match.ai ? 'AI match score' : 'Keyword match score'}>
              <Icon name="checkCircle" className="h-4 w-4" />{match.score}% match
            </span>
          )}
          {saved !== undefined && (
            <form action={toggleSave}>
              <input type="hidden" name="jobId" value={job.id} />
              <button aria-label={saved ? 'Remove from saved jobs' : 'Save job'} aria-pressed={!!saved} className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-canvas-100 ${saved ? 'text-brand-500' : 'text-[#747686] hover:text-brand-500'}`}>
                <Icon name="bookmark" filled={!!saved} />
              </button>
            </form>
          )}
        </div>
      </div>
      {job.snippet && <p className="mt-3 line-clamp-2 text-sm text-ink/80">{job.snippet}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex min-w-0 items-center gap-1"><Icon name="pin" className="h-4 w-4 shrink-0 text-[#747686]" /><span className="truncate">{location}</span></span>
          {exp && <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-4 w-4 text-[#747686]" />{exp}</span>}
          {salary
            ? <span className="inline-flex items-center gap-1 text-[15px] font-bold text-positive"><Icon name="money" className="h-4 w-4" />{salary}</span>
            : <span className="inline-flex items-center gap-1"><Icon name="money" className="h-4 w-4 text-[#747686]" />Salary not disclosed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {match && <span className="match-pill !py-0.5 !text-xs sm:hidden">{match.score}% match</span>}
          {job.category && <span className="chip">{job.category}</span>}
          {job.employment_type && job.employment_type !== 'Full-time' && <span className="chip">{job.employment_type}</span>}
        </div>
      </div>
    </article>
  );
}
