#!/usr/bin/env node
/**
 * Email each user the new jobs matching their alerts since the last send.
 * Schedule daily:  npm run send-alerts
 * Uses Resend if RESEND_API_KEY is set, otherwise prints the emails.
 */
import { openDb } from '../lib/db.mjs';
import { searchJobs } from '../lib/jobs.mjs';
import { formatSalary } from '../lib/format.mjs';

const db = openDb();
const site = process.env.SITE_URL || 'http://localhost:3000';
const alerts = db
  .prepare('SELECT a.*, u.email, u.name FROM alerts a JOIN users u ON u.id = a.user_id')
  .all();

async function send(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n--- email to ${to}: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400)}…`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERTS_FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

let sent = 0;
for (const a of alerts) {
  const now = db.prepare("SELECT datetime('now') AS t").get().t;
  const { jobs, total } = searchJobs(db, {
    q: a.query, location: a.location, minSalary: a.min_salary, remote: a.remote, since: a.last_sent_at, pageSize: 10,
  });
  if (total > 0) {
    const items = jobs
      .map((j) => `<li><a href="${site}/jobs/${j.id}">${j.title}</a> — ${j.company}, ${j.location}${formatSalary(j.salary_min, j.salary_max, j.currency) ? ` · ${formatSalary(j.salary_min, j.salary_max, j.currency)}` : ''}</li>`)
      .join('');
    const label = [a.query, a.location].filter(Boolean).join(' in ') || 'your search';
    await send(
      a.email,
      `${total} new job${total > 1 ? 's' : ''} for ${label}`,
      `<p>Hi ${a.name},</p><p>New roles matching <b>${label}</b>:</p><ul>${items}</ul><p><a href="${site}/alerts">Manage alerts</a></p>`
    );
    sent++;
  }
  db.prepare('UPDATE alerts SET last_sent_at = ? WHERE id = ?').run(now, a.id);
}
console.log(`\nProcessed ${alerts.length} alerts, sent ${sent} emails.`);
