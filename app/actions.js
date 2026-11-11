'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb, DATA_DIR } from '@/lib/db.mjs';
import { upsertJob } from '@/lib/jobs.mjs';
import { hashPassword, verifyPassword, createSession, destroySession, requireUser, getCurrentUser } from '@/lib/auth';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const num = (fd, k) => { const v = Number(String(fd.get(k) ?? '').replace(/[^\d]/g, '')); return v > 0 ? v : null; };
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);
const fail = (pathname, msg, extra = '') => redirect(`${pathname}?error=${encodeURIComponent(msg)}${extra}`);

/* ---------------- Auth ---------------- */
export async function signup(formData) {
  const name = str(formData, 'name');
  const email = str(formData, 'email').toLowerCase();
  const password = str(formData, 'password');
  const role = formData.get('role') === 'employer' ? 'employer' : 'candidate';
  const company = str(formData, 'company') || null;
  const q = `&role=${role}`;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail('/signup', 'Please enter your name and a valid email.', q);
  if (password.length < 8) fail('/signup', 'Password must be at least 8 characters.', q);
  if (role === 'employer' && !company) fail('/signup', 'Please enter your company name.', q);
  const db = getDb();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail('/signup', 'An account with this email already exists.', q);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, password_hash, name, role, company) VALUES (?, ?, ?, ?, ?)')
    .run(email, hashPassword(password), name, role, company);
  await createSession(Number(lastInsertRowid));
  redirect(safeNext(str(formData, 'next')) || (role === 'employer' ? '/employers' : '/profile?welcome=1'));
}

export async function login(formData) {
  const email = str(formData, 'email').toLowerCase();
  const next = safeNext(str(formData, 'next'));
  const user = getDb().prepare('SELECT id, role, password_hash FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(str(formData, 'password'), user.password_hash)) {
    fail('/login', 'Incorrect email or password.', next ? `&next=${encodeURIComponent(next)}` : '');
  }
  await createSession(user.id);
  redirect(next || (user.role === 'employer' ? '/employers' : '/dashboard'));
}

export async function logout() {
  await destroySession();
  redirect('/');
}

/* ---------------- Candidate ---------------- */
export async function toggleSave(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/jobs/${jobId}`);
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM saved_jobs WHERE user_id = ? AND job_id = ?').get(user.id, jobId);
  if (exists) db.prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?').run(user.id, jobId);
  else db.prepare('INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)').run(user.id, jobId);
  revalidatePath('/', 'layout');
}

/** Records the application, then sends the candidate to the employer's apply page (or confirms an on-site application). */
export async function applyToJob(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/jobs/${jobId}`);
  const db = getDb();
  const job = db.prepare('SELECT id, apply_url FROM jobs WHERE id = ?').get(jobId);
  if (!job) redirect('/jobs');
  if (!job.apply_url && !user.cv_path) {
    redirect(`/profile?error=${encodeURIComponent('Upload your CV first; it is sent with on-site applications.')}`);
  }
  db.prepare('INSERT OR IGNORE INTO applications (user_id, job_id) VALUES (?, ?)').run(user.id, jobId);
  revalidatePath('/', 'layout');
  redirect(job.apply_url || `/jobs/${jobId}?applied=1`);
}

export async function updateApplicationStatus(formData) {
  const user = await requireUser('/dashboard');
  const status = str(formData, 'status');
  if (!['applied', 'interviewing', 'offer', 'rejected'].includes(status)) return;
  getDb()
    .prepare('UPDATE applications SET status = ? WHERE user_id = ? AND job_id = ?')
    .run(status, user.id, Number(formData.get('jobId')));
  revalidatePath('/dashboard');
}

export async function updateProfile(formData) {
  const user = await requireUser('/profile');
  const db = getDb();
  let cvPath = user.cv_path;
  let cvName = user.cv_name;

  const file = formData.get('cv');
  if (file && typeof file === 'object' && file.size > 0) {
    const ext = path.extname(file.name).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) fail('/profile', 'CV must be a PDF or Word document.');
    if (file.size > 5 * 1024 * 1024) fail('/profile', 'CV must be under 5 MB.');
    const dir = path.join(DATA_DIR, 'uploads');
    await fs.mkdir(dir, { recursive: true });
    const stored = `${user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    await fs.writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
    if (user.cv_path) await fs.rm(path.join(dir, user.cv_path), { force: true });
    cvPath = stored;
    cvName = file.name.slice(0, 120);
  }

  db.prepare(
    `UPDATE users SET name = ?, headline = ?, location = ?, desired_salary = ?, years_experience = ?, skills = ?,
       visible_to_recruiters = ?, cv_path = ?, cv_name = ? WHERE id = ?`
  ).run(
    str(formData, 'name') || user.name, str(formData, 'headline') || null, str(formData, 'location') || null,
    num(formData, 'desired_salary'), num(formData, 'years_experience'), str(formData, 'skills') || null,
    formData.get('visible_to_recruiters') ? 1 : 0, cvPath, cvName, user.id
  );
  revalidatePath('/', 'layout');
  redirect('/profile?saved=1');
}

export async function createAlert(formData) {
  const user = await requireUser('/alerts');
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) AS n FROM alerts WHERE user_id = ?').get(user.id).n;
  if (user.plan !== 'premium' && count >= 1) fail('/alerts', 'Free accounts can have 1 job alert. Upgrade to Premium for unlimited alerts.');
  const query = str(formData, 'query');
  const location = str(formData, 'location');
  if (!query && !location) fail('/alerts', 'Enter a job title or a location.');
  db.prepare('INSERT INTO alerts (user_id, query, location, min_salary, remote) VALUES (?, ?, ?, ?, ?)').run(
    user.id, query, location, num(formData, 'min_salary'), formData.get('remote') ? 1 : 0
  );
  redirect('/alerts?created=1');
}

export async function deleteAlert(formData) {
  const user = await requireUser('/alerts');
  getDb().prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(Number(formData.get('id')), user.id);
  revalidatePath('/alerts');
}

/* ---------------- Premium ---------------- */
export async function upgrade() {
  const user = await requireUser('/pricing');
  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL = 'http://localhost:3000' } = process.env;
  if (STRIPE_SECRET_KEY && STRIPE_PRICE_ID) {
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      customer_email: user.email,
      client_reference_id: String(user.id),
      success_url: `${SITE_URL}/dashboard?upgraded=1`,
      cancel_url: `${SITE_URL}/pricing`,
    });
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }, body,
    });
    const session = await res.json();
    if (!res.ok) fail('/pricing', session.error?.message || 'Payment provider error.');
    // NOTE: in production, set plan='premium' from a Stripe webhook (checkout.session.completed), not here.
    redirect(session.url);
  }
  // Demo mode: no payment provider configured.
  getDb().prepare("UPDATE users SET plan = 'premium' WHERE id = ?").run(user.id);
  redirect('/dashboard?upgraded=1');
}

/* ---------------- Employers ---------------- */
export async function postJob(formData) {
  const user = await requireUser('/employers', 'employer');
  const title = str(formData, 'title');
  const location = str(formData, 'location');
  const description = str(formData, 'description');
  if (!title || !description || (!location && !formData.get('remote'))) {
    fail('/employers', 'Title, location and description are required.');
  }
  const html = description
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (lines.every((l) => /^[-*•]\s/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(esc).join('<br>')}</p>`;
    })
    .join('');
  const applyUrl = str(formData, 'apply_url');
  upsertJob(getDb(), {
    source: 'direct',
    external_id: crypto.randomUUID(),
    title,
    company: user.company || user.name,
    location,
    remote: !!formData.get('remote'),
    employment_type: str(formData, 'employment_type') || 'Full-time',
    seniority: str(formData, 'seniority') || undefined,
    salary_min: num(formData, 'salary_min'),
    salary_max: num(formData, 'salary_max'),
    currency: str(formData, 'currency') || 'USD',
    description_html: html,
    apply_url: /^https?:\/\//.test(applyUrl) ? applyUrl : null,
    posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString().replace('T', ' ').slice(0, 19),
    posted_by_user_id: user.id,
  });
  revalidatePath('/', 'layout');
  redirect('/employers?posted=1');
}

export async function closeJob(formData) {
  const user = await requireUser('/employers', 'employer');
  getDb()
    .prepare("UPDATE jobs SET status = 'expired' WHERE id = ? AND posted_by_user_id = ?")
    .run(Number(formData.get('jobId')), user.id);
  revalidatePath('/', 'layout');
}

