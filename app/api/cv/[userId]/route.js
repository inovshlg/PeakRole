import { getDb } from '@/lib/db.mjs';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { normalizeCv } from '@/lib/cv.mjs';
import { renderCvPdf } from '@/components/cv/CvPdf';

export const dynamic = 'force-dynamic';

/**
 * A candidate's CV. Allowed for the candidate, or for a recruiter who has unlocked them,
 * received their application, or is in a conversation with them.
 * Serves the uploaded file if there is one, otherwise the latest CV Studio CV as a PDF.
 * ?job=ID prefers the CV the candidate tailored for that job (as sent with the application).
 */
export async function GET(request, { params }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response('Unauthorized', { status: 401 });
  const id = Number((await params).userId);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });
  const db = await getDb();

  let allowed = viewer.id === id || isAdmin(viewer);
  if (!allowed && viewer.role === 'employer') {
    allowed = !!(await db.get(
      `SELECT 1 AS ok FROM unlocks WHERE recruiter_id = $1 AND candidate_id = $2
       UNION SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.posted_by_user_id = $1 AND a.user_id = $2
       UNION SELECT 1 FROM conversations WHERE recruiter_id = $1 AND candidate_id = $2
       LIMIT 1`,
      [viewer.id, id]
    ));
  }
  if (!allowed) return new Response('Not found', { status: 404 });

  const jobId = Number(new URL(request.url).searchParams.get('job')) || null;
  const applied = jobId && await db.get(
    `SELECT c.data, c.template, u.name FROM applications a JOIN cvs c ON c.id = a.cv_id JOIN users u ON u.id = a.user_id
     WHERE a.job_id = $1 AND a.user_id = $2`,
    [jobId, id]
  );
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const pdfFrom = async (row) => new Response(new Uint8Array(await renderCvPdf(normalizeCv(row.data), row.template)), {
    headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${(row.name || 'CV').replace(/[^\w ]+/g, '').replace(/\s+/g, '_')}_CV.pdf"` },
  });
  if (applied) return pdfFrom(applied);

  const file = await db.get('SELECT filename, mime, data FROM cv_files WHERE user_id = $1', [id]);
  if (file) {
    return new Response(file.data, {
      headers: { ...headers, 'Content-Type': file.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}` },
    });
  }
  const studio = await db.get(
    "SELECT c.data, c.template, u.name FROM cvs c JOIN users u ON u.id = c.user_id WHERE c.user_id = $1 AND c.kind = 'master' ORDER BY c.updated_at DESC LIMIT 1",
    [id]
  );
  return studio ? pdfFrom(studio) : new Response('Not found', { status: 404 });
}
