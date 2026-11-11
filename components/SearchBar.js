export default function SearchBar({ q = '', location = '', dark = false, hidden = {} }) {
  return (
    <form action="/jobs" className={`flex flex-col gap-2 rounded-2xl p-2 sm:flex-row ${dark ? 'bg-white shadow-xl shadow-black/20' : 'border border-ink/10 bg-white'}`}>
      <label className="flex flex-1 items-center gap-2 px-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="sr-only">Job title, skill or company</span>
        <input name="q" defaultValue={q} placeholder="Job title, skill or company" className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink/40" />
      </label>
      <label className="flex flex-1 items-center gap-2 border-ink/10 px-3 sm:border-l">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        <span className="sr-only">Location</span>
        <input name="location" defaultValue={location} placeholder="City or country" className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink/40" />
      </label>
      {Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <button className="btn-primary !rounded-xl">Search jobs</button>
    </form>
  );
}
