'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db.mjs';
import { getJob } from '@/lib/jobs.mjs';
import { aiEnabled } from '@/lib/ai.mjs';
import { requireUser } from '@/lib/auth';
import {
  AiError, TEMPLATES, normalizeCv, blankCv, generateCv, tailorCv, checkCv, checkAiQuota, recordAiUse,
} from '@/lib/cv.mjs';

const fail = (path, msg) => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
const str = (fd, k) => String(fd.get(k) ?? '').trim();

async function ownCv(db, user, id) {
  const cv = await db.get('SELECT * FROM cvs WHERE id = $1 AND user_id = $2', [Number(id), user.id]);
  if (!cv) redirect('/cv');
  return cv;
}

function profileFor(user) {
  const p = user.cv_parsed || {};
  return {
    full_name: user.name, email: user.email, headline: user.headline || p.headline || '', location: user.location || p.location || '',
    years_experience: user.years_experience ?? p.years_experience ?? null, skills: user.skills || (p.skills || []).join(', '),
    summary_from_cv: p.summary || '', roles_from_cv: p.experience || [],
  };
}

/** Run an AI step and turn its errors into a redirect with a readable message. */
async function aiStep(failPath, fn) {
  if (!aiEnabled()) fail(failPath, 'AI features are not enabled on this site yet.');
  try {
    return await fn();
  } catch (err) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    if (!(err instanceof AiError)) console.error('CV AI step failed', err);
    fail(failPath, err instanceof AiError ? err.message : 'Something went wrong with the AI. Please try again.');
  }
}

async function buildMasterCv(db, user, notes = '') {
  const file = await db.get('SELECT mime, data FROM cv_files WHERE user_id = $1', [user.id]);
  const usable = file && file.mime !== 'application/msword' ? file : null;
  if (!usable && !user.headline && !user.skills && !notes && !user.cv_parsed) {
    throw new AiError('Upload your current CV (PDF or .docx) or add a few notes about your experience first.');
  }
  await checkAiQuota(db, user, 'generate');
  const cv = await generateCv({ file: usable, profile: profileFor(user), notes: notes.slice(0, 6000) });
  await recordAiUse(db, user, 'generate');
  const { id } = await db.get(
    "INSERT INTO cvs (user_id, title, kind, data) VALUES ($1, $2, 'master', $3) RETURNING id",
    [user.id, 'My CV', JSON.stringify(cv)]
  );
  return id;
}

/** "Build my CV with AI" from the uploaded CV and/or profile + notes. */
export async function createCvWithAi(formData) {
  const user = await requireUser('/cv', 'candidate');
  const db = await getDb();
  const id = await aiStep('/cv', () => buildMasterCv(db, user, str(formData, 'notes')));
  revalidatePath('/cv');
  redirect(`/cv/${id}?created=1`);
}

export async function createBlankCv() {
  const user = await requireUser('/cv', 'candidate');
  const { id } = await (await getDb()).get(
    "INSERT INTO cvs (user_id, title, kind, data) VALUES ($1, 'My CV', 'master', $2) RETURNING id",
    [user.id, JSON.stringify(blankCv(user))]
  );
  redirect(`/cv/${id}`);
}

export async function saveCv(formData) {
  const user = await requireUser('/cv', 'candidate');
  const db = await getDb();
  const row = await ownCv(db, user, formData.get('id'));
  let data;
  try {
    data = normalizeCv(JSON.parse(String(formData.get('data') || '{}')));
  } catch {
    fail(`/cv/${row.id}`, 'Could not read your changes. Please try again.');
  }
  const template = TEMPLATES.some((t) => t.id === formData.get('template')) ? formData.get('template') : row.template;
  const title = str(formData, 'title').slice(0, 120) || row.title;
  const letter = formData.has('cover_letter') ? String(formData.get('cover_letter')).slice(0, 6000) : row.cover_letter;
  await db.run(
    'UPDATE cvs SET data = $1, template = $2, title = $3, cover_letter = $4, updated_at = now() WHERE id = $5',
    [JSON.stringify(data), template, title, letter, row.id]
  );
  revalidatePath(`/cv/${row.id}`);
  redirect(`/cv/${row.id}?saved=1`);
}

export async function deleteCv(formData) {
  const user = await requireUser('/cv', 'candidate');
  await (await getDb()).run('DELETE FROM cvs WHERE id = $1 AND user_id = $2', [Number(formData.get('id')), user.id]);
  revalidatePath('/cv');
  redirect('/cv?deleted=1');
}

/** "Tailor my CV for this job": tailored CV + cover letter, based on the latest master CV. */
export async function tailorCvForJob(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/jobs/${jobId}`, 'candidate');
  const db = await getDb();
  const job = await getJob(db, jobId);
  if (!job) redirect('/jobs');
  const back = `/jobs/${jobId}`;

  const id = await aiStep(back, async () => {
    await checkAiQuota(db, user, 'tailor');
    let base = await db.get(
      "SELECT * FROM cvs WHERE user_id = $1 AND kind = 'master' ORDER BY updated_at DESC LIMIT 1",
      [user.id]
    );
    if (!base) base = await db.get('SELECT * FROM cvs WHERE id = $1', [await buildMasterCv(db, user)]);
    const out = await tailorCv(normalizeCv(base.data), job);
    await recordAiUse(db, user, 'tailor');
    const { id } = await db.get(
      `INSERT INTO cvs (user_id, title, kind, job_id, template, data, cover_letter, notes)
       VALUES ($1, $2, 'tailored', $3, $4, $5, $6, $7) RETURNING id`,
      [user.id, `${job.title} · ${job.company}`.slice(0, 120), job.id, base.template, JSON.stringify(out.cv), out.cover_letter,
        JSON.stringify({ changes: out.changes, missing: out.missing, base_id: base.id })]
    );
    return id;
  });
  revalidatePath('/cv');
  redirect(`/cv/${id}?tailored=1`);
}

/** AI CV check (against the target job for tailored CVs). */
export async function runCvCheck(formData) {
  const user = await requireUser('/cv', 'candidate');
  const db = await getDb();
  const row = await ownCv(db, user, formData.get('id'));
  await aiStep(`/cv/${row.id}`, async () => {
    await checkAiQuota(db, user, 'check');
    const job = row.job_id ? await getJob(db, row.job_id) : null;
    const result = await checkCv(normalizeCv(row.data), job);
    await recordAiUse(db, user, 'check');
    await db.run('UPDATE cvs SET check_result = $1, checked_at = now() WHERE id = $2', [JSON.stringify(result), row.id]);
  });
  revalidatePath(`/cv/${row.id}`);
  redirect(`/cv/${row.id}?checked=1`);
}
