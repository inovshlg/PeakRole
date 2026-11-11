import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { LOCATION_ALIASES, MARKET } from '@/lib/market.mjs';
import { SENIORITIES } from '@/lib/jobs.mjs';
import { initials } from '@/lib/format.mjs';

export const metadata = { title: 'Headhunters', description: `Executive search consultants and headhunters in ${MARKET.country}.` };
export const dynamic = 'force-dynamic';

const FIELDS = ['Technology', 'Finance', 'Sales', 'Marketing', 'Operations', 'Manufacturing', 'Healthcare', 'Consulting', 'HR', 'Legal'];

export default async function Headhunters({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const city = (sp.city || '').trim();
  const level = SENIORITIES.includes(sp.level) ? sp.level : '';
  const params = [];
  const where = ["role = 'employer'", "recruiter_type = 'headhunter'"];
  if (q) { params.push(`%${q}%`); where.push(`(specialisms ILIKE $${params.length} OR bio ILIKE $${params.length} OR company ILIKE $${params.length} OR name ILIKE $${params.length})`); }
  if (city) { params.push((LOCATION_ALIASES[city.toLowerCase()] ?? [city.toLowerCase()]).map((x) => `%${x}%`)); where.push(`regions ILIKE ANY($${params.length}::text[])`); }
  if (level) { params.push(`%${level}%`); where.push(`levels ILIKE $${params.length}`); }
  const people = await (await getDb()).all(
    `SELECT id, name, company, bio, specialisms, regions, levels, years_recruiting, placements
     FROM users WHERE ${where.join(' AND ')}
     ORDER BY (bio IS NOT NULL AND specialisms IS NOT NULL) DESC, placements DESC NULLS LAST, created_at DESC LIMIT 60`,
    params
  );

  return (
    <div className="container-x py-8">
      <p className="eyebrow">Headhunter network</p>
      <h1 className="page-title mt-1">Find the right headhunter</h1>
      <p className="mt-1 max-w-2xl text-ink/60">Executive search consultants who recruit senior and leadership roles. Message them directly with your profile.</p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} className="input" placeholder="Industry, function or name, e.g. Fintech, CFO" aria-label="Search" />
        <select name="city" defaultValue={city} className="input" aria-label="City"><option value="">All cities</option>{MARKET.cities.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="level" defaultValue={level} className="input" aria-label="Level"><option value="">All levels</option>{SENIORITIES.slice(0, 4).map((l) => <option key={l}>{l}</option>)}</select>
        <button className="btn-primary">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {FIELDS.map((f) => <Link key={f} href={`/headhunters?q=${encodeURIComponent(f)}`} className="rounded-full border border-canvas-200 bg-white px-3 py-1 text-ink/70 hover:border-brand-500 hover:text-brand-600">{f}</Link>)}
      </div>

      <p className="mt-6 text-sm text-ink/60">{people.length} headhunter{people.length === 1 ? '' : 's'}</p>
      {people.length === 0 ? (
        <div className="card mt-3 p-10 text-center">
          <p className="text-lg font-semibold">No headhunters match yet</p>
          <p className="mt-1 text-sm text-ink/60">The network is growing. Are you a headhunter? <Link href="/signup?role=headhunter" className="font-semibold text-brand-600">Create your free profile</Link>.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <Link key={p.id} href={`/headhunters/${p.id}`} className="card card-hover flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{initials(p.name)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-sm text-ink/60">{p.company}</p>
                </div>
              </div>
              {p.bio && <p className="mt-3 line-clamp-3 text-sm text-ink/70">{p.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(p.specialisms || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4).map((s) => <span key={s} className="chip-info">{s}</span>)}
              </div>
              <p className="mt-auto pt-4 text-xs text-ink/55">
                {[p.regions, p.levels, p.years_recruiting && `${p.years_recruiting} yrs recruiting`, p.placements && `${p.placements} placements`].filter(Boolean).join(' · ')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
