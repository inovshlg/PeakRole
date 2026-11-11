import { getDb } from '@/lib/db.mjs';
import { runWeeklyDigest } from '@/lib/digest.mjs';
import { cronAuthError } from '@/lib/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const denied = cronAuthError(request);
  if (denied) return denied;
  return Response.json(await runWeeklyDigest(await getDb()));
}
