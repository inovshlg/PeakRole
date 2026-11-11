import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { CARD_COLS } from '@/lib/jobs.mjs';
import { aiEnabled, matchProfile, profileIsUsable } from '@/lib/ai.mjs';
import { refreshWaitMinutes } from '@/lib/matching.mjs';
import { refreshMyMatches } from '@/app/actions';
import { timeAgo } from '@/lib/format.mjs';
import JobCard from '@/components/JobCard';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

// AI calls run in this page's server actions; allow them time to finish.
export const maxDuration = 120;

export const metadata = { title: 'My matches' };

export default async function MatchesPage({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/matches', 'candidate');
  const db = await getDb();
  const matches = await db.all(
    `SELECT ${CARD_COLS}, substr(j.description_text, 1, 220) AS snippet, m.score, m.reason, m.ai, m.detailed
     FROM job_matches m JOIN jobs j ON j.id = m.job_id
     WHERE m.user_id = $1 AND j.status = 'active' ORDER BY m.score DESC, j.posted_at DESC LIMIT 30`,
    [user.id]
  );
  const ai = aiEnabled();
  const ready = profileIsUsable(matchProfile(user));
  const wait = refreshWaitMinutes(user);

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Your matches</h1>
          <p className="mt-1 max-w-xl text-ink/60">
            {ai
              ? 'Our AI reads your CV and each open role, then ranks jobs by how well they fit your experience, level, location and salary.'
              : 'Jobs ranked by how well they match your target titles, skills, seniority and location.'}
          </p>
        </div>
        {ready && (
          <form action={refreshMyMatches} className="text-right">
            <SubmitButton disabled={wait > 0} pendingText={ai ? 'AI is ranking jobs… (up to a minute)' : 'Finding matches…'}>
              ✦ {user.matches_refreshed_at ? 'Refresh matches' : 'Find my matches'}
            </SubmitButton>
            {user.matches_refreshed_at && (
              <p className="mt-1.5 text-xs text-ink/50">
                Updated {timeAgo(user.matches_refreshed_at).toLowerCase()}
                {wait > 0 && ` · next refresh in ${wait >= 60 ? `${Math.ceil(wait / 60)} h` : `${wait} min`}`}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <Flash error={sp.error} ok={sp.refreshed && `Found your top ${matches.length} matches.`} />
        {wait > 0 && user.plan !== 'premium' && (
          <p className="text-sm text-ink/60">Free accounts refresh matches once a day. <Link href="/pricing" className="font-semibold text-clay-600">Premium refreshes every 10 minutes →</Link></p>
        )}
      </div>

      {!ready ? (
        <div className="card mt-8 p-10 text-center">
          <p className="font-display text-2xl">Tell us about yourself first</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">Upload your CV and we’ll work out the roles you’re a strong fit for. You can also just add a headline and your skills.</p>
          <Link href="/profile" className="btn-primary mt-6">Upload my CV</Link>
        </div>
      ) : matches.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="font-display text-2xl">Ready when you are</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">Press “Find my matches” and we’ll score the open roles against your profile.</p>
        </div>
      ) : (
        <ol className="mt-8 space-y-4">
          {matches.map((j, i) => (
            <li key={j.id}>
              <JobCard job={j} match={j} />
              <p className="mt-1.5 px-2 text-sm text-ink/65">
                <span className="mr-1 font-semibold text-ink/40">#{i + 1}</span> {j.reason}
                {!j.detailed && ai && <> · <Link href={`/jobs/${j.id}#fit`} className="font-medium text-moss-700 hover:underline">Full fit report</Link></>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
