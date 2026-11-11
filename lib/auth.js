import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db.mjs';

export { hashPassword, verifyPassword } from './password.mjs';

const COOKIE = 'pr_session';
const SESSION_DAYS = 30;

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const db = await getDb();
  await db.run(`INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [token, userId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await getDb()).run('DELETE FROM sessions WHERE token = $1', [token]);
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const user = await db.get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  if (!user) return null;
  delete user.password_hash;
  user.isHeadhunter = user.role === 'employer' && user.recruiter_type === 'headhunter';
  return user;
}

export async function requireUser(nextPath = '/dashboard', role) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (role && user.role !== role) redirect(user.role === 'employer' ? '/employers' : '/dashboard');
  return user;
}

/** Admins are the accounts whose email is listed in ADMIN_EMAILS (comma separated). */
export function isAdmin(user) {
  if (!user) return false;
  const list = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(String(user.email).toLowerCase());
}

export async function requireAdmin(nextPath = '/admin') {
  const user = await requireUser(nextPath);
  if (!isAdmin(user)) redirect('/');
  return user;
}
