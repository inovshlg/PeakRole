import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { updateProfile } from '@/app/actions';
import { aiEnabled } from '@/lib/ai.mjs';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { updatePrivacy, deleteAccount } from '@/app/network/actions';
import { CONSENT_TEXT } from '@/lib/consent.mjs';

import { SAP_MODULE_OPTIONS as SAP_MODULES } from '@/lib/niche.mjs';
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days', 'Serving notice'];

// AI calls run in this page's server actions; allow them time to finish.
export const maxDuration = 120;

export const metadata = { title: 'Your profile' };

export default async function ProfilePage({ searchParams }) {
  const sp = await searchParams;
  const u = await requireUser('/profile', 'candidate');
  const cv = u.cv_parsed;
  const ai = aiEnabled();
  const mods = (u.sap_modules || '').split(',').map((s) => s.trim());

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-4xl">{sp.welcome ? 'Welcome! Set up your profile' : 'Your profile'}</h1>
      <p className="mt-1 text-ink/60">
        {ai ? 'Upload your CV and our AI fills in your profile and finds the jobs you fit best.' : 'Recruiters see this when your profile is visible. It also improves your job recommendations.'}
      </p>

      {sp.parsed && (
        <div className="alert-ok mt-6 flex flex-wrap items-center justify-between gap-3">
          <span>We read your CV and filled in the empty fields below. Check them, then see your matches.</span>
          <Link href="/matches" className="btn-primary !py-1.5">See my matches →</Link>
        </div>
      )}

      {cv && (
        <section className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold">What the AI found in your CV</h2>
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
        <div><label className="label" htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={u.headline ?? ''} placeholder="e.g. Senior SAP EWM Consultant · S/4HANA · 8 years" className="input" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="desired_salary">Desired yearly salary (USD equivalent)</label><input id="desired_salary" name="desired_salary" inputMode="numeric" defaultValue={u.desired_salary ?? ''} placeholder="e.g. 60000" className="input" /></div>
          <div><label className="label" htmlFor="years_experience">Years of experience</label><input id="years_experience" name="years_experience" inputMode="numeric" defaultValue={u.years_experience ?? ''} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="skills">Key skills</label><textarea id="skills" name="skills" rows={3} defaultValue={u.skills ?? ''} placeholder="e.g. Inbound/outbound, wave management, RF, MFS, freight orders, charge management" className="input" /></div>
        <fieldset className="space-y-4 rounded-lg bg-brand-50 p-4">
          <legend className="px-1 text-sm font-semibold">SAP experience</legend>
          <div>
            <span className="label">SAP modules</span>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {SAP_MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2"><input type="checkbox" name="sap_modules" value={m} defaultChecked={mods.includes(m)} className="h-4 w-4 accent-brand-500" />{m}</label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-end gap-2 pb-2.5 text-sm"><input type="checkbox" name="s4hana" defaultChecked={!!u.s4hana} className="h-4 w-4 accent-brand-500" /> S/4HANA experience</label>
            <div><label className="label" htmlFor="implementations">Full-cycle implementations</label><input id="implementations" name="implementations" inputMode="numeric" defaultValue={u.implementations ?? ''} className="input" /></div>
            <div><label className="label" htmlFor="phone">Phone (with country code)</label><input id="phone" name="phone" type="tel" defaultValue={u.phone ?? ''} placeholder="+91 98xxx xxxxx" className="input" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="current_salary">Current salary</label><input id="current_salary" name="current_salary" defaultValue={u.current_salary ?? ''} placeholder="e.g. ₹28 LPA or €75k" className="input" /></div>
            <div><label className="label" htmlFor="expected_salary">Expected salary / rate</label><input id="expected_salary" name="expected_salary" defaultValue={u.expected_salary ?? ''} placeholder="e.g. ₹38 LPA or €650/day" className="input" /></div>
            <div><label className="label" htmlFor="notice_period">Notice period</label>
              <select id="notice_period" name="notice_period" defaultValue={u.notice_period ?? ''} className="input"><option value="">Select</option>{NOTICE.map((n) => <option key={n}>{n}</option>)}</select></div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-ink/70">Open to:</span>
            {[['open_relocation', 'Relocation'], ['open_remote', 'Remote'], ['open_contract', 'Contract / freelance']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={!!u[k]} className="h-4 w-4 accent-brand-500" />{l}</label>
            ))}
          </div>
        </fieldset>
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
            <label key={v} className="flex cursor-pointer items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm has-[:checked]:ring-2 has-[:checked]:ring-brand-500">
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
        <label className="flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm">
          <input type="checkbox" name="consent" value="yes" defaultChecked={!!u.consent_at} className="mt-0.5 h-4 w-4 accent-brand-500" />
          <span><b>{CONSENT_TEXT}</b><br /><span className="text-ink/60">{u.consent_at ? `Consent given on ${new Date(u.consent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Untick to withdraw it.` : 'Without consent we cannot put you forward for roles.'}</span></span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="digest" value="yes" defaultChecked={!!u.digest_opt_in} className="h-4 w-4 accent-brand-500" /> Weekly email digest of new SAP EWM/TM jobs
        </label>
        <button className="btn-primary">Save privacy settings</button>
      </form>

      <form action={deleteAccount} className="card mt-6 space-y-3 border-negative/30 p-6 sm:p-8">
        <h2 className="section-title">Delete my account</h2>
        <p className="text-sm text-ink/60">This permanently deletes your profile, CVs, applications, messages and consent record. It cannot be undone.</p>
        <label className="label" htmlFor="confirm_delete">Type DELETE to confirm</label>
        <input id="confirm_delete" name="confirm" className="input max-w-xs" autoComplete="off" />
        <div><button className="btn-danger">Delete my account permanently</button></div>
      </form>
    </div>
  );
}
