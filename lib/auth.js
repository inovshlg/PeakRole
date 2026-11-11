import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db.mjs';

const COOKIE = 'pr_session';
const SESSION_DAYS = 30;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  getDb()
    .prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`)
    .run(token, userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (
    getDb()
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.plan, u.company, u.headline, u.location, u.desired_salary,
                u.years_experience, u.skills, u.visible_to_recruiters, u.cv_name, u.cv_path
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`
      )
      .get(token) ?? null
  );
}

export async function requireUser(nextPath = '/dashboard', role) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (role && user.role !== role) redirect(user.role === 'employer' ? '/employers' : '/dashboard');
  return user;
}
