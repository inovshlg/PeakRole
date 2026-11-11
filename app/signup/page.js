import Link from 'next/link';
import { signup } from '@/app/actions';
import Flash from '@/components/Flash';
import SpamGuard from '@/components/SpamGuard';

export const metadata = { title: 'Create your profile' };

import { CONSENT_TEXT } from '@/lib/consent.mjs';

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-lg p-8">
        <h1 className="page-title">Create your free profile</h1>
        <p className="mt-1 text-sm text-ink/60">For SAP EWM and SAP TM consultants. Apply to jobs, get matched to roles and hear about openings before they’re advertised.</p>
        <form action={signup} className="mt-6 space-y-4">
          <Flash error={sp.error} />
          <SpamGuard />
          <input type="hidden" name="next" value={sp.next || ''} />
          <input type="hidden" name="role" value="candidate" />
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="input" autoComplete="name" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" placeholder="At least 8 characters" /></div>
          <label className="flex items-start gap-3 rounded-lg border border-canvas-200 p-3 text-sm">
            <input type="checkbox" name="consent" value="yes" required className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span><b>{CONSENT_TEXT}</b> <span className="text-ink/60">You can withdraw consent, edit or delete your profile at any time. See our <Link href="/privacy" className="text-brand-600 underline">privacy notice</Link>.</span></span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="digest" value="yes" defaultChecked className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span>Email me a weekly digest of new SAP EWM/TM jobs</span>
          </label>
          <button className="btn-primary w-full">Create profile</button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">Already registered? <Link href="/login" className="font-semibold text-brand-600">Log in</Link></p>
        <p className="mt-2 text-center text-xs text-ink/50">Hiring? <Link href="/employers" className="text-brand-600">Tell us what you need</Link></p>
      </div>
    </div>
  );
}
