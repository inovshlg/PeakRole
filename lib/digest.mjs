/** Weekly email digest of new EWM/TM jobs for candidates who opted in. */
import { sendEmail, siteUrl, esc } from './email.mjs';
import { formatSalary } from './format.mjs';

export async function runWeeklyDigest(db, log = console.log) {
  const users = await db.all(
    "SELECT id, name, email, sap_modules FROM users WHERE role = 'candidate' AND digest_opt_in = 1 AND consent_at IS NOT NULL"
  );
  const jobs = await db.all(
    `SELECT id, title, company, location, remote, category, employment_type, salary_min, salary_max, currency
     FROM jobs WHERE status = 'active' AND created_at > now() - interval '7 days' ORDER BY posted_at DESC LIMIT 200`
  );
  let sent = 0;
  for (const u of users) {
    const mods = (u.sap_modules || '').toUpperCase();
    const wantsEwm = mods.includes('EWM'), wantsTm = /\bTM\b/.test(mods);
    const mine = jobs.filter((j) => (!wantsEwm && !wantsTm) || (wantsEwm && /EWM/.test(j.category || '')) || (wantsTm && /TM/.test(j.category || ''))).slice(0, 15);
    if (!mine.length) continue;
    const rows = mine.map((j) => {
      const s = formatSalary(j.salary_min, j.salary_max, j.currency || 'USD');
      return `<li style="margin-bottom:8px"><a href="${siteUrl()}/jobs/${j.id}"><b>${esc(j.title)}</b></a><br>${esc(j.company)} · ${esc(j.location || '')}${j.remote ? ' · Remote' : ''}${s ? ` · ${esc(s)}` : ''}</li>`;
    }).join('');
    try {
      await sendEmail(u.email, `${mine.length} new SAP ${wantsEwm && !wantsTm ? 'EWM' : wantsTm && !wantsEwm ? 'TM' : 'EWM & TM'} jobs this week`,
        `<p>Hi ${esc(u.name)},</p><p>New roles from the last 7 days:</p><ul>${rows}</ul>
         <p><a href="${siteUrl()}/jobs">See all jobs</a> · <a href="${siteUrl()}/profile#privacy">Unsubscribe from this digest</a></p>`);
      sent++;
    } catch (err) {
      log(`✗ digest to user ${u.id}: ${err.message}`);
    }
  }
  log(`Weekly digest: ${sent} emails sent to ${users.length} subscribers.`);
  return { subscribers: users.length, sent };
}
