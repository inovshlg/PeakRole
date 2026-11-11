import { SENIORITIES } from '@/lib/jobs.mjs';

const LEVEL_LABEL = { Executive: 'CXO / VP (15+ yrs)', Director: 'Director / Head (12+ yrs)', Lead: 'Manager / Lead (8+ yrs)', Senior: 'Senior (5+ yrs)', 'Mid-level': 'Mid-level (3-6 yrs)', Entry: 'Entry (0-2 yrs)' };

export default function SearchBar({ q = '', location = '', seniority = '', withLevel = false, hidden = {} }) {
  const field = 'w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink/45';
  return (
    <form action="/jobs" className="flex flex-col gap-2 rounded-2xl border border-canvas-200 bg-white p-2 shadow-raised sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
      <label className="flex flex-[1.4] items-center gap-2 px-3 sm:px-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink/40" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="sr-only">Skills, designation or company</span>
        <input name="q" defaultValue={q} placeholder="Skills, designation, company" className={field} />
      </label>
      {withLevel && (
        <label className="flex flex-1 items-center border-canvas-200 px-3 sm:border-l">
          <span className="sr-only">Experience</span>
          <select name="seniority" defaultValue={seniority} className={`${field} cursor-pointer`}>
            <option value="">Experience</option>
            {SENIORITIES.map((s) => <option key={s} value={s}>{LEVEL_LABEL[s]}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-1 items-center gap-2 border-canvas-200 px-3 sm:border-l">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink/40" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        <span className="sr-only">Location</span>
        <input name="location" defaultValue={location} placeholder="City, e.g. Bengaluru" className={field} />
      </label>
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <button className="btn-primary !rounded-full !px-7 !py-3">Search</button>
    </form>
  );
}
