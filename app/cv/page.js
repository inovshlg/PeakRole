import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai.mjs';
import { CV_LIMITS } from '@/lib/cv.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { createCvWithAi, createBlankCv, deleteCv } from './actions';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'CV Studio' };
export const maxDuration = 300;

export default async function CvStudio({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/cv', 'candidate');
  const db = await getDb();
  const [cvs, file] = await Promise.all([
    db.all(
      `SELECT c.id, c.title, c.kind, c.template, c.updated_at, c.check_result->>'score' AS score, j.id AS job_id, j.status AS job_status
       FROM cvs c LEFT JOIN jobs j ON j.id = c.job_id WHERE c.user_id = $1 ORDER BY c.kind = 'master' DESC, c.updated_at DESC`,
      [user.id]
    ),
    db.get('SELECT filename FROM cv_files WHERE user_id = $1', [user.id]),
  ]);
  const ai = aiEnabled();
  const masters = cvs.filter((c) => c.kind === 'master');
  const tailored = cvs.filter((c) => c.kind === 'tailored');
  const plan = user.plan === 'premium' ? 'premium' : 'free';

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">CV Studio</h1>
      <p className="mt-1 max-w-2xl text-ink/60">
        Build a professional CV, tailor it to each job in one click with a matching cover letter, and download polished PDFs.
      </p>
      <div className="mt-6 space-y-3">
        <Flash error={sp.error} ok={sp.deleted && 'CV deleted.'} />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl">{masters.length ? 'Create another CV' : 'Create your CV'}</h2>
          {ai ? (
            <form action={createCvWithAi} className="mt-4 space-y-4">
              <p className="text-sm text-ink/70">
                {file
                  ? <>We’ll rewrite <b>{file.filename}</b> into a polished, achievement-focused CV.</>
                  : <>No CV uploaded yet. <Link href="/profile" className="font-semibold text-brand-700">Upload your current CV</Link> for the best result, or describe your experience below.</>}
              </p>
              <div>
                <label className="label" htmlFor="notes">Anything to add or emphasise? (optional)</label>
                <textarea id="notes" name="notes" rows={4} maxLength={6000} className="input"
                  placeholder={'e.g. Promoted to Director in 2023. Led the ₹120 Cr cost-reduction programme. Looking for VP Operations roles in Bengaluru.'} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton pendingText="Writing your CV… (about 30–60 seconds)">✦ Build my CV with AI</SubmitButton>
                <span className="text-xs text-ink/50">{CV_LIMITS.generate[plan]} {CV_LIMITS.generate.label}</span>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-ink/60">AI writing isn’t enabled on this site yet, so you can start from a template.</p>
          )}
          <form action={createBlankCv} className="mt-4 border-t border-ink/10 pt-4">
            <SubmitButton className="btn-ghost" pendingText="Creating…">Start from scratch</SubmitButton>
          </form>
        </div>

        <aside className="card bg-brand-900 p-6 text-canvas-50">
          <h3 className="text-xl">How it works</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-canvas-100/80">
            <li>Build your main CV once, with AI or by hand.</li>
            <li>On any job, click <b>Tailor my CV</b>. AI reorders and rewrites it for that role (without inventing anything) and writes a cover letter.</li>
            <li>Run a <b>CV check</b> to get a score and concrete fixes.</li>
            <li>Download PDFs in Modern, Classic or Compact style.</li>
          </ol>
          <p className="mt-4 text-xs text-canvas-100/60">
            {plan === 'premium' ? 'Premium' : 'Free'}: {CV_LIMITS.tailor[plan]} {CV_LIMITS.tailor.label}, {CV_LIMITS.check[plan]} {CV_LIMITS.check.label}.
            {plan !== 'premium' && <> <Link href="/pricing" className="underline">Get more with Premium</Link></>}
          </p>
        </aside>
      </section>

      {[['Your CVs', masters, 'Your main CVs appear here.'], ['Tailored for jobs', tailored, 'Open a job and click “Tailor my CV for this job”.']].map(([title, rows, empty]) => (
        <section key={title} className="mt-10">
          <h2 className="mb-4 text-2xl">{title}</h2>
          {rows.length === 0 ? (
            <p className="card p-6 text-sm text-ink/60">{empty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rows.map((c) => (
                <div key={c.id} className="card flex items-center gap-4 p-5">
                  <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md border border-ink/10 bg-canvas-50 text-[10px] font-semibold uppercase text-ink/50">{c.template.slice(0, 3)}</div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/cv/${c.id}`} className="block truncate font-semibold hover:text-brand-700">{c.title}</Link>
                    <p className="text-sm text-ink/55">
                      Updated {timeAgo(c.updated_at).toLowerCase()}
                      {c.score && <> · CV score <b className="text-ink">{c.score}</b></>}
                      {c.job_id && <> · <Link href={`/jobs/${c.job_id}`} className="underline">{c.job_status === 'active' ? 'view job' : 'job closed'}</Link></>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <a href={`/api/cvs/${c.id}/pdf?download=1`} className="font-semibold text-brand-700">PDF</a>
                    <form action={deleteCv}><input type="hidden" name="id" value={c.id} /><button className="text-ink/40 hover:text-accent-600" aria-label={`Delete ${c.title}`}>Delete</button></form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
