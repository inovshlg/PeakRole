import Link from 'next/link';
import { signup } from '@/app/actions';
import Flash from '@/components/Flash';
import { STARTER_CREDITS } from '@/lib/credits.mjs';

export const metadata = { title: 'Create account' };

const ROLES = [
  ['candidate', 'Job seeker', 'Find roles, tailor your CV, talk to headhunters'],
  ['employer', 'Employer', 'Hire for your own company'],
  ['headhunter', 'Headhunter', 'Executive search & recruitment agencies'],
];

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams;
  const role = ROLES.some(([r]) => r === sp.role) ? sp.role : 'candidate';
  const recruiter = role !== 'candidate';
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-lg p-8">
        <h1 className="page-title">Create your free account</h1>
        <p className="mt-1 text-sm text-ink/60">Choose how you’ll use PeakRole.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {ROLES.map(([r, title, text]) => (
            <Link key={r} href={`/signup?role=${r}${sp.next ? `&next=${encodeURIComponent(sp.next)}` : ''}`}
              className={`rounded-lg border p-3 text-sm transition ${role === r ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-canvas-200 hover:border-brand-200'}`}>
              <span className="block font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs text-ink/55">{text}</span>
            </Link>
          ))}
        </div>
        <form action={signup} className="mt-6 space-y-4">
          <Flash error={sp.error} />
          <input type="hidden" name="next" value={sp.next || ''} />
          <input type="hidden" name="role" value={role} />
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="input" autoComplete="name" /></div>
          {recruiter && (
            <div>
              <label className="label" htmlFor="company">{role === 'headhunter' ? 'Search firm / agency name' : 'Company'}</label>
              <input id="company" name="company" required className="input" autoComplete="organization" placeholder={role === 'headhunter' ? 'e.g. Independent, or your firm' : ''} />
            </div>
          )}
          <div><label className="label" htmlFor="email">{recruiter ? 'Work email' : 'Email'}</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" placeholder="At least 8 characters" /></div>
          <button className="btn-primary w-full">Create account</button>
          {recruiter && <p className="text-center text-xs text-ink/55">Includes {STARTER_CREDITS} free credits to unlock candidate profiles.</p>}
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">Already have an account? <Link href="/login" className="font-semibold text-brand-600">Log in</Link></p>
      </div>
    </div>
  );
}
