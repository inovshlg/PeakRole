'use server';

import path from 'node:path';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db.mjs';
import { upsertJob, getJob } from '@/lib/jobs.mjs';
import { parseCv, aiEnabled, AiError } from '@/lib/ai.mjs';
import { refreshMatches, refreshWaitMinutes, checkFit } from '@/lib/matching.mjs';
import { hashPassword, verifyPassword, createSession, destroySession, requireUser } from '@/lib/auth';
import { grantCredits, STARTER_CREDITS } from '@/lib/credits.mjs';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const num = (fd, k) => {
  const v = Number(String(fd.get(k) ?? '').replace(/[^\d]/g, ''));
  return v > 0 && v < 2_000_000_000 ? v : null;
};
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);
const fail = (pathname, msg, extra = '') => redirect(`${pathname}?error=${encodeURIComponent(msg)}${extra}`);

const CV_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
};
const CV_MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to 4.5 MB

/* ---------------- Auth ---------------- */
export async function signup(formData) {
  const name = str(formData, 'name');
  const email = str(formData, 'email').toLowerCase();
  const password = str(formData, 'password');
  const chosen = String(formData.get('role') || 'candidate');
  const role = chosen === 'employer' || chosen === 'headhunter' ? 'employer' : 'candidate';
  const recruiterType = role === 'employer' ? (chosen === 'headhunter' ? 'headhunter' : 'company') : null;
  const company = str(formData, 'company') || null;
  const q = `&role=${chosen === 'headhunter' ? 'headhunter' : role}`;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail('/signup', 'Please enter your name and a valid email.', q);
  if (password.length < 8) fail('/signup', 'Password must be at least 8 characters.', q);
  if (role === 'employer' && !company) fail('/signup', recruiterType === 'headhunter' ? 'Please enter your firm name (or "Independent").' : 'Please enter your company name.', q);
  const db = await getDb();
  if (await db.get('SELECT 1 FROM users WHERE email = $1', [email])) fail('/signup', 'An account with this email already exists.', q);
  const { id } = await db.get(
    'INSERT INTO users (email, password_hash, name, role, company, recruiter_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [email, hashPassword(password), name, role, company, recruiterType]
  );
  if (role === 'employer') await grantCredits(db, id, STARTER_CREDITS, 'Welcome credits');
  await createSession(id);
  redirect(safeNext(str(formData, 'next')) || (role === 'employer' ? '/employers/profile?welcome=1' : '/profile?welcome=1'));
}

export async function login(formData) {
  const email = str(formData, 'email').toLowerCase();
  const next = safeNext(str(formData, 'next'));
  const db = await getDb();
  const user = await db.get('SELECT id, role, password_hash FROM users WHERE email = $1', [email]);
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
  const db = await getDb();
  const removed = await db.run('DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [user.id, jobId]);
  if (!removed.rowCount) await db.run('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, jobId]);
  revalidatePath('/', 'layout');
}

/** Records the application, then sends the candidate to the employer's apply page (or confirms an on-site application). */
export async function applyToJob(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/jobs/${jobId}`);
  const db = await getDb();
  const job = await getJob(db, jobId);
  if (!job) redirect('/jobs');
  // Send the CV tailored for this job if there is one, otherwise the latest main CV / uploaded file.
  const cv = await db.get(
    `SELECT id FROM cvs WHERE user_id = $1 AND (job_id = $2 OR kind = 'master')
     ORDER BY (job_id = $2) DESC NULLS LAST, updated_at DESC LIMIT 1`,
    [user.id, jobId]
  );
  if (!job.apply_url && !user.cv_name && !cv) {
    redirect(`/cv?error=${encodeURIComponent('Create or upload your CV first; it is sent with on-site applications.')}`);
  }
  await db.run(
    'INSERT INTO applications (user_id, job_id, cv_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, job_id) DO UPDATE SET cv_id = COALESCE(excluded.cv_id, applications.cv_id)',
    [user.id, jobId, cv?.id ?? null]
  );
  revalidatePath('/', 'layout');
  redirect(job.apply_url || `/jobs/${jobId}?applied=1`);
}

export async function updateApplicationStatus(formData) {
  const user = await requireUser('/dashboard');
  const status = str(formData, 'status');
  if (!['applied', 'interviewing', 'offer', 'rejected'].includes(status)) return;
  await (await getDb()).run('UPDATE applications SET status = $1 WHERE user_id = $2 AND job_id = $3', [status, user.id, Number(formData.get('jobId'))]);
  revalidatePath('/dashboard');
}

export async function updateProfile(formData) {
  const user = await requireUser('/profile');
  const db = await getDb();
  let notice = 'saved=1';

  // 1. Save what the user typed.
  await db.run(
    `UPDATE users SET name = $1, headline = $2, location = $3, desired_salary = $4, years_experience = $5, skills = $6 WHERE id = $7`,
    [
      str(formData, 'name') || user.name, str(formData, 'headline') || null, str(formData, 'location') || null,
      num(formData, 'desired_salary'), num(formData, 'years_experience'), str(formData, 'skills') || null, user.id,
    ]
  );

  // 2. Store a new CV, then let the AI read it.
  const file = formData.get('cv');
  if (file && typeof file === 'object' && file.size > 0) {
    const ext = path.extname(file.name).toLowerCase();
    const mime = CV_TYPES[ext];
    if (!mime) fail('/profile', 'CV must be a PDF or Word document.');
    if (file.size > CV_MAX_BYTES) fail('/profile', 'CV must be under 4 MB.');
    const buffer = Buffer.from(await file.arrayBuffer());
    if (ext === '.pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') fail('/profile', 'That file is not a valid PDF.');
    const filename = file.name.slice(0, 120);
    await db.run(
      `INSERT INTO cv_files (user_id, filename, mime, data) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET filename = excluded.filename, mime = excluded.mime, data = excluded.data, uploaded_at = now()`,
      [user.id, filename, mime, buffer]
    );
    await db.run('UPDATE users SET cv_name = $1, cv_parsed = NULL, cv_parsed_at = NULL WHERE id = $2', [filename, user.id]);

    if (aiEnabled()) {
      try {
        const parsed = await parseCv({ buffer, mime });
        // 3. Fill in only the fields that are still empty; never overwrite what the user typed.
        await db.run(
          `UPDATE users SET cv_parsed = $1, cv_parsed_at = now(),
             headline = COALESCE(NULLIF(headline, ''), NULLIF($2, '')),
             location = COALESCE(NULLIF(location, ''), NULLIF($3, '')),
             years_experience = COALESCE(years_experience, NULLIF($4::int, 0)),
             skills = COALESCE(NULLIF(skills, ''), NULLIF($5, ''))
           WHERE id = $6`,
          [JSON.stringify(parsed), parsed.headline, parsed.location, parsed.years_experience, parsed.skills.join(', '), user.id]
        );
        notice = 'parsed=1';
      } catch (err) {
        if (!(err instanceof AiError)) console.error('CV parsing failed', err);
        notice = `saved=1&error=${encodeURIComponent(`CV saved, but AI reading failed: ${err instanceof AiError ? err.message : 'unexpected error'}`)}`;
      }
    }
  }
  revalidatePath('/', 'layout');
  redirect(`/profile?${notice}`);
}

/** Recompute AI job matches for the current user. */
export async function refreshMyMatches() {
  const user = await requireUser('/matches', 'candidate');
  const wait = refreshWaitMinutes(user);
  if (wait > 0) {
    fail('/matches', user.plan === 'premium'
      ? `You can refresh again in ${wait} minute${wait > 1 ? 's' : ''}.`
      : `Free accounts can refresh matches once a day (next refresh in about ${Math.ceil(wait / 60)} h). Premium refreshes every 10 minutes.`);
  }
  try {
    await refreshMatches(await getDb(), user);
  } catch (err) {
    if (!(err instanceof AiError)) { console.error('Matching failed', err); fail('/matches', 'Matching failed unexpectedly. Please try again.'); }
    fail('/matches', err.message);
  }
  revalidatePath('/', 'layout');
  redirect('/matches?refreshed=1');
}

/** Detailed AI fit check for one job. */
export async function checkMyFit(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/jobs/${jobId}`, 'candidate');
  const db = await getDb();
  const job = await getJob(db, jobId);
  if (!job) redirect('/jobs');
  // Fair use: free accounts get 5 detailed checks per day.
  if (user.plan !== 'premium') {
    const { n } = await db.get(
      "SELECT COUNT(*)::int AS n FROM job_matches WHERE user_id = $1 AND detailed = 1 AND created_at > now() - interval '1 day'",
      [user.id]
    );
    if (n >= 5) fail(`/jobs/${jobId}`, 'Free accounts get 5 AI fit checks per day. Upgrade to Premium for unlimited checks.');
  }
  try {
    await checkFit(db, user, job);
  } catch (err) {
    if (!(err instanceof AiError)) { console.error('Fit check failed', err); fail(`/jobs/${jobId}`, 'Fit check failed unexpectedly. Please try again.'); }
    fail(`/jobs/${jobId}`, err.message);
  }
  redirect(`/jobs/${jobId}#fit`);
}

export async function createAlert(formData) {
  const user = await requireUser('/alerts');
  const db = await getDb();
  const { n } = await db.get('SELECT COUNT(*)::int AS n FROM alerts WHERE user_id = $1', [user.id]);
  if (user.plan !== 'premium' && n >= 1) fail('/alerts', 'Free accounts can have 1 job alert. Upgrade to Premium for unlimited alerts.');
  const query = str(formData, 'query');
  const location = str(formData, 'location');
  if (!query && !location) fail('/alerts', 'Enter a job title or a location.');
  await db.run('INSERT INTO alerts (user_id, query, location, min_salary, remote) VALUES ($1, $2, $3, $4, $5)', [
    user.id, query, location, num(formData, 'min_salary'), formData.get('remote') ? 1 : 0,
  ]);
  redirect('/alerts?created=1');
}

export async function deleteAlert(formData) {
  const user = await requireUser('/alerts');
  await (await getDb()).run('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [Number(formData.get('id')), user.id]);
  revalidatePath('/alerts');
}

/* ---------------- Premium ---------------- */
export async function upgrade() {
  const user = await requireUser('/pricing');
  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;
  const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  if (STRIPE_SECRET_KEY && STRIPE_PRICE_ID) {
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      customer_email: user.email,
      client_reference_id: String(user.id),
      success_url: `${site}/dashboard?upgraded=1`,
      cancel_url: `${site}/pricing`,
    });
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }, body,
    });
    const session = await res.json();
    if (!res.ok) fail('/pricing', session.error?.message || 'Payment provider error.');
    // NOTE: in production, set plan='premium' from a Stripe webhook (checkout.session.completed), not here.
    redirect(session.url);
  }
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_UPGRADES !== '1') {
    fail('/pricing', 'Payments are not set up on this site yet.');
  }
  await (await getDb()).run("UPDATE users SET plan = 'premium' WHERE id = $1", [user.id]);
  redirect('/dashboard?upgraded=1');
}

/* ---------------- Employers ---------------- */
export async function postJob(formData) {
  const user = await requireUser('/employers', 'employer');
  const title = str(formData, 'title');
  const location = str(formData, 'location');
  // Browsers submit textarea line breaks as \r\n; normalise so paragraphs and bullets are detected.
  const description = str(formData, 'description').replace(/\r\n?/g, '\n');
  if (!title || !description || (!location && !formData.get('remote'))) {
    fail('/employers', 'Title, location and description are required.');
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = description
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => /^[-*•]\s/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(esc).join('<br>')}</p>`;
    })
    .join('');
  const applyUrl = str(formData, 'apply_url');
  await upsertJob(await getDb(), {
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
    currency: str(formData, 'currency') || 'INR',
    description_html: html,
    apply_url: /^https?:\/\//.test(applyUrl) ? applyUrl : null,
    posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    posted_by_user_id: user.id,
    company_domain: user.company_website ? user.company_website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
  });
  revalidatePath('/', 'layout');
  redirect('/employers?posted=1');
}

export async function closeJob(formData) {
  const user = await requireUser('/employers', 'employer');
  await (await getDb()).run("UPDATE jobs SET status = 'expired' WHERE id = $1 AND posted_by_user_id = $2", [Number(formData.get('jobId')), user.id]);
  revalidatePath('/', 'layout');
}
