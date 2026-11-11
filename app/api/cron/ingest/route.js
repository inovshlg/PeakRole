import { getDb } from '@/lib/db.mjs';
import { runIngest } from '@/lib/ingest.mjs';
import { cronAuthError } from '@/lib/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const denied = cronAuthError(request);
  if (denied) return denied;
  const result = await runIngest(await getDb());
  return Response.json(result);
}
