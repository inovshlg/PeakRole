/** Transactional email via Resend (RESEND_API_KEY). Without a key, emails are only logged. */
export const siteUrl = () =>
  process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email not sent: no RESEND_API_KEY] to=${to} subject=${subject}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERTS_FROM_EMAIL || 'PeakRole <onboarding@resend.dev>', to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return true;
}
