/**
 * Basic form spam protection without CAPTCHAs: a hidden "website" field that people never fill
 * (bots usually do) and a timestamp that must be at least 3 seconds old and under a day.
 */
export const HONEYPOT = 'website';

export function looksLikeSpam(formData) {
  if (String(formData.get(HONEYPOT) || '').trim()) return true;
  const started = Number(formData.get('form_ts'));
  if (!started) return true;
  const age = Date.now() - started;
  return age < 3000 || age > 86_400_000;
}
