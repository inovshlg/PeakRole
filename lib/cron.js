/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Reject anything else. */
export function cronAuthError(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('CRON_SECRET is not set', { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  return null;
}
