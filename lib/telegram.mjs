/**
 * Posts new jobs to a Telegram channel via the Bot API.
 * Needs TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHANNEL_ID (e.g. @ewmtmjobs),
 * with the bot added to the channel as an admin. Each job is posted once.
 */
import { siteUrl } from './email.mjs';
import { formatSalary } from './format.mjs';
import { countryByCode } from './niche.mjs';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const telegramEnabled = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);

export function jobMessage(j) {
  const salary = formatSalary(j.salary_min, j.salary_max, j.currency || 'USD');
  const where = [j.location, j.remote ? 'Remote OK' : null].filter(Boolean).join(' · ') || countryByCode(j.country)?.name || '';
  return [
    `<b>${esc(j.title)}</b>`,
    `🏢 ${esc(j.company)}`,
    where && `📍 ${esc(where)}`,
    `🧩 ${esc(j.category || 'SAP SCM')} · ${esc(j.employment_type === 'Contract' ? 'Contract' : 'Permanent')}`,
    salary && `💰 ${esc(salary)}`,
    j.min_experience === 0 ? '🎓 Freshers / entry-level welcome' : Number.isInteger(j.min_experience) ? `🎓 Min. experience: ${j.min_experience} yr${j.min_experience === 1 ? '' : 's'}` : null,
    '',
    `👉 <a href="${siteUrl()}/jobs/${j.id}">View &amp; apply</a>`,
  ].filter((x) => x !== null && x !== undefined && x !== false).join('\n');
}

/** Post up to `limit` jobs added in the last 2 days that haven't been posted yet. */
export async function postNewJobsToTelegram(db, { limit = 10, log = console.log } = {}) {
  if (!telegramEnabled()) return 0;
  const jobs = await db.all(
    `SELECT id, title, company, location, remote, country, category, employment_type, salary_min, salary_max, currency, min_experience
     FROM jobs WHERE status = 'active' AND source <> 'seed' AND telegram_posted_at IS NULL AND created_at > now() - interval '2 days'
     ORDER BY posted_at DESC LIMIT ${Math.min(30, limit)}`
  );
  let posted = 0;
  for (const j of jobs) {
    const res = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID, text: jobMessage(j), parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) {
      log(`✗ telegram: ${res.status} ${(await res.text()).slice(0, 200)}`);
      break; // stop on errors (bad token, bot not admin, rate limit)
    }
    await db.run('UPDATE jobs SET telegram_posted_at = now() WHERE id = $1', [j.id]);
    posted++;
    await new Promise((r) => setTimeout(r, 1200)); // stay well under Telegram's channel rate limit
  }
  if (posted) log(`✓ telegram: posted ${posted} new jobs`);
  return posted;
}
