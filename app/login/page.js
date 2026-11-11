import Link from 'next/link';
import { login } from '@/app/actions';
import Flash from '@/components/Flash';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">Log in to see saved jobs, applications and alerts.</p>
        <form action={login} className="mt-6 space-y-4">
          <Flash error={sp.error} />
          <input type="hidden" name="next" value={sp.next || ''} />
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required className="input" autoComplete="current-password" /></div>
          <button className="btn-primary w-full">Log in</button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">New here? <Link href={`/signup${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ''}`} className="font-semibold text-brand-700">Create a free account</Link></p>
        <p className="mt-4 rounded-xl bg-canvas-100 p-3 text-xs text-ink/60">Demo logins: <b>candidate@demo.test</b> or <b>employer@demo.test</b>, password <b>demo1234</b></p>
      </div>
    </div>
  );
}
