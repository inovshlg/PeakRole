import crypto from 'node:crypto';

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. To run a job by hand from a
 * browser, open the URL with `?key=<CRON_SECRET>` instead. Anything else is rejected.
 */
export function cronAuthError(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 8) {
    return new Response('Set CRON_SECRET (at least 8 characters) in Vercel → Settings → Environment Variables, then redeploy.', { status: 500 });
  }
  const header = request.headers.get('authorization') || '';
  const key = new URL(request.url).searchParams.get('key') || '';
  if (same(header, `Bearer ${secret}`) || same(key, secret)) return null;
  return new Response('Unauthorized', { status: 401 });
}
