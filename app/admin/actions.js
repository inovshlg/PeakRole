'use server';

/** Admin CRM actions (candidate notes/tags, clients, requirements, submissions) + the public hiring enquiry form. */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db.mjs';
import { requireAdmin } from '@/lib/auth';
import { looksLikeSpam } from '@/lib/spam.mjs';
import { sendEmail, siteUrl, esc } from '@/lib/email.mjs';

const str = (fd, k, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const id = (fd, k) => { const n = Number(fd.get(k)); return Number.isInteger(n) && n > 0 ? n : null; };
const fail = (path, msg) => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
const SUBMISSION_STATUSES = ['submitted', 'interview', 'offer', 'joined', 'rejected', 'withdrawn'];

export async function addCandidateNote(formData) {
  const admin = await requireAdmin();
  const candidateId = id(formData, 'candidateId');
  const body = str(formData, 'body', 4000);
  if (candidateId && body) await (await getDb()).run('INSERT INTO candidate_notes (candidate_id, author_id, body) VALUES ($1, $2, $3)', [candidateId, admin.id, body]);
  revalidatePath(`/admin/candidates/${candidateId}`);
}

export async function setCandidateTags(formData) {
  await requireAdmin();
  const candidateId = id(formData, 'candidateId');
  const tags = str(formData, 'tags', 500).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20).join(', ');
  await (await getDb()).run('UPDATE users SET admin_tags = $1 WHERE id = $2', [tags || null, candidateId]);
  revalidatePath(`/admin/candidates/${candidateId}`);
}

export async function createClient(formData) {
  await requireAdmin();
  const name = str(formData, 'name', 200);
  if (!name) fail('/admin/clients', 'Client name is required.');
  const { id: clientId } = await (await getDb()).get(
    'INSERT INTO clients (name, contact_name, contact_email, contact_phone, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [name, str(formData, 'contact_name', 150) || null, str(formData, 'contact_email', 200) || null, str(formData, 'contact_phone', 40) || null, str(formData, 'notes', 3000) || null]
  );
  redirect(`/admin/clients/${clientId}`);
}

export async function createRequirement(formData) {
  await requireAdmin();
  const clientId = id(formData, 'clientId');
  const title = str(formData, 'title', 200);
  if (!clientId || !title) fail(`/admin/clients/${clientId}`, 'Requirement title is required.');
  await (await getDb()).run(
    'INSERT INTO requirements (client_id, title, module, location, fee, details) VALUES ($1, $2, $3, $4, $5, $6)',
    [clientId, title, str(formData, 'module', 40) || null, str(formData, 'location', 150) || null, str(formData, 'fee', 150) || null, str(formData, 'details', 4000) || null]
  );
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function setRequirementStatus(formData) {
  await requireAdmin();
  const status = ['open', 'on hold', 'filled', 'closed'].includes(formData.get('status')) ? formData.get('status') : 'open';
  await (await getDb()).run('UPDATE requirements SET status = $1 WHERE id = $2', [status, id(formData, 'requirementId')]);
  revalidatePath(`/admin/clients/${id(formData, 'clientId')}`);
}

/** Put a candidate forward for a client requirement. Only candidates who have given sharing consent. */
export async function submitCandidate(formData) {
  await requireAdmin();
  const candidateId = id(formData, 'candidateId');
  const requirementId = id(formData, 'requirementId');
  const back = `/admin/candidates/${candidateId}`;
  const db = await getDb();
  const c = await db.get("SELECT consent_at FROM users WHERE id = $1 AND role = 'candidate'", [candidateId]);
  if (!c?.consent_at) fail(back, 'This candidate has not given consent to share their profile.');
  if (!requirementId) fail(back, 'Choose a requirement.');
  await db.run('INSERT INTO submissions (requirement_id, candidate_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [requirementId, candidateId]);
  revalidatePath(back);
  redirect(`${back}?submitted=1`);
}

export async function updateSubmission(formData) {
  await requireAdmin();
  const status = SUBMISSION_STATUSES.includes(formData.get('status')) ? formData.get('status') : 'submitted';
  const fee = Number(String(formData.get('fee_amount') || '').replace(/[^\d]/g, '')) || null;
  await (await getDb()).run(
    'UPDATE submissions SET status = $1, fee_amount = $2, fee_currency = $3, notes = $4, updated_at = now() WHERE id = $5',
    [status, fee, str(formData, 'fee_currency', 3).toUpperCase() || null, str(formData, 'notes', 2000) || null, id(formData, 'submissionId')]
  );
  revalidatePath('/admin', 'layout');
}

/** Public: a company tells us what they need. Creates a client + requirement for the admin. */
export async function submitEnquiry(formData) {
  if (looksLikeSpam(formData)) fail('/employers', 'Please try again.');
  const company = str(formData, 'company', 200);
  const email = str(formData, 'email', 200);
  const role = str(formData, 'role', 200);
  if (!company || !/^\S+@\S+\.\S+$/.test(email) || !role) fail('/employers', 'Please fill in company, work email and the role you need.');
  const db = await getDb();
  const { id: clientId } = await db.get(
    "INSERT INTO clients (name, contact_name, contact_email, contact_phone, source) VALUES ($1, $2, $3, $4, 'enquiry') RETURNING id",
    [company, str(formData, 'name', 150) || null, email, str(formData, 'phone', 40) || null]
  );
  await db.run(
    'INSERT INTO requirements (client_id, title, module, location, details) VALUES ($1, $2, $3, $4, $5)',
    [clientId, role, str(formData, 'module', 40) || null, str(formData, 'location', 150) || null, str(formData, 'details', 4000) || null]
  );
  const admins = String(process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (admins[0]) {
    try {
      await sendEmail(admins[0], `New hiring enquiry: ${company} – ${role}`,
        `<p><b>${esc(company)}</b> (${esc(email)}) needs: <b>${esc(role)}</b> ${esc(str(formData, 'location', 150))}</p><p>${esc(str(formData, 'details', 4000))}</p><p><a href="${siteUrl()}/admin/clients/${clientId}">Open in admin</a></p>`);
    } catch (err) { console.error('Enquiry email failed', err.message); }
  }
  redirect('/employers?sent=1');
}
