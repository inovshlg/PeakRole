/**
 * Candidate ↔ recruiter messaging.
 * - Candidates may start a conversation with a headhunter (free plan: a few per month).
 * - Recruiters may start one with a candidate they have unlocked, or who applied to their job.
 * - Once a conversation exists, both sides can reply; the candidate can close it.
 */
import { sendEmail, siteUrl, esc } from './email.mjs';

export const CANDIDATE_CONTACT_LIMIT = { free: 3, premium: 30 }; // new conversations per 30 days
const MAX_BODY = 4000;

export class MessagingError extends Error {}

export async function unreadCount(db, user) {
  if (!user) return 0;
  const col = user.role === 'employer' ? 'recruiter_unread' : 'candidate_unread';
  const who = user.role === 'employer' ? 'recruiter_id' : 'candidate_id';
  const { n } = await db.get(`SELECT COALESCE(SUM(${col}), 0)::int AS n FROM conversations WHERE ${who} = $1`, [user.id]);
  return n;
}

/** May this recruiter contact this candidate? (unlocked, or the candidate applied to one of their jobs) */
export async function recruiterCanContact(db, recruiterId, candidateId) {
  return !!(await db.get(
    `SELECT 1 AS ok FROM unlocks WHERE recruiter_id = $1 AND candidate_id = $2
     UNION SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.posted_by_user_id = $1 AND a.user_id = $2
     LIMIT 1`,
    [recruiterId, candidateId]
  ));
}

async function notify(db, recipientId, sender, conversationId, body) {
  const to = await db.get('SELECT email, name FROM users WHERE id = $1', [recipientId]);
  if (!to) return;
  try {
    await sendEmail(
      to.email,
      `New message from ${sender.name} on PeakRole`,
      `<p>Hi ${esc(to.name)},</p><p><b>${esc(sender.name)}</b>${sender.company ? ` (${esc(sender.company)})` : ''} sent you a message:</p>
       <blockquote style="border-left:3px solid #0070f2;padding-left:12px;color:#333">${esc(body.slice(0, 600)).replace(/\n/g, '<br>')}</blockquote>
       <p><a href="${siteUrl()}/messages/${conversationId}">Reply on PeakRole</a></p>`
    );
  } catch (err) {
    console.error('Message email failed', err.message);
  }
}

/** Start (or continue) a conversation between `sender` and `otherId`, adding the first message. */
export async function startConversation(db, sender, otherId, body, jobId = null) {
  body = String(body || '').trim().slice(0, MAX_BODY);
  if (body.length < 10) throw new MessagingError('Please write a short message (at least 10 characters).');
  const other = await db.get('SELECT id, role, recruiter_type FROM users WHERE id = $1', [otherId]);
  if (!other || other.id === sender.id) throw new MessagingError('That person could not be found.');

  let candidateId, recruiterId;
  if (sender.role === 'candidate') {
    if (other.role !== 'employer') throw new MessagingError('You can only message recruiters and headhunters.');
    candidateId = sender.id; recruiterId = other.id;
  } else {
    if (other.role !== 'candidate') throw new MessagingError('You can only message candidates.');
    candidateId = other.id; recruiterId = sender.id;
  }

  const existing = await db.get('SELECT * FROM conversations WHERE candidate_id = $1 AND recruiter_id = $2', [candidateId, recruiterId]);
  if (existing) {
    await sendMessage(db, sender, existing.id, body);
    return existing.id;
  }

  if (sender.role === 'candidate') {
    const limit = CANDIDATE_CONTACT_LIMIT[sender.plan] ?? CANDIDATE_CONTACT_LIMIT.free;
    const { n } = await db.get(
      "SELECT COUNT(*)::int AS n FROM conversations WHERE candidate_id = $1 AND started_by = $1 AND created_at > now() - interval '30 days'",
      [sender.id]
    );
    if (n >= limit) {
      throw new MessagingError(sender.plan === 'premium'
        ? `You've contacted ${limit} recruiters this month. Please wait for replies before reaching out to more.`
        : `Free accounts can contact ${limit} headhunters a month. Upgrade to Premium to contact more.`);
    }
  } else if (!(await recruiterCanContact(db, sender.id, candidateId))) {
    throw new MessagingError('Unlock this candidate before messaging them.');
  }

  const { id } = await db.get(
    `INSERT INTO conversations (candidate_id, recruiter_id, job_id, started_by, ${sender.role === 'candidate' ? 'recruiter_unread' : 'candidate_unread'})
     VALUES ($1, $2, $3, $4, 1) RETURNING id`,
    [candidateId, recruiterId, jobId, sender.id]
  );
  await db.run('INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)', [id, sender.id, body]);
  await notify(db, sender.id === candidateId ? recruiterId : candidateId, sender, id, body);
  return id;
}

/** Load a conversation if `user` takes part in it. */
export async function getConversation(db, user, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return db.get(
    `SELECT c.*, cand.name AS candidate_name, cand.headline AS candidate_headline,
            rec.name AS recruiter_name, rec.company AS recruiter_company, rec.recruiter_type, j.title AS job_title
     FROM conversations c JOIN users cand ON cand.id = c.candidate_id JOIN users rec ON rec.id = c.recruiter_id
     LEFT JOIN jobs j ON j.id = c.job_id
     WHERE c.id = $1 AND (c.candidate_id = $2 OR c.recruiter_id = $2)`,
    [n, user.id]
  );
}

export async function sendMessage(db, sender, conversationId, body) {
  body = String(body || '').trim().slice(0, MAX_BODY);
  if (!body) throw new MessagingError('Message is empty.');
  const c = await getConversation(db, sender, conversationId);
  if (!c) throw new MessagingError('Conversation not found.');
  if (c.status !== 'open') throw new MessagingError('This conversation has been closed.');
  const toCandidate = sender.id === c.recruiter_id;
  await db.run('INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)', [c.id, sender.id, body]);
  await db.run(
    `UPDATE conversations SET last_message_at = now(), ${toCandidate ? 'candidate_unread = candidate_unread + 1' : 'recruiter_unread = recruiter_unread + 1'} WHERE id = $1`,
    [c.id]
  );
  await notify(db, toCandidate ? c.candidate_id : c.recruiter_id, sender, c.id, body);
}

export async function markRead(db, user, c) {
  const col = user.id === c.candidate_id ? 'candidate_unread' : 'recruiter_unread';
  await db.run(`UPDATE conversations SET ${col} = 0 WHERE id = $1`, [c.id]);
}

export async function listConversations(db, user) {
  const me = user.role === 'employer' ? 'recruiter_id' : 'candidate_id';
  const unread = user.role === 'employer' ? 'recruiter_unread' : 'candidate_unread';
  return db.all(
    `SELECT c.id, c.status, c.last_message_at, c.${unread} AS unread, j.title AS job_title,
            cand.name AS candidate_name, cand.headline AS candidate_headline,
            rec.name AS recruiter_name, rec.company AS recruiter_company, rec.recruiter_type,
            (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body
     FROM conversations c JOIN users cand ON cand.id = c.candidate_id JOIN users rec ON rec.id = c.recruiter_id
     LEFT JOIN jobs j ON j.id = c.job_id
     WHERE c.${me} = $1 ORDER BY c.last_message_at DESC LIMIT 100`,
    [user.id]
  );
}
