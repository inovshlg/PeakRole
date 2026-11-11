import Link from 'next/link';
import { signup } from '@/app/actions';
import Flash from '@/components/Flash';

export const metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams;
  const employer = sp.role === 'employer';
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 grid grid-cols-2 rounded-full bg-sand-100 p-1 text-sm font-medium">
          <Link href="/signup" className={`rounded-full py-2 text-center ${!employer ? 'bg-white shadow-sm' : 'text-ink/60'}`}>I’m looking for a job</Link>
          <Link href="/signup?role=employer" className={`rounded-full py-2 text-center ${employer ? 'bg-white shadow-sm' : 'text-ink/60'}`}>I’m hiring</Link>
        </div>
        <h1 className="text-3xl">{employer ? 'Start hiring' : 'Create your free account'}</h1>
        <p className="mt-1 text-sm text-ink/60">{employer ? 'Post jobs and search candidate profiles.' : 'Save jobs, track applications and get job alerts.'}</p>
        <form action={signup} className="mt-6 space-y-4">
          <Flash error={sp.error} />
          <input type="hidden" name="next" value={sp.next || ''} />
          <input type="hidden" name="role" value={employer ? 'employer' : 'candidate'} />
          <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="input" autoComplete="name" /></div>
          {employer && <div><label className="label" htmlFor="company">Company</label><input id="company" name="company" required className="input" autoComplete="organization" /></div>}
          <div><label className="label" htmlFor="email">{employer ? 'Work email' : 'Email'}</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" placeholder="At least 8 characters" /></div>
          <button className="btn-primary w-full">Create account</button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">Already have an account? <Link href="/login" className="font-semibold text-moss-700">Log in</Link></p>
      </div>
    </div>
  );
}
