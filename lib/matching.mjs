import { aiEnabled, rankJobs, explainFit, keywordScore, matchProfile, profileIsUsable, AiError } from './ai.mjs';

const SHORTLIST = 25;
export const REFRESH_COOLDOWN_MIN = { free: 24 * 60, premium: 10 };

/** Minutes until this user may refresh their matches again (0 = now). */
export function refreshWaitMinutes(user) {
  if (!user.matches_refreshed_at) return 0;
  const cooldown = REFRESH_COOLDOWN_MIN[user.plan] ?? REFRESH_COOLDOWN_MIN.free;
  const elapsed = (Date.now() - new Date(user.matches_refreshed_at).getTime()) / 60000;
  return Math.max(0, Math.ceil(cooldown - elapsed));
}

/** Recompute a user's top matches: keyword shortlist → AI ranking (when configured). */
export async function refreshMatches(db, user) {
  const profile = matchProfile(user);
  if (!profileIsUsable(profile)) {
    throw new AiError('Add a headline and skills, or upload your CV, so we know what to match you with.');
  }
  const jobs = await db.all(
    `SELECT id, title, company, location, remote, seniority, employment_type, salary_min, salary_max, currency,
            substr(description_text, 1, 1500) AS description_text
     FROM jobs WHERE status = 'active' ORDER BY posted_at DESC LIMIT 500`
  );
  if (jobs.length === 0) throw new AiError('There are no open jobs to match against yet.');

  const shortlist = jobs
    .map((j) => ({ ...j, pre: keywordScore(profile, j) }))
    .sort((a, b) => b.pre - a.pre)
    .slice(0, SHORTLIST);

  const results = aiEnabled()
    ? (await rankJobs(profile, shortlist)).map((m) => ({ ...m, ai: 1 }))
    : shortlist.map((j) => ({ job_id: j.id, score: j.pre, reason: 'Based on your target titles, skills, seniority and location.', ai: 0 }));

  await db.run('DELETE FROM job_matches WHERE user_id = $1 AND detailed = 0', [user.id]);
  for (const m of results) {
    await db.run(
      `INSERT INTO job_matches (user_id, job_id, score, reason, ai) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, job_id) DO NOTHING`,
      [user.id, m.job_id, m.score, m.reason, m.ai]
    );
  }
  await db.run('UPDATE users SET matches_refreshed_at = now() WHERE id = $1', [user.id]);
  return results.length;
}

/** Detailed AI fit analysis for one job, cached per user+job. */
export async function checkFit(db, user, job) {
  if (!aiEnabled()) throw new AiError('AI fit checks are not enabled on this site yet.');
  const profile = matchProfile(user);
  if (!profileIsUsable(profile)) throw new AiError('Upload your CV or complete your profile first.');
  const fit = await explainFit(profile, job);
  await db.run(
    `INSERT INTO job_matches (user_id, job_id, score, reason, strengths, gaps, detailed, ai)
     VALUES ($1, $2, $3, $4, $5, $6, 1, 1)
     ON CONFLICT (user_id, job_id) DO UPDATE SET score = excluded.score, reason = excluded.reason,
       strengths = excluded.strengths, gaps = excluded.gaps, detailed = 1, ai = 1, created_at = now()`,
    [user.id, job.id, fit.score, fit.summary, JSON.stringify({ strengths: fit.strengths, tips: fit.application_tips }), JSON.stringify(fit.gaps)]
  );
  return fit;
}

/** Map of job_id → { score, ai } for a user, for badges on job cards. */
export async function matchMap(db, userId) {
  if (!userId) return new Map();
  const rows = await db.all('SELECT job_id, score, ai FROM job_matches WHERE user_id = $1', [userId]);
  return new Map(rows.map((r) => [r.job_id, r]));
}
