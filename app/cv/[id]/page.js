import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai.mjs';
import { TEMPLATES, normalizeCv } from '@/lib/cv.mjs';
import { timeAgo } from '@/lib/format.mjs';
import { saveCv, runCvCheck } from '../actions';
import CvEditor from '@/components/cv/CvEditor';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { matchTone } from '@/components/MatchBadge';

export const metadata = { title: 'Edit CV' };
export const maxDuration = 300;

export default async function CvPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/cv/${id}`, 'candidate');
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const db = await getDb();
  const row = await db.get(
    `SELECT c.*, j.title AS job_title, j.company AS job_company, j.status AS job_status
     FROM cvs c LEFT JOIN jobs j ON j.id = c.job_id WHERE c.id = $1 AND c.user_id = $2`,
    [n, user.id]
  );
  if (!row) notFound();
  const cv = normalizeCv(row.data);
  const check = row.check_result;
  const notes = row.notes || {};
  const version = new Date(row.updated_at).getTime();
  const pdf = `/api/cvs/${row.id}/pdf`;

  return (
    <div className="container-x py-8">
      <Link href="/cv" className="text-sm text-ink/60 hover:text-ink">← CV Studio</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">{row.title}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {row.kind === 'tailored' && row.job_id
              ? <>Tailored for <Link href={`/jobs/${row.job_id}`} className="font-medium text-brand-700 underline">{row.job_title} at {row.job_company}</Link>{row.job_status !== 'active' && ' (closed)'} · </>
              : 'Main CV · '}
            saved {timeAgo(row.updated_at).toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${pdf}?download=1`} className="btn-primary">Download CV (PDF)</a>
          {row.cover_letter && <a href={`${pdf}?doc=letter&download=1`} className="btn-ghost">Cover letter (PDF)</a>}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Flash
          error={sp.error}
          ok={(sp.saved && 'Saved. The preview has been updated.') || (sp.created && 'Your CV is ready. Review every line, then download it.') || (sp.tailored && 'Tailored CV and cover letter ready. Check them before you apply.') || (sp.checked && 'CV check complete. See the results on the right.')}
        />
      </div>

      {row.kind === 'tailored' && (notes.changes?.length > 0 || notes.missing?.length > 0) && (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {notes.changes?.length > 0 && (
            <div className="rounded-2xl border border-brand-500/30 bg-brand-50 p-5">
              <h2 className="font-sans text-sm font-semibold">What we changed for this job</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink/80">{notes.changes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {notes.missing?.length > 0 && (
            <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-5">
              <h2 className="font-sans text-sm font-semibold">Requirements your CV doesn’t show yet</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink/80">{notes.missing.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="mt-2 text-xs text-ink/55">If you do have this experience, add it in the editor. We never add things you haven’t told us.</p>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CvEditor
          key={version}
          id={row.id}
          title={row.title}
          template={row.template}
          cv={cv}
          coverLetter={row.kind === 'tailored' ? row.cover_letter ?? '' : null}
          templates={TEMPLATES}
          action={saveCv}
        />

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5 text-sm">
              <span className="font-semibold">Preview · {TEMPLATES.find((t) => t.id === row.template)?.name}</span>
              <a href={pdf} target="_blank" rel="noopener" className="text-brand-700">Open full size ↗</a>
            </div>
            <iframe src={`${pdf}?v=${version}#view=FitH`} title="CV preview" className="hidden h-[78vh] w-full bg-canvas-100 sm:block" />
            <p className="p-4 text-sm text-ink/60 sm:hidden">Tap <b>Open full size</b> to preview your CV.</p>
          </div>

          {aiEnabled() && (
            <div id="check" className="card scroll-mt-24 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-sans text-base font-semibold">CV check{row.job_id ? ' for this job' : ''}</h2>
                {check && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${matchTone(check.score)}`}>{check.score}/100</span>}
              </div>
              {check ? (
                <div className="mt-3 space-y-4 text-sm">
                  <p className="text-ink/80">{check.verdict}</p>
                  {check.strengths?.length > 0 && (
                    <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Strengths</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-4">{check.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
                  )}
                  {check.improvements?.length > 0 && (
                    <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Improve</h3>
                      <ol className="mt-1 space-y-2">{check.improvements.map((i, k) => (
                        <li key={k} className="rounded-lg bg-canvas-100 p-3"><b>{i.section}:</b> {i.issue}<br /><span className="text-ink/70">→ {i.suggestion}</span></li>
                      ))}</ol></div>
                  )}
                  {check.ats_issues?.length > 0 && (
                    <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Applicant-tracking (ATS) issues</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-4">{check.ats_issues.map((s) => <li key={s}>{s}</li>)}</ul></div>
                  )}
                  <p className="text-xs text-ink/45">Checked {timeAgo(row.checked_at).toLowerCase()}. Save your edits and check again to see your new score.</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink/60">Get a score, your strengths, and concrete fixes{row.job_id ? ' against this job’s requirements' : ''}.</p>
              )}
              <form action={runCvCheck} className="mt-4">
                <input type="hidden" name="id" value={row.id} />
                <SubmitButton className="btn-ghost w-full" pendingText="Reviewing your CV…">{check ? 'Check again' : 'Check my CV'}</SubmitButton>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
