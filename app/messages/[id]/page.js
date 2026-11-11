import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import { getConversation, markRead } from '@/lib/messaging.mjs';
import { initials, timeAgo } from '@/lib/format.mjs';
import { replyMessage, closeConversation } from '@/app/network/actions';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Conversation' };

export default async function Conversation({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/messages/${id}`);
  const db = await getDb();
  const c = await getConversation(db, user, id);
  if (!c) notFound();
  await markRead(db, user, c);
  const messages = await db.all('SELECT id, sender_id, body, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at, id', [c.id]);
  const employer = user.id === c.recruiter_id;
  const other = employer
    ? { name: c.candidate_name, sub: c.candidate_headline }
    : { name: c.recruiter_name, sub: `${c.recruiter_type === 'headhunter' ? 'Headhunter' : 'Recruiter'} · ${c.recruiter_company || ''}` };
  const candidate = employer && await db.get(
    "SELECT id, location, years_experience, skills, cv_name, cv_parsed->>'summary' AS summary FROM users WHERE id = $1",
    [c.candidate_id]
  );

  return (
    <div className="container-x max-w-5xl py-8">
      <Link href="/messages" className="text-sm text-ink/60 hover:text-brand-600">← All messages</Link>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card flex flex-col">
          <header className="flex items-center gap-3 border-b border-canvas-100 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{initials(other.name)}</span>
            <div className="min-w-0">
              <p className="font-semibold">{other.name}</p>
              <p className="truncate text-xs text-ink/55">{other.sub}{c.job_title ? ` · re: ${c.job_title}` : ''}</p>
            </div>
            {c.status !== 'open' && <span className="chip ml-auto">Closed</span>}
          </header>
          <ol className="flex-1 space-y-4 px-5 py-5">
            {messages.map((m, i) => {
              const mine = m.sender_id === user.id;
              return (
                <li key={m.id} id={i === messages.length - 1 ? 'latest' : undefined} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-canvas-100 text-ink'}`}>
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? 'text-white/70' : 'text-ink/45'}`}>{timeAgo(m.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-canvas-100 p-4">
            <Flash error={sp.error} ok={sp.sent && 'Message sent. You’ll get an email when they reply.'} />
            {c.status === 'open' ? (
              <form action={replyMessage} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <input type="hidden" name="conversationId" value={c.id} />
                <label className="sr-only" htmlFor="body">Reply</label>
                <textarea id="body" name="body" rows={3} required maxLength={4000} className="input flex-1" placeholder="Write a reply…" />
                <SubmitButton className="btn-primary" pendingText="Sending…">Send</SubmitButton>
              </form>
            ) : <p className="mt-2 text-sm text-ink/55">This conversation is closed.</p>}
          </div>
        </section>
        <aside className="space-y-4">
          {candidate && (
            <div className="card p-5 text-sm">
              <p className="eyebrow">Candidate</p>
              <p className="mt-2 text-ink/80">{candidate.summary || other.sub}</p>
              <p className="mt-2 text-ink/55">{[candidate.location, candidate.years_experience && `${candidate.years_experience} yrs`].filter(Boolean).join(' · ')}</p>
              {candidate.cv_name && <a href={`/api/cv/${candidate.id}`} className="btn-ghost mt-3 w-full">Download CV</a>}
            </div>
          )}
          {!employer && c.status === 'open' && (
            <form action={closeConversation} className="card p-5 text-sm">
              <input type="hidden" name="conversationId" value={c.id} />
              <p className="text-ink/60">Not interested? Closing stops further messages.</p>
              <button className="btn-danger mt-3 w-full">Close conversation</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
