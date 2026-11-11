import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { slugify } from '@/lib/format.mjs';
import CompanyMark from '@/components/CompanyMark';

export const metadata = { title: 'Companies hiring' };
export const dynamic = 'force-dynamic';

export default async function Companies({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim().slice(0, 80);
  const rows = await (await getDb()).all(
    `SELECT company, MAX(company_domain) AS domain, COUNT(*)::int AS n,
            string_agg(DISTINCT split_part(location, ',', 1), ', ') AS cities
     FROM jobs WHERE status = 'active' ${q ? 'AND company ILIKE $1' : ''}
     GROUP BY company ORDER BY n DESC, company LIMIT 200`,
    q ? [`%${q}%`] : []
  );
  return (
    <div className="container-x py-8">
      <h1 className="page-title">Companies hiring</h1>
      <p className="mt-1 text-ink/60">{rows.length} companies with open jobs</p>
      <form className="mt-5 flex max-w-md gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Search company" aria-label="Search company" />
        <button className="btn-primary">Search</button>
      </form>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <Link key={c.company} href={`/companies/${slugify(c.company)}`} className="card card-hover flex items-center gap-4 p-4">
            <CompanyMark name={c.company} domain={c.domain} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{c.company}</p>
              <p className="truncate text-xs text-ink/55">{c.cities}</p>
              <p className="text-sm font-medium text-brand-600">{c.n} open job{c.n === 1 ? '' : 's'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
