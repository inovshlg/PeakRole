import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { upgrade } from '@/app/actions';
import Flash from '@/components/Flash';

export const metadata = { title: 'Premium' };

const free = ['Search and save unlimited jobs', 'AI reads your CV and ranks your best-fit jobs', 'Match refresh once a day', '5 AI fit checks per day', '1 daily job alert', 'Recruiter-visible profile'];
const premium = ['Everything in Free', 'Unlimited AI fit checks with strengths, gaps & tips', 'Match refreshes every 10 minutes', 'Unlimited job alerts', 'Top placement in recruiter search', 'Priority support'];

export default async function PricingPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const isPremium = user?.plan === 'premium';
  const demo = !process.env.STRIPE_SECRET_KEY && (process.env.NODE_ENV !== 'production' || process.env.DEMO_UPGRADES === '1');
  return (
    <div className="container-x py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl">Invest in your next move</h1>
        <p className="mt-3 text-lg text-ink/60">Searching is always free. Premium helps you get noticed sooner.</p>
      </div>
      {sp.error && <div className="mx-auto mt-6 max-w-xl"><Flash error={sp.error} /></div>}
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-2xl">Free</h2>
          <p className="mt-2 font-display text-4xl">0<span className="text-base text-ink/50"> / forever</span></p>
          <ul className="mt-6 space-y-3 text-sm">{free.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          <Link href={user ? '/jobs' : '/signup'} className="btn-ghost mt-8 w-full">{user ? 'Keep searching' : 'Sign up free'}</Link>
        </div>
        <div className="card relative border-moss-700 bg-moss-900 p-8 text-sand-50">
          <span className="absolute -top-3 right-6 rounded-full bg-clay-500 px-3 py-1 text-xs font-bold uppercase tracking-wide">Most popular</span>
          <h2 className="text-2xl">Premium</h2>
          <p className="mt-2 font-display text-4xl">$29<span className="text-base text-sand-100/60"> / month</span></p>
          <ul className="mt-6 space-y-3 text-sm text-sand-100/90">{premium.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          {isPremium ? (
            <p className="mt-8 rounded-full bg-sand-50/10 py-2.5 text-center text-sm font-semibold">You’re on Premium ✓</p>
          ) : user ? (
            <form action={upgrade}><button className="btn-accent mt-8 w-full">Upgrade to Premium</button></form>
          ) : (
            <Link href="/signup?next=/pricing" className="btn-accent mt-8 w-full">Create account to upgrade</Link>
          )}
          {demo && !isPremium && <p className="mt-3 text-center text-xs text-sand-100/50">Demo mode: no payment is taken until Stripe keys are configured.</p>}
        </div>
      </div>
    </div>
  );
}
