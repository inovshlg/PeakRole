import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { updateRecruiterProfile } from '@/app/network/actions';
import { SENIORITIES } from '@/lib/jobs.mjs';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Recruiter profile' };

export default async function RecruiterProfile({ searchParams }) {
  const sp = await searchParams;
  const u = await requireUser('/employers/profile', 'employer');
  const hh = u.recruiter_type === 'headhunter';
  const levels = (u.levels || '').split(',').map((s) => s.trim());
  return (
    <div className="container-x max-w-3xl py-8">
      <p className="eyebrow">{hh ? 'Headhunter' : 'Employer'}</p>
      <h1 className="page-title mt-1">{sp.welcome ? 'Welcome! Set up your profile' : hh ? 'Your headhunter profile' : 'Your company profile'}</h1>
      <p className="mt-1 text-ink/60">{hh ? 'Candidates find you in the headhunter directory and message you directly.' : 'Shown on your company page and job listings.'}</p>
      {hh && <Link href={`/headhunters/${u.id}`} className="btn-quiet mt-2 !px-0">View your public profile →</Link>}

      <form action={updateRecruiterProfile} className="card mt-6 space-y-5 p-6 sm:p-8">
        <Flash ok={sp.saved && 'Profile saved.'} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Your name</label><input id="name" name="name" defaultValue={u.name} className="input" /></div>
          <div><label className="label" htmlFor="company">{hh ? 'Firm / agency' : 'Company'}</label><input id="company" name="company" defaultValue={u.company ?? ''} className="input" /></div>
        </div>
        {hh ? (
          <>
            <div><label className="label" htmlFor="bio">About you</label><textarea id="bio" name="bio" rows={5} maxLength={2000} defaultValue={u.bio ?? ''} className="input" placeholder="e.g. 12 years in executive search for BFSI and fintech leadership roles across Mumbai and Bengaluru…" /></div>
            <div><label className="label" htmlFor="specialisms">Specialisms (comma separated)</label><input id="specialisms" name="specialisms" defaultValue={u.specialisms ?? ''} className="input" placeholder="Fintech, Banking, CFO search, Technology leadership" /></div>
            <div><label className="label" htmlFor="regions">Cities / regions you cover</label><input id="regions" name="regions" defaultValue={u.regions ?? ''} className="input" placeholder="Mumbai, Bengaluru, Delhi NCR" /></div>
            <fieldset>
              <legend className="label">Levels you recruit for</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {SENIORITIES.slice(0, 4).map((l) => (
                  <label key={l} className="flex items-center gap-2"><input type="checkbox" name="levels" value={l} defaultChecked={levels.includes(l)} className="h-4 w-4 accent-brand-500" />{l}</label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className="label" htmlFor="years_recruiting">Years recruiting</label><input id="years_recruiting" name="years_recruiting" inputMode="numeric" defaultValue={u.years_recruiting ?? ''} className="input" /></div>
              <div><label className="label" htmlFor="placements">Senior placements made</label><input id="placements" name="placements" inputMode="numeric" defaultValue={u.placements ?? ''} className="input" /></div>
            </div>
            <div><label className="label" htmlFor="linkedin_url">LinkedIn URL</label><input id="linkedin_url" name="linkedin_url" defaultValue={u.linkedin_url ?? ''} className="input" placeholder="https://www.linkedin.com/in/…" /></div>
          </>
        ) : (
          <>
            <div><label className="label" htmlFor="company_about">About the company</label><textarea id="company_about" name="company_about" rows={5} maxLength={3000} defaultValue={u.company_about ?? ''} className="input" /></div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div><label className="label" htmlFor="company_website">Website</label><input id="company_website" name="company_website" defaultValue={u.company_website ?? ''} className="input" placeholder="example.com" /></div>
              <div><label className="label" htmlFor="company_industry">Industry</label><input id="company_industry" name="company_industry" defaultValue={u.company_industry ?? ''} className="input" /></div>
              <div><label className="label" htmlFor="company_size">Employees</label>
                <select id="company_size" name="company_size" defaultValue={u.company_size ?? ''} className="input"><option value="">–</option>{['1–50', '51–200', '201–1,000', '1,001–5,000', '5,000+'].map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <input type="hidden" name="linkedin_url" value={u.linkedin_url ?? ''} />
          </>
        )}
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
      </form>
    </div>
  );
}
