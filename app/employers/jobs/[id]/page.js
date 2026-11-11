import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai.mjs';
import { timeAgo, initials } from '@/lib/format.mjs';
import { setApplicantStage, scoreApplicants } from '@/app/network/actions';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import MatchBadge from '@/components/MatchBadge';

export const metadata = { title: 'Applicants' };
export const maxDuration = 300;

const STAGES = [['new', 'New'], ['screening', 'Screening'], ['interview', 'Interview'], ['offer', 'Offer'], ['hired', 'Hired'], ['rejected', 'Not selected']];

export default async function Pipeline({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/employers/jobs/${id}`, 'employer');
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const db = await getDb();
  const job = await db.get('SELECT * FROM jobs WHERE id = $1 AND posted_by_user_id = $2', [n, user.id]);
  if (!job) notFound();
  const applicants = await db.all(
    `SELECT a.stage, a.ai_score, a.ai_reason, a.created_at, a.cv_id, u.id, u.name, u.email, u.headline, u.location, u.years_experience,
            (SELECT c.id FROM conversations c WHERE c.recruiter_id = $2 AND c.candidate_id = u.id) AS conversation_id
     FROM applications a JOIN users u ON u.id = a.user_id WHERE a.job_id = $1
     ORDER BY a.ai_score DESC NULLS LAST, a.created_at DESC`,
    [n, user.id]
  );
  const counts = Object.fromEntries(STAGES.map(([s]) => [s, applicants.filter((a) => a.stage === s).length]));

  return (
    <div className="container-x py-8">
      <Link href="/employers" className="text-sm text-ink/60 hover:text-brand-600">← Dashboard</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Applicants</p>
          <h1 className="page-title mt-1">{job.title}</h1>
          <p className="text-sm text-ink/60">{job.location} · {applicants.length} applicant{applicants.length === 1 ? '' : 's'} · <Link href={`/jobs/${job.id}`} className="text-brand-600">View listing</Link></p>
        </div>
        {aiEnabled() && applicants.length > 0 && (
          <form action={scoreApplicants}><input type="hidden" name="jobId" value={job.id} />
            <SubmitButton pendingText="Scoring applicants…">Score applicants with AI</SubmitButton></form>
        )}
      </div>
      <div className="mt-4"><Flash error={sp.error} ok={sp.scored && 'Applicants scored and sorted by fit.'} /></div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 text-sm">
        {STAGES.map(([s, label]) => <span key={s} className="chip whitespace-nowrap px-3 py-1.5">{label} <b className="ml-1 text-ink">{counts[s]}</b></span>)}
      </div>

      {applicants.length === 0 ? (
        <div className="card mt-4 p-10 text-center text-sm text-ink/60">No applicants yet. <Link href="/employers/candidates" className="font-semibold text-brand-600">Search the talent pool</Link> to find candidates proactively.</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {applicants.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{initials(a.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{a.name}</p>
                    {a.ai_score != null && <MatchBadge score={a.ai_score} />}
                  </div>
                  <p className="text-sm text-ink/70">{a.headline}</p>
                  <p className="text-xs text-ink/50">{[a.location, a.years_experience && `${a.years_experience} yrs`, `applied ${timeAgo(a.created_at).toLowerCase()}`].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              {a.ai_reason && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-ink/80">{a.ai_reason}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-canvas-100 pt-4 text-sm">
                <a href={`/api/cv/${a.id}?job=${job.id}`} className="font-semibold text-brand-600">{a.cv_id ? 'Tailored CV' : 'CV'} ↓</a>
                <a href={`mailto:${a.email}`} className="text-brand-600">Email</a>
                {a.conversation_id && <Link href={`/messages/${a.conversation_id}`} className="text-brand-600">Messages</Link>}
                <form action={setApplicantStage} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="candidateId" value={a.id} />
                  <label className="sr-only" htmlFor={`stage-${a.id}`}>Stage</label>
                  <select id={`stage-${a.id}`} name="stage" defaultValue={a.stage} className="input !w-auto !py-1.5">{STAGES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>
                  <button className="btn-ghost !py-1.5">Move</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
