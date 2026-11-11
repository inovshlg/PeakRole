import { requireUser } from '@/lib/auth';
import { updateProfile } from '@/app/actions';
import Flash from '@/components/Flash';

export const metadata = { title: 'Your profile' };

export default async function ProfilePage({ searchParams }) {
  const sp = await searchParams;
  const u = await requireUser('/profile', 'candidate');
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-4xl">{sp.welcome ? 'Welcome! Set up your profile' : 'Your profile'}</h1>
      <p className="mt-1 text-ink/60">Recruiters see this when your profile is visible. It also improves your job recommendations.</p>
      <form action={updateProfile} className="card mt-8 space-y-5 p-6 sm:p-8">
        <Flash error={sp.error} ok={sp.saved && 'Profile saved.'} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" defaultValue={u.name} className="input" /></div>
          <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" defaultValue={u.location ?? ''} placeholder="e.g. London, UK" className="input" /></div>
        </div>
        <div><label className="label" htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={u.headline ?? ''} placeholder="e.g. Head of Finance · SaaS · 12 years" className="input" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="desired_salary">Desired yearly salary</label><input id="desired_salary" name="desired_salary" inputMode="numeric" defaultValue={u.desired_salary ?? ''} placeholder="120000" className="input" /></div>
          <div><label className="label" htmlFor="years_experience">Years of experience</label><input id="years_experience" name="years_experience" inputMode="numeric" defaultValue={u.years_experience ?? ''} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="skills">Key skills</label><textarea id="skills" name="skills" rows={3} defaultValue={u.skills ?? ''} placeholder="Comma separated" className="input" /></div>
        <div>
          <label className="label" htmlFor="cv">CV / résumé (PDF or Word, max 5 MB)</label>
          {u.cv_name && <p className="mb-2 text-sm">Current: <a href={`/api/cv/${u.id}`} className="text-moss-700 underline">{u.cv_name}</a></p>}
          <input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-moss-50 file:px-4 file:py-2 file:font-semibold file:text-moss-700" />
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-sand-100 p-4 text-sm">
          <input type="checkbox" name="visible_to_recruiters" defaultChecked={!!u.visible_to_recruiters} className="mt-0.5 h-4 w-4 accent-moss-700" />
          <span><b>Let recruiters find me.</b> Your profile and CV are shown to registered employers. Your email is never shown publicly.</span>
        </label>
        <button className="btn-primary">Save profile</button>
      </form>
    </div>
  );
}
