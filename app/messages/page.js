import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { listConversations } from '@/lib/messaging.mjs';
import { initials, timeAgo } from '@/lib/format.mjs';

export const metadata = { title: 'Messages' };

export default async function Inbox() {
  const user = await requireUser('/messages');
  const rows = await listConversations(await getDb(), user);
  const employer = user.role === 'employer';
  return (
    <div className="container-x max-w-4xl py-8">
      <h1 className="page-title">Messages</h1>
      {rows.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-ink/60">
            {employer
              ? <>Unlock a candidate in <Link href="/employers/candidates" className="font-semibold text-brand-600">Find candidates</Link> to start a conversation.</>
              : <>Find a headhunter in your field in the <Link href="/headhunters" className="font-semibold text-brand-600">headhunter directory</Link> and introduce yourself.</>}
          </p>
        </div>
      ) : (
        <ul className="card mt-6 divide-y divide-canvas-100">
          {rows.map((c) => {
            const name = employer ? c.candidate_name : c.recruiter_name;
            const sub = employer ? c.candidate_headline : `${c.recruiter_type === 'headhunter' ? 'Headhunter' : 'Recruiter'} · ${c.recruiter_company || ''}`;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{name}</p>
                      <span className="shrink-0 text-xs text-ink/45">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className="truncate text-xs text-ink/55">{sub}{c.job_title ? ` · re: ${c.job_title}` : ''}</p>
                    <p className={`mt-0.5 truncate text-sm ${c.unread ? 'text-ink' : 'text-ink/60'}`}>{c.last_body}</p>
                  </div>
                  {c.unread > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
                  {c.status !== 'open' && <span className="chip">Closed</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
