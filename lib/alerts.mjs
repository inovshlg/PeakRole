/** Email each user the new jobs matching their alerts since the last send. Used by `npm run send-alerts` and the Vercel cron. */
import { searchJobs } from './jobs.mjs';
import { formatSalary } from './format.mjs';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function send(to, subject, html, log) {
  if (!process.env.RESEND_API_KEY) {
    log(`--- (no RESEND_API_KEY) email to ${to}: ${subject}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERTS_FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function runAlerts(db, log = console.log) {
  const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  // Weekly alerts only go out once 7 days have passed since the last send.
  const alerts = await db.all(
    `SELECT a.*, u.email, u.name FROM alerts a JOIN users u ON u.id = a.user_id
     WHERE a.frequency <> 'weekly' OR a.last_sent_at < now() - interval '6 days 20 hours'`
  );
  let sent = 0;
  for (const a of alerts) {
    const { t: now } = await db.get('SELECT now() AS t');
    const { jobs, total } = await searchJobs(db, {
      q: a.query, location: a.location, minSalary: a.min_salary, remote: a.remote, module: a.module || '', country: a.country || '', since: a.last_sent_at, pageSize: 10,
    });
    if (total > 0) {
      const items = jobs
        .map((j) => {
          const sal = formatSalary(j.salary_min, j.salary_max, j.currency);
          return `<li><a href="${site}/jobs/${j.id}">${esc(j.title)}</a> at ${esc(j.company)}, ${esc(j.location)}${sal ? ` · ${sal}` : ''}</li>`;
        })
        .join('');
      const label = [[a.module && `SAP ${a.module}`, a.query].filter(Boolean).join(' '), a.location || a.country].filter(Boolean).join(' in ') || 'your search';
      try {
        await send(a.email, `${total} new job${total > 1 ? 's' : ''} for ${label}`,
          `<p>Hi ${esc(a.name)},</p><p>New roles matching <b>${esc(label)}</b>:</p><ul>${items}</ul><p><a href="${site}/alerts">Manage alerts</a></p>`, log);
        sent++;
      } catch (err) {
        log(`✗ alert ${a.id}: ${err.message}`);
        continue; // keep last_sent_at so the jobs are retried next run
      }
    }
    await db.run('UPDATE alerts SET last_sent_at = $1 WHERE id = $2', [now, a.id]);
  }
  log(`Processed ${alerts.length} alerts, sent ${sent} emails.`);
  return { alerts: alerts.length, sent };
}
