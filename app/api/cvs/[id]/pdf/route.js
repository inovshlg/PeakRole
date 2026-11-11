import { getDb } from '@/lib/db.mjs';
import { getCurrentUser } from '@/lib/auth';
import { normalizeCv } from '@/lib/cv.mjs';
import { renderCvPdf, renderLetterPdf } from '@/components/cv/CvPdf';

export const dynamic = 'force-dynamic';

const fileSafe = (s) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'CV';

// GET /api/cvs/:id/pdf?doc=cv|letter&download=1. Only the CV's owner can read it.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });
  const db = await getDb();
  const row = await db.get(
    `SELECT c.*, j.company AS job_company FROM cvs c LEFT JOIN jobs j ON j.id = c.job_id WHERE c.id = $1 AND c.user_id = $2`,
    [id, user.id]
  );
  if (!row) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const doc = url.searchParams.get('doc') === 'letter' ? 'letter' : 'cv';
  const cv = normalizeCv(row.data);
  if (doc === 'letter' && !row.cover_letter) return new Response('No cover letter', { status: 404 });
  const pdf = doc === 'letter' ? await renderLetterPdf(cv, row.cover_letter, row.job_company) : await renderCvPdf(cv, row.template);

  const name = `${fileSafe(cv.full_name)}_${doc === 'letter' ? 'Cover_Letter' : 'CV'}${row.job_company ? `_${fileSafe(row.job_company)}` : ''}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${url.searchParams.get('download') ? 'attachment' : 'inline'}; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
