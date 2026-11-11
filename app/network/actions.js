'use server';

/** Server actions for phases 2–4: recruiter profiles, messaging, privacy, credits, pipeline, AI tools. */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db.mjs';
import { getJob } from '@/lib/jobs.mjs';
import { requireUser } from '@/lib/auth';
import { aiEnabled, AiError } from '@/lib/ai.mjs';
import { checkAiQuota, recordAiUse, normalizeCv, cvToText } from '@/lib/cv.mjs';
import { startConversation, sendMessage, getConversation, MessagingError } from '@/lib/messaging.mjs';
import { spendCredits, grantCredits, CreditError, CREDIT_PACKS, UNLOCK_COST, FEATURE_COST, FEATURE_DAYS } from '@/lib/credits.mjs';
import { searchCandidates, rankCandidates, visibleToRecruiterSql } from '@/lib/recruiting.mjs';
import { prepareInterview } from '@/lib/interview.mjs';

const str = (fd, k, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const int = (fd, k) => { const n = Number(String(fd.get(k) ?? '').replace(/[^\d]/g, '')); return Number.isInteger(n) && n > 0 && n < 1e6 ? n : null; };
const fail = (path, msg) => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
const isRedirect = (err) => typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT');
const demoPayments = () => process.env.NODE_ENV !== 'production' || process.env.DEMO_UPGRADES === '1';
const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

/** Run fn; known errors become a redirect with the message. */
async function attempt(path, fn) {
  try {
    return await fn();
  } catch (err) {
    if (isRedirect(err)) throw err;
    if (err instanceof MessagingError || err instanceof CreditError || err instanceof AiError) fail(path, err.message);
    console.error(err);
    fail(path, 'Something went wrong. Please try again.');
  }
}

/* ---------------------------------------------------------------- Profiles & privacy */

export async function updateRecruiterProfile(formData) {
  const user = await requireUser('/employers/profile', 'employer');
  const website = str(formData, 'company_website', 200);
  await (await getDb()).run(
    `UPDATE users SET name = $1, company = $2, bio = $3, specialisms = $4, regions = $5, levels = $6, linkedin_url = $7,
       years_recruiting = $8, placements = $9, company_about = $10, company_website = $11, company_size = $12, company_industry = $13
     WHERE id = $14`,
    [
      str(formData, 'name', 120) || user.name, str(formData, 'company', 150) || user.company, str(formData, 'bio', 2000) || null,
      str(formData, 'specialisms', 400) || null, str(formData, 'regions', 300) || null, formData.getAll('levels').map(String).join(', ') || null,
      /^https?:\/\/(www\.)?linkedin\.com\//i.test(str(formData, 'linkedin_url')) ? str(formData, 'linkedin_url', 300) : null,
      int(formData, 'years_recruiting'), int(formData, 'placements'), str(formData, 'company_about', 3000) || null,
      website ? (/^https?:\/\//.test(website) ? website : `https://${website}`) : null,
      str(formData, 'company_size', 40) || null, str(formData, 'company_industry', 80) || null, user.id,
    ]
  );
  if (website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    await (await getDb()).run('UPDATE jobs SET company_domain = $1 WHERE posted_by_user_id = $2', [domain, user.id]);
  }
  revalidatePath('/', 'layout');
  redirect('/employers/profile?saved=1');
}

export async function updatePrivacy(formData) {
  const user = await requireUser('/profile', 'candidate');
  const visibility = String(formData.get('visibility'));
  await (await getDb()).run(
    'UPDATE users SET visible_to_recruiters = $1, visibility = $2, blocked_companies = $3 WHERE id = $4',
    [visibility === 'hidden' ? 0 : 1, visibility === 'headhunters' ? 'headhunters' : 'all', str(formData, 'blocked_companies', 500) || null, user.id]
  );
  revalidatePath('/profile');
  redirect('/profile?privacy=1#privacy');
}

/* ---------------------------------------------------------------- Messaging */

export async function contactRecruiter(formData) {
  const recruiterId = Number(formData.get('recruiterId'));
  const back = `/headhunters/${recruiterId}`;
  const user = await requireUser(back);
  if (user.role !== 'candidate') fail(back, 'Only job seekers can contact headhunters from here.');
  const db = await getDb();
  const id = await attempt(back, () => startConversation(db, user, recruiterId, str(formData, 'body', 4000)));
  redirect(`/messages/${id}?sent=1`);
}

export async function messageCandidate(formData) {
  const candidateId = Number(formData.get('candidateId'));
  const back = String(formData.get('back') || '/employers/candidates');
  const user = await requireUser(back, 'employer');
  const db = await getDb();
  const jobId = Number(formData.get('jobId')) || null;
  const id = await attempt(back.startsWith('/') ? back : '/employers/candidates', () => startConversation(db, user, candidateId, str(formData, 'body', 4000), jobId));
  redirect(`/messages/${id}?sent=1`);
}

export async function replyMessage(formData) {
  const id = Number(formData.get('conversationId'));
  const user = await requireUser(`/messages/${id}`);
  const db = await getDb();
  await attempt(`/messages/${id}`, () => sendMessage(db, user, id, str(formData, 'body', 4000)));
  revalidatePath('/messages');
  redirect(`/messages/${id}#latest`);
}

export async function closeConversation(formData) {
  const id = Number(formData.get('conversationId'));
  const user = await requireUser(`/messages/${id}`);
  const db = await getDb();
  const c = await getConversation(db, user, id);
  if (c) await db.run("UPDATE conversations SET status = 'closed' WHERE id = $1", [c.id]);
  redirect(`/messages/${id}`);
}

/* ---------------------------------------------------------------- Credits, unlocks, featured jobs */

export async function buyCredits(formData) {
  const user = await requireUser('/employers/credits', 'employer');
  const pack = CREDIT_PACKS.find((p) => p.id === formData.get('pack'));
  if (!pack) redirect('/employers/credits');
  if (!demoPayments()) fail('/employers/credits', 'Online payments are being set up (Razorpay). Please contact us to buy credits.');
  await grantCredits(await getDb(), user.id, pack.credits, `Demo purchase ${pack.id}`);
  revalidatePath('/', 'layout');
  redirect(`/employers/credits?added=${pack.credits}`);
}

export async function unlockCandidate(formData) {
  const candidateId = Number(formData.get('candidateId'));
  const back = String(formData.get('back') || '/employers/candidates');
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/employers/candidates';
  const user = await requireUser(safeBack, 'employer');
  const db = await getDb();
  await attempt(safeBack, async () => {
    const params = [];
    const visible = await db.get(`SELECT u.id FROM users u WHERE u.id = $${params.push(candidateId)} AND ${visibleToRecruiterSql(user, params)}`, params);
    if (!visible) throw new CreditError('This candidate is no longer available.');
    if (await db.get('SELECT 1 AS x FROM unlocks WHERE recruiter_id = $1 AND candidate_id = $2', [user.id, candidateId])) return;
    await spendCredits(db, user.id, UNLOCK_COST, `Unlock candidate ${candidateId}`);
    await db.run('INSERT INTO unlocks (recruiter_id, candidate_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, candidateId]);
  });
  revalidatePath('/', 'layout');
  redirect(`${safeBack}${safeBack.includes('?') ? '&' : '?'}unlocked=${candidateId}#c${candidateId}`);
}

export async function featureJob(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser('/employers', 'employer');
  const db = await getDb();
  await attempt('/employers', async () => {
    const job = await db.get("SELECT id FROM jobs WHERE id = $1 AND posted_by_user_id = $2 AND status = 'active'", [jobId, user.id]);
    if (!job) throw new CreditError('Job not found.');
    await spendCredits(db, user.id, FEATURE_COST, `Feature job ${jobId}`);
    await db.run(
      `UPDATE jobs SET featured_until = GREATEST(COALESCE(featured_until, now()), now()) + interval '${FEATURE_DAYS} days' WHERE id = $1`,
      [jobId]
    );
  });
  revalidatePath('/', 'layout');
  redirect('/employers?featured=1');
}

/* ---------------------------------------------------------------- AI talent search & applicant pipeline */

export async function aiTalentSearch(formData) {
  const user = await requireUser('/employers/candidates', 'employer');
  const db = await getDb();
  const jobId = Number(formData.get('jobId')) || null;
  let roleText = str(formData, 'role', 6000);
  if (jobId) {
    const job = await db.get('SELECT title, location, seniority, description_text FROM jobs WHERE id = $1 AND posted_by_user_id = $2', [jobId, user.id]);
    if (job) roleText = `${job.title} (${job.seniority}, ${job.location})\n${job.description_text}`;
  }
  if (roleText.length < 30) fail('/employers/candidates', 'Describe the role (at least a few lines) or pick one of your jobs.');
  if (!aiEnabled()) fail('/employers/candidates', 'AI search is not enabled on this site yet.');
  const id = await attempt('/employers/candidates', async () => {
    await checkAiQuota(db, user, 'rank');
    const pool = await searchCandidates(db, user, { limit: 200 });
    if (!pool.length) throw new AiError('No candidates are visible to recruiters yet.');
    // Keyword pre-filter keeps the AI prompt focused on the most relevant 30.
    const words = roleText.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || [];
    const scored = pool.map((c) => {
      const hay = `${c.headline} ${c.skills} ${c.summary} ${c.last_title} ${JSON.stringify(c.target_titles)}`.toLowerCase();
      return { c, s: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    }).sort((a, b) => b.s - a.s).slice(0, 30).map((x) => x.c);
    const results = await rankCandidates(roleText, scored);
    await recordAiUse(db, user, 'rank');
    const { id } = await db.get(
      'INSERT INTO talent_searches (recruiter_id, role_text, results) VALUES ($1, $2, $3) RETURNING id',
      [user.id, roleText.slice(0, 6000), JSON.stringify(results)]
    );
    return id;
  });
  redirect(`/employers/candidates?search=${id}`);
}

export async function setApplicantStage(formData) {
  const jobId = Number(formData.get('jobId'));
  const user = await requireUser(`/employers/jobs/${jobId}`, 'employer');
  const stage = String(formData.get('stage'));
  if (!STAGES.includes(stage)) return;
  await (await getDb()).run(
    `UPDATE applications a SET stage = $1 FROM jobs j
     WHERE a.job_id = j.id AND j.id = $2 AND j.posted_by_user_id = $3 AND a.user_id = $4`,
    [stage, jobId, user.id, Number(formData.get('candidateId'))]
  );
  revalidatePath(`/employers/jobs/${jobId}`);
}

export async function scoreApplicants(formData) {
  const jobId = Number(formData.get('jobId'));
  const back = `/employers/jobs/${jobId}`;
  const user = await requireUser(back, 'employer');
  const db = await getDb();
  const job = await db.get('SELECT * FROM jobs WHERE id = $1 AND posted_by_user_id = $2', [jobId, user.id]);
  if (!job) redirect('/employers');
  if (!aiEnabled()) fail(back, 'AI scoring is not enabled on this site yet.');
  await attempt(back, async () => {
    await checkAiQuota(db, user, 'applicants');
    const applicants = await db.all(
      `SELECT u.id, u.headline, u.location, u.years_experience, u.desired_salary, u.skills,
              u.cv_parsed->>'seniority' AS seniority, u.cv_parsed->>'summary' AS summary,
              u.cv_parsed->'experience'->0->>'title' AS last_title, u.cv_parsed->'target_titles' AS target_titles
       FROM applications a JOIN users u ON u.id = a.user_id WHERE a.job_id = $1 LIMIT 40`,
      [jobId]
    );
    if (!applicants.length) throw new AiError('There are no applicants to score yet.');
    const results = await rankCandidates(`${job.title} (${job.seniority}, ${job.location})\n${job.description_text}`, applicants);
    await recordAiUse(db, user, 'applicants');
    for (const r of results) {
      await db.run('UPDATE applications SET ai_score = $1, ai_reason = $2 WHERE job_id = $3 AND user_id = $4', [r.score, r.reason, jobId, r.candidate_id]);
    }
  });
  revalidatePath(back);
  redirect(`${back}?scored=1`);
}

/* ---------------------------------------------------------------- Interview prep (candidates) */

export async function prepareInterviewAction(formData) {
  const jobId = Number(formData.get('jobId'));
  const back = `/jobs/${jobId}/interview`;
  const user = await requireUser(back, 'candidate');
  const db = await getDb();
  const job = await getJob(db, jobId);
  if (!job) redirect('/jobs');
  if (!aiEnabled()) fail(back, 'AI interview preparation is not enabled on this site yet.');
  await attempt(back, async () => {
    const cvRow = await db.get(
      `SELECT data FROM cvs WHERE user_id = $1 AND (job_id = $2 OR kind = 'master') ORDER BY (job_id = $2) DESC NULLS LAST, updated_at DESC LIMIT 1`,
      [user.id, jobId]
    );
    const cvText = cvRow ? cvToText(normalizeCv(cvRow.data)) : JSON.stringify({ headline: user.headline, skills: user.skills, cv: user.cv_parsed });
    if (!cvRow && !user.cv_parsed && !user.headline) throw new AiError('Create your CV in CV Studio (or upload one) first, so the answers can use your real experience.');
    await checkAiQuota(db, user, 'interview');
    const data = await prepareInterview(cvText, job);
    await recordAiUse(db, user, 'interview');
    await db.run(
      `INSERT INTO interview_preps (user_id, job_id, data) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, job_id) DO UPDATE SET data = excluded.data, created_at = now()`,
      [user.id, jobId, JSON.stringify(data)]
    );
  });
  redirect(`${back}?ready=1`);
}
