import { getDb } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';

// A CV can be downloaded by its owner, or by employers when the candidate is visible to recruiters.
export async function GET(_req, { params }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response('Unauthorized', { status: 401 });
  const id = Number((await params).userId);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });
  const db = await getDb();
  const owner = await db.get('SELECT id, visible_to_recruiters FROM users WHERE id = $1', [id]);
  const allowed = owner && (viewer.id === owner.id || (viewer.role === 'employer' && owner.visible_to_recruiters));
  if (!allowed) return new Response('Not found', { status: 404 });
  const file = await db.get('SELECT filename, mime, data FROM cv_files WHERE user_id = $1', [id]);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.data, {
    headers: {
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
