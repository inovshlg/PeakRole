import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { buyCredits } from '@/app/network/actions';
import { CREDIT_PACKS, UNLOCK_COST, FEATURE_COST, FEATURE_DAYS } from '@/lib/credits.mjs';
import { timeAgo } from '@/lib/format.mjs';
import Flash from '@/components/Flash';

export const metadata = { title: 'Credits' };

export default async function Credits({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/employers/credits', 'employer');
  const ledger = await (await getDb()).all('SELECT delta, reason, created_at FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [user.id]);
  const demo = process.env.NODE_ENV !== 'production' || process.env.DEMO_UPGRADES === '1';
  return (
    <div className="container-x max-w-5xl py-8">
      <p className="eyebrow">Recruiter credits</p>
      <h1 className="page-title mt-1">You have {user.credits} credit{user.credits === 1 ? '' : 's'}</h1>
      <p className="mt-1 text-ink/60">Unlocking a candidate’s full profile, CV and messaging costs {UNLOCK_COST} credit. Featuring a job for {FEATURE_DAYS} days costs {FEATURE_COST}.</p>
      <div className="mt-5"><Flash error={sp.error} ok={sp.added && `${sp.added} credits added.`} /></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((p, i) => (
          <form key={p.id} action={buyCredits} className={`card flex flex-col p-6 ${i === 1 ? 'ring-2 ring-brand-500' : ''}`}>
            <input type="hidden" name="pack" value={p.id} />
            <p className="text-sm text-ink/60">{p.note}</p>
            <p className="mt-2 text-3xl font-semibold">{p.credits} credits</p>
            <p className="mt-1 text-lg text-ink/80">{p.price} <span className="text-xs text-ink/50">+ GST</span></p>
            <button className={`${i === 1 ? 'btn-primary' : 'btn-ghost'} mt-6`}>{demo ? 'Add (demo, free)' : 'Buy credits'}</button>
          </form>
        ))}
      </div>
      {demo && <p className="mt-3 text-xs text-ink/50">Demo mode: credits are added free until online payments (Razorpay) are connected.</p>}
      <h2 className="section-title mt-10">History</h2>
      <ul className="card mt-3 divide-y divide-canvas-100 text-sm">
        {ledger.length === 0 && <li className="p-4 text-ink/55">No credit activity yet.</li>}
        {ledger.map((l, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-5 py-3">
            <span>{l.reason}</span>
            <span className="flex items-center gap-4"><span className="text-xs text-ink/45">{timeAgo(l.created_at)}</span><b className={l.delta > 0 ? 'text-positive' : 'text-ink'}>{l.delta > 0 ? '+' : ''}{l.delta}</b></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
