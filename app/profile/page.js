import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { updateProfile } from '@/app/actions';
import { aiEnabled } from '@/lib/ai.mjs';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { updatePrivacy } from '@/app/network/actions';

// AI calls run in this page's server actions; allow them time to finish.
export const maxDuration = 120;

export const metadata = { title: 'Your profile' };

export default async function ProfilePage({ searchParams }) {
  const sp = await searchParams;
  const u = await requireUser('/profile', 'candidate');
  const cv = u.cv_parsed;
  const ai = aiEnabled();

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-4xl">{sp.welcome ? 'Welcome! Set up your profile' : 'Your profile'}</h1>
      <p className="mt-1 text-ink/60">
        {ai ? 'Upload your CV and our AI fills in your profile and finds the jobs you fit best.' : 'Recruiters see this when your profile is visible. It also improves your job recommendations.'}
      </p>

      {sp.parsed && (
        <div className="alert-ok mt-6 flex flex-wrap items-center justify-between gap-3">
          <span>✦ We read your CV and filled in the empty fields below. Check them, then see your matches.</span>
          <Link href="/matches" className="btn-primary !py-1.5">See my matches →</Link>
        </div>
      )}

      {cv && (
        <section className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold">✦ What the AI found in your CV</h2>
            <span className="text-xs text-ink/50">{u.cv_name}</span>
          </div>
          <p className="mt-2 text-sm text-ink/75">{cv.summary}</p>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-ink/50">Level</dt><dd className="font-medium">{cv.seniority}{cv.years_experience ? ` · ${cv.years_experience} years` : ''}</dd></div>
            <div><dt className="text-ink/50">Industries</dt><dd className="font-medium">{cv.industries.join(', ') || '–'}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-ink/50">Roles you’re a strong fit for</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">{cv.target_titles.map((t) => <span key={t} className="chip !bg-brand-50 !text-brand-700">{t}</span>)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink/50">Skills</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">{cv.skills.map((t) => <span key={t} className="chip">{t}</span>)}</dd>
            </div>
          </dl>
          {cv.experience.length > 0 && (
            <ol className="mt-5 space-y-3 border-l-2 border-brand-100 pl-4 text-sm">
              {cv.experience.map((e, i) => (
                <li key={i}>
                  <p className="font-medium">{e.title} · {e.company} <span className="font-normal text-ink/50">{e.start} – {e.end}</span></p>
                  <p className="text-ink/65">{e.highlight}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <form action={updateProfile} className="card mt-6 space-y-5 p-6 sm:p-8">
        <Flash error={sp.error} ok={sp.saved && !sp.error && 'Profile saved.'} />
        <div>
          <label className="label" htmlFor="cv">CV / résumé {ai ? '(PDF or .docx, which the AI can read)' : '(PDF or Word)'}, max 4 MB</label>
          {u.cv_name && <p className="mb-2 text-sm">Current: <a href={`/api/cv/${u.id}`} className="text-brand-700 underline">{u.cv_name}</a></p>}
          <input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" defaultValue={u.name} className="input" /></div>
          <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" defaultValue={u.location ?? ''} placeholder="e.g. Bengaluru, India" className="input" /></div>
        </div>
        <div><label className="label" htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={u.headline ?? ''} placeholder="e.g. Head of Finance · SaaS · 12 years" className="input" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="desired_salary">Desired yearly salary (₹ CTC)</label><input id="desired_salary" name="desired_salary" inputMode="numeric" defaultValue={u.desired_salary ?? ''} placeholder="e.g. 3500000 for ₹35 L" className="input" /></div>
          <div><label className="label" htmlFor="years_experience">Years of experience</label><input id="years_experience" name="years_experience" inputMode="numeric" defaultValue={u.years_experience ?? ''} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="skills">Key skills</label><textarea id="skills" name="skills" rows={3} defaultValue={u.skills ?? ''} placeholder="Comma separated" className="input" /></div>
        <SubmitButton pendingText={ai ? 'Saving & reading your CV…' : 'Saving…'}>Save profile</SubmitButton>
      </form>

      <form id="privacy" action={updatePrivacy} className="card mt-6 scroll-mt-20 space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="section-title">Privacy: who can find you</h2>
          <p className="mt-1 text-sm text-ink/60">Recruiters see an anonymous summary first. Your name, contact details and CV are only shown when a recruiter unlocks your profile, or when you apply or message them.</p>
        </div>
        <Flash ok={sp.privacy && 'Privacy settings saved.'} />
        {[
          ['all', 'Visible to all recruiters', 'Employers and headhunters can find you. Recommended while you’re actively looking.'],
          ['headhunters', 'Headhunters only', 'Only executive search consultants can find you, not employers directly.'],
          ['hidden', 'Hidden', 'Nobody can find you. You can still apply and message headhunters yourself.'],
        ].map(([v, title, text]) => {
          const current = !u.visible_to_recruiters ? 'hidden' : u.visibility === 'headhunters' ? 'headhunters' : 'all';
          return (
            <label key={v} className="flex cursor-pointer items-start gap-3 rounded-lg border border-canvas-200 p-4 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="visibility" value={v} defaultChecked={current === v} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span><b>{title}</b><br /><span className="text-ink/60">{text}</span></span>
            </label>
          );
        })}
        <div>
          <label className="label" htmlFor="blocked_companies">Hide my profile from these companies (comma separated)</label>
          <input id="blocked_companies" name="blocked_companies" defaultValue={u.blocked_companies ?? ''} className="input" placeholder="e.g. your current employer" />
          <p className="mt-1 text-xs text-ink/50">Recruiters from these companies won’t see you in search, even anonymously.</p>
        </div>
        <button className="btn-primary">Save privacy settings</button>
      </form>
    </div>
  );
}
