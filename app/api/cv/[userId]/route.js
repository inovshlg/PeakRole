import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb, DATA_DIR } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';

const TYPES = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

// A CV can be downloaded by its owner, or by employers when the candidate is visible to recruiters.
export async function GET(_req, { params }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response('Unauthorized', { status: 401 });
  const id = Number((await params).userId);
  const owner = getDb().prepare('SELECT id, cv_path, cv_name, visible_to_recruiters FROM users WHERE id = ?').get(id);
  const allowed = owner && (viewer.id === owner.id || (viewer.role === 'employer' && owner.visible_to_recruiters));
  if (!allowed || !owner.cv_path) return new Response('Not found', { status: 404 });
  const file = await fs.readFile(path.join(DATA_DIR, 'uploads', path.basename(owner.cv_path))).catch(() => null);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file, {
    headers: {
      'Content-Type': TYPES[path.extname(owner.cv_path)] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(owner.cv_name || 'cv')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
