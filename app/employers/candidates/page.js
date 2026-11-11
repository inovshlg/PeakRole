import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai.mjs';
import { searchCandidates } from '@/lib/recruiting.mjs';
import { SENIORITIES } from '@/lib/jobs.mjs';
import { MARKET } from '@/lib/market.mjs';
import { formatSalary } from '@/lib/format.mjs';
import { unlockCandidate, aiTalentSearch, messageCandidate } from '@/app/network/actions';
import { UNLOCK_COST } from '@/lib/credits.mjs';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import MatchBadge from '@/components/MatchBadge';

export const metadata = { title: 'Find candidates' };
export const maxDuration = 300;

function CandidateCard({ c, match, back }) {
  const titles = Array.isArray(c.target_titles) ? c.target_titles.slice(0, 3) : [];
  return (
    <div id={`c${c.id}`} className="card scroll-mt-24 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{c.unlocked ? c.name : `Candidate #${c.id}`} {c.plan === 'premium' && <span className="chip ml-1 bg-accent-500/10 text-accent-600">Premium</span>}</p>
          <p className="text-sm text-ink/70">{c.headline || c.last_title || 'Profile in progress'}</p>
          <p className="mt-0.5 text-xs text-ink/55">{[c.location, c.seniority, c.years_experience && `${c.years_experience} yrs`, c.desired_salary && `seeks ${formatSalary(c.desired_salary, null, MARKET.currency)}`].filter(Boolean).join(' · ')}</p>
        </div>
        {match && <MatchBadge score={match.score} />}
      </div>
      {match?.reason && <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-ink/80">{match.reason}</p>}
      {c.summary && <p className="mt-2 line-clamp-3 text-sm text-ink/65">{c.summary}</p>}
      {titles.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{titles.map((t) => <span key={t} className="chip-info">{t}</span>)}</div>}
      {c.skills && <p className="mt-2 text-xs text-ink/55">{c.skills.split(',').slice(0, 8).join(' · ')}</p>}
      <div className="mt-4 border-t border-canvas-100 pt-4">
        {c.unlocked ? (
          <div className="space-y-3">
            <p className="text-sm"><a href={`mailto:${c.email}`} className="text-brand-600">{c.email}</a> · <a href={`/api/cv/${c.id}`} className="font-semibold text-brand-600">Download CV</a></p>
            <form action={messageCandidate} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="candidateId" value={c.id} />
              <input type="hidden" name="back" value={back} />
              <input name="body" required minLength={10} className="input" placeholder="Write a message about a role…" aria-label="Message" />
              <SubmitButton className="btn-primary shrink-0" pendingText="Sending…">Message</SubmitButton>
            </form>
          </div>
        ) : (
          <form action={unlockCandidate} className="flex items-center justify-between gap-3">
            <input type="hidden" name="candidateId" value={c.id} />
            <input type="hidden" name="back" value={back} />
            <span className="text-xs text-ink/55">Name, contact & CV hidden</span>
            <SubmitButton className="btn-ghost" pendingText="Unlocking…">Unlock · {UNLOCK_COST} credit</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function FindCandidates({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/employers/candidates', 'employer');
  const db = await getDb();
  const searchId = Number(sp.search) || null;
  const [saved, myJobs] = await Promise.all([
    searchId ? db.get('SELECT * FROM talent_searches WHERE id = $1 AND recruiter_id = $2', [searchId, user.id]) : null,
    db.all("SELECT id, title FROM jobs WHERE posted_by_user_id = $1 AND status = 'active' ORDER BY created_at DESC", [user.id]),
  ]);
  const filters = { q: sp.q || '', location: sp.location || '', level: SENIORITIES.includes(sp.level) ? sp.level : '' };
  const pool = await searchCandidates(db, user, saved ? { limit: 200 } : filters);
  let rows = pool;
  const matchBy = new Map();
  if (saved) {
    for (const m of saved.results) matchBy.set(m.candidate_id, m);
    rows = saved.results.map((m) => pool.find((c) => c.id === m.candidate_id)).filter(Boolean);
  }
  const back = saved ? `/employers/candidates?search=${saved.id}` : `/employers/candidates?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v))}`;

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Talent pool</p><h1 className="page-title mt-1">Find candidates</h1>
          <p className="mt-1 text-ink/60">Profiles are anonymous until you unlock them. Only candidates who chose to be visible are shown.</p></div>
        <p className="text-sm text-ink/60"><b className="text-ink">{user.credits}</b> credits · <Link href="/employers/credits" className="text-brand-600">Buy more</Link></p>
      </div>
      <div className="mt-4"><Flash error={sp.error} ok={sp.unlocked && 'Unlocked. You can now see their details, download their CV and message them.'} /></div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          {aiEnabled() && (
            <form action={aiTalentSearch} className="card space-y-3 p-5">
              <h2 className="section-title">AI talent search</h2>
              <p className="text-sm text-ink/60">Describe the role, or pick one of your jobs, and AI ranks the best-fit candidates.</p>
              {myJobs.length > 0 && (
                <select name="jobId" className="input" aria-label="Use one of your jobs" defaultValue="">
                  <option value="">Describe a role below…</option>
                  {myJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              )}
              <textarea name="role" rows={6} className="input" placeholder={'e.g. CFO for a ₹2,000 Cr D2C brand in Mumbai. IPO readiness, fundraising, 15+ years, CA preferred.'} />
              <SubmitButton className="btn-primary w-full" pendingText="Ranking candidates…">Find best matches</SubmitButton>
            </form>
          )}
          <form className="card space-y-3 p-5">
            <h2 className="section-title">Filter</h2>
            <input name="q" defaultValue={filters.q} className="input" placeholder="Title, skill or industry" aria-label="Keywords" />
            <select name="location" defaultValue={filters.location} className="input" aria-label="City"><option value="">All cities</option>{MARKET.cities.map((c) => <option key={c}>{c}</option>)}</select>
            <select name="level" defaultValue={filters.level} className="input" aria-label="Level"><option value="">All levels</option>{SENIORITIES.map((l) => <option key={l}>{l}</option>)}</select>
            <button className="btn-ghost w-full">Apply filters</button>
          </form>
        </aside>
        <section>
          {saved && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm">
              <span>AI-ranked for: <b>{saved.role_text.split('\n')[0].slice(0, 90)}</b></span>
              <Link href="/employers/candidates" className="text-brand-600">Clear</Link>
            </div>
          )}
          <p className="mb-3 text-sm text-ink/60">{rows.length} candidate{rows.length === 1 ? '' : 's'}</p>
          {rows.length === 0 ? (
            <div className="card p-10 text-center text-sm text-ink/60">No candidates match. Try broader keywords or another city.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {rows.map((c) => <CandidateCard key={c.id} c={c} match={matchBy.get(c.id)} back={back} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
