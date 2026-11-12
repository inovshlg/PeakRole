import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { CARD_COLS } from '@/lib/jobs.mjs';
import JobCard from '@/components/JobCard';
import Icon from '@/components/Icon';

export const metadata = { title: 'Saved jobs' };

export default async function SavedPage() {
  const user = await requireUser('/saved', 'candidate');
  const saved = await (await getDb()).all(
    `SELECT ${CARD_COLS}, j.status, substr(j.description_text, 1, 200) AS snippet FROM saved_jobs s JOIN jobs j ON j.id = s.job_id
     WHERE s.user_id = $1 ORDER BY (j.status = 'active') DESC, s.created_at DESC`,
    [user.id]
  );
  return (
    <div className="container-x max-w-4xl py-8">
      <h1 className="page-title">Saved jobs</h1>
      <p className="mt-1 text-muted">{saved.length ? `${saved.length} saved job${saved.length === 1 ? '' : 's'}. Tap the bookmark to remove one.` : 'Jobs you bookmark show up here.'}</p>
      {saved.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center p-10 text-center">
          <span className="rounded-full bg-brand-50 p-4 text-brand-500"><Icon name="bookmark" className="h-7 w-7" /></span>
          <p className="mt-4 font-display text-lg font-semibold">No saved jobs yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Tap the bookmark on any job to keep it here and compare later.</p>
          <Link href="/jobs" className="btn-primary mt-5">Browse SAP EWM/TM jobs</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {saved.map((j) => (
            <div key={j.id} className={`relative ${j.status !== 'active' ? 'opacity-60' : ''}`}>
              <JobCard job={j} saved />
              {j.status !== 'active' && <span className="absolute -top-2 left-4 z-10 rounded bg-canvas-200 px-2 py-0.5 text-[11px] font-semibold text-muted">Closed</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
