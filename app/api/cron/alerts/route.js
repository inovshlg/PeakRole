import { getDb } from '@/lib/db.mjs';
import { runAlerts } from '@/lib/alerts.mjs';
import { cronAuthError } from '@/lib/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const denied = cronAuthError(request);
  if (denied) return denied;
  return Response.json(await runAlerts(await getDb()));
}
