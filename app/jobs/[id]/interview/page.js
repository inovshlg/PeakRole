import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { getJob } from '@/lib/jobs.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai.mjs';
import { CV_LIMITS } from '@/lib/cv.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { prepareInterviewAction } from '@/app/network/actions';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Interview preparation' };
export const maxDuration = 300;

export default async function InterviewPrep({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/jobs/${id}/interview`, 'candidate');
  const db = await getDb();
  const job = await getJob(db, id);
  if (!job) notFound();
  const prep = await db.get('SELECT data, created_at FROM interview_preps WHERE user_id = $1 AND job_id = $2', [user.id, job.id]);
  const d = prep?.data;
  const plan = user.plan === 'premium' ? 'premium' : 'free';

  return (
    <div className="container-x max-w-4xl py-8">
      <Link href={`/jobs/${job.id}`} className="text-sm text-ink/60 hover:text-brand-600">← {job.title}</Link>
      <p className="eyebrow mt-4">Interview preparation</p>
      <h1 className="page-title mt-1">{job.title} · {job.company}</h1>
      <div className="mt-4"><Flash error={sp.error} ok={sp.ready && '✦ Your interview prep is ready.'} /></div>

      {!d ? (
        <div className="card mt-6 p-8">
          <h2 className="section-title">Get ready with likely questions and answers built from your CV</h2>
          <p className="mt-2 text-sm text-ink/60">We predict 8–10 questions for this role, explain what each one tests, outline how <b>you</b> should answer using your real experience, and suggest questions to ask them.</p>
          {aiEnabled() ? (
            <form action={prepareInterviewAction} className="mt-5 flex flex-wrap items-center gap-3">
              <input type="hidden" name="jobId" value={job.id} />
              <SubmitButton pendingText="Preparing… (about a minute)">✦ Prepare me for this interview</SubmitButton>
              <span className="text-xs text-ink/50">{CV_LIMITS.interview[plan]} {CV_LIMITS.interview.label}</span>
            </form>
          ) : <p className="mt-4 text-sm text-ink/60">AI features are not enabled on this site yet.</p>}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="card p-6"><h2 className="section-title">What to expect</h2><p className="mt-2 text-ink/80">{d.overview}</p></section>
          <section>
            <h2 className="section-title mb-3">Likely questions</h2>
            <ol className="space-y-3">
              {d.questions.map((q, i) => (
                <li key={i} className="card p-5">
                  <div className="flex items-start justify-between gap-3"><p className="font-semibold">{i + 1}. {q.question}</p><span className="chip-info shrink-0">{q.type}</span></div>
                  <p className="mt-1 text-sm text-ink/55">Assesses: {q.why}</p>
                  <p className="mt-3 rounded-lg bg-canvas-50 p-3 text-sm text-ink/80"><b>How to answer:</b> {q.answer_outline}</p>
                </li>
              ))}
            </ol>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="card p-6"><h2 className="section-title">Questions to ask them</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{d.questions_to_ask.map((q) => <li key={q}>{q}</li>)}</ul></section>
            <section className="card p-6"><h2 className="section-title">Before the interview</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{d.research.map((q) => <li key={q}>{q}</li>)}</ul></section>
          </div>
          <form action={prepareInterviewAction} className="flex items-center gap-3 text-sm text-ink/55">
            <input type="hidden" name="jobId" value={job.id} />
            Prepared {timeAgo(prep.created_at).toLowerCase()}.
            <SubmitButton className="btn-quiet" pendingText="Preparing…">Regenerate</SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
