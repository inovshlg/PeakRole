import { SENIORITIES } from '@/lib/jobs.mjs';
import Icon from './Icon';

const LEVEL_LABEL = { Executive: 'CXO / VP (15+ yrs)', Director: 'Director / Head (12+ yrs)', Lead: 'Lead / Architect (8+ yrs)', Senior: 'Senior (5+ yrs)', 'Mid-level': 'Mid-level (3-6 yrs)', Entry: 'Freshers / 0-2 yrs' };
const FIELD = 'flex h-12 items-center gap-2 rounded-lg bg-brand-50 px-3 transition focus-within:bg-white focus-within:shadow-[0_0_0_2px_#1f4fd1]';
const INPUT = 'w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#747686]';

export default function SearchBar({ q = '', location = '', seniority = '', withLevel = false, hidden = {} }) {
  return (
    <form action="/jobs" className={`grid grid-cols-1 gap-2 rounded-xl bg-white p-2 shadow-raised sm:p-3 ${withLevel ? 'md:grid-cols-[5fr_3fr_3fr_auto]' : 'md:grid-cols-[3fr_2fr_auto]'}`}>
      <label className={FIELD}>
        <Icon name="search" className="h-5 w-5 shrink-0 text-[#747686]" />
        <span className="sr-only">Skills, module or company</span>
        <input name="q" defaultValue={q} placeholder="Skills, module or company, e.g. Embedded EWM" className={INPUT} />
      </label>
      {withLevel && (
        <label className={FIELD}>
          <Icon name="briefcase" className="h-5 w-5 shrink-0 text-[#747686]" />
          <span className="sr-only">Experience</span>
          <select name="seniority" defaultValue={seniority} className={`${INPUT} cursor-pointer`}>
            <option value="">All experience levels</option>
            {SENIORITIES.map((s) => <option key={s} value={s}>{LEVEL_LABEL[s]}</option>)}
          </select>
        </label>
      )}
      <label className={FIELD}>
        <Icon name="pin" className="h-5 w-5 shrink-0 text-[#747686]" />
        <span className="sr-only">Location</span>
        <input name="location" defaultValue={location} placeholder="Pune, Bengaluru, Germany, Remote" className={INPUT} />
      </label>
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <button className="btn-primary h-12 gap-2 !px-6"><Icon name="search" className="h-5 w-5" /><span>Search</span></button>
    </form>
  );
}
