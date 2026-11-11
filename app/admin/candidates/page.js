import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { timeAgo } from '@/lib/format.mjs';

export const dynamic = 'force-dynamic';

const MODULES = ['EWM', 'TM', 'WM', 'MM', 'SD', 'LE', 'IBP', 'ABAP'];
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days', 'Serving notice'];

export default async function AdminCandidates({ searchParams }) {
  const sp = await searchParams;
  const params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const where = ["u.role = 'candidate'", sp.all ? 'TRUE' : 'u.consent_at IS NOT NULL'];
  const q = (sp.q || '').trim().slice(0, 100);
  for (const term of q.split(/\s+/).filter(Boolean).slice(0, 5)) {
    const t = p(`%${term}%`);
    where.push(`(u.name ILIKE ${t} OR u.email ILIKE ${t} OR u.headline ILIKE ${t} OR u.skills ILIKE ${t} OR u.cv_parsed::text ILIKE ${t} OR u.admin_tags ILIKE ${t})`);
  }
  if (MODULES.includes(sp.module)) where.push(`u.sap_modules ILIKE ${p(`%${sp.module}%`)}`);
  if (Number(sp.min_exp) > 0) where.push(`COALESCE(u.years_experience, (u.cv_parsed->>'years_experience')::int, 0) >= ${p(Number(sp.min_exp))}`);
  if (sp.location) where.push(`u.location ILIKE ${p(`%${String(sp.location).slice(0, 60)}%`)}`);
  if (NOTICE.includes(sp.notice)) where.push(`u.notice_period = ${p(sp.notice)}`);
  if (sp.s4) where.push('u.s4hana = 1');
  if (sp.contract) where.push('u.open_contract = 1');
  if (sp.tag) where.push(`u.admin_tags ILIKE ${p(`%${String(sp.tag).slice(0, 40)}%`)}`);

  const rows = await (await getDb()).all(
    `SELECT u.id, u.name, u.email, u.phone, u.headline, u.location, u.sap_modules, u.s4hana, u.implementations, u.notice_period,
            u.expected_salary, u.admin_tags, u.consent_at, u.created_at, u.cv_name,
            COALESCE(u.years_experience, (u.cv_parsed->>'years_experience')::int) AS years,
            (SELECT COUNT(*)::int FROM submissions s WHERE s.candidate_id = u.id) AS submissions
     FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT 300`,
    params
  );

  return (
    <div>
      <h1 className="page-title">Candidates</h1>
      <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={q} className="input lg:col-span-2" placeholder="Name, email, skill, CV text or tag" aria-label="Search" />
        <select name="module" defaultValue={sp.module || ''} className="input" aria-label="Module"><option value="">Any module</option>{MODULES.map((m) => <option key={m}>{m}</option>)}</select>
        <select name="min_exp" defaultValue={sp.min_exp || ''} className="input" aria-label="Experience"><option value="">Any experience</option>{[3, 5, 8, 10, 15].map((y) => <option key={y} value={y}>{y}+ years</option>)}</select>
        <input name="location" defaultValue={sp.location || ''} className="input" placeholder="Location" aria-label="Location" />
        <select name="notice" defaultValue={sp.notice || ''} className="input" aria-label="Notice period"><option value="">Any notice period</option>{NOTICE.map((n) => <option key={n}>{n}</option>)}</select>
        <input name="tag" defaultValue={sp.tag || ''} className="input" placeholder="Tag, e.g. shared with Client X" aria-label="Tag" />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="s4" value="1" defaultChecked={!!sp.s4} className="h-4 w-4 accent-brand-500" />S/4HANA</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="contract" value="1" defaultChecked={!!sp.contract} className="h-4 w-4 accent-brand-500" />Open to contract</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="all" value="1" defaultChecked={!!sp.all} className="h-4 w-4 accent-brand-500" />Include no-consent</label>
        </div>
        <button className="btn-primary lg:col-start-4">Search</button>
      </form>
      <p className="mt-4 text-sm text-ink/60">{rows.length} candidate{rows.length === 1 ? '' : 's'}{!sp.all && ' with sharing consent'}</p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-canvas-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-canvas-50 text-xs uppercase text-ink/55">
            <tr>{['Candidate', 'Modules', 'Exp', 'Location', 'Notice', 'Expected', 'Tags', 'Joined'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-canvas-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-canvas-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/candidates/${c.id}`} className="font-semibold text-brand-600">{c.name}</Link>
                  <p className="max-w-[260px] truncate text-xs text-ink/55">{c.headline || c.email}</p>
                  {!c.consent_at && <span className="chip mt-1 bg-negative/10 text-negative">No consent</span>}
                </td>
                <td className="px-4 py-3">{c.sap_modules || '—'}{c.s4hana ? <span className="chip-info ml-1">S/4</span> : null}</td>
                <td className="px-4 py-3">{c.years ?? '—'}{c.implementations ? <span className="block text-xs text-ink/50">{c.implementations} impl.</span> : null}</td>
                <td className="px-4 py-3">{c.location || '—'}</td>
                <td className="px-4 py-3">{c.notice_period || '—'}</td>
                <td className="px-4 py-3">{c.expected_salary || '—'}</td>
                <td className="px-4 py-3 text-xs">{c.admin_tags || ''}{c.submissions ? <span className="block text-ink/50">{c.submissions} submission{c.submissions > 1 ? 's' : ''}</span> : null}</td>
                <td className="px-4 py-3 text-xs text-ink/50">{timeAgo(c.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink/55">No candidates match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
