import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { searchJobs } from '@/lib/jobs.mjs';
import { COUNTRIES, countryBySlug } from '@/lib/niche.mjs';
import JobCard from '@/components/JobCard';

const NAMES = { EWM: { short: 'SAP EWM', long: 'SAP EWM (Extended Warehouse Management)', path: '/sap-ewm-jobs' }, TM: { short: 'SAP TM', long: 'SAP TM (Transportation Management)', path: '/sap-tm-jobs' } };

export function seoMetadata(module, countrySlug) {
  const m = NAMES[module];
  const c = countrySlug ? countryBySlug(countrySlug) : null;
  if (countrySlug && !c) return {};
  const where = c ? ` in ${c.name}` : '';
  return {
    title: `${m.short} jobs${where}: consultant, lead & architect roles`,
    description: `Latest ${m.long} jobs${where}: permanent, contract and remote consultant roles, updated daily. Apply directly or get matched by our SAP supply chain recruiters.`,
    alternates: { canonical: `${m.path}${c ? `/${c.slug}` : ''}` },
  };
}

export default async function SeoJobList({ module, countrySlug, page = 1 }) {
  const m = NAMES[module];
  const c = countrySlug ? countryBySlug(countrySlug) : null;
  if (countrySlug && !c) notFound();
  const db = await getDb();
  const [result, byCountry] = await Promise.all([
    searchJobs(db, { module, country: c?.code, page, pageSize: 30 }),
    db.all(
      `SELECT country, COUNT(*)::int AS n FROM jobs j WHERE status = 'active' AND category ILIKE $1 AND country IS NOT NULL GROUP BY country ORDER BY n DESC`,
      [`%${module}%`]
    ),
  ]);
  const counts = new Map(byCountry.map((r) => [r.country, r.n]));
  const where = c ? ` in ${c.name}` : ' worldwide';
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: result.jobs.slice(0, 20).map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: `/jobs/${j.id}`, name: `${j.title} – ${j.company}` })),
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, '\\u003c') }} />
      <nav className="text-sm text-ink/55" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Home</Link> / <Link href={m.path} className="hover:text-brand-600">{m.short} jobs</Link>{c && <> / {c.name}</>}
      </nav>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{m.short} jobs{where}</h1>
      <p className="mt-1 max-w-3xl text-ink/65">
        {result.total} open {m.long} role{result.total === 1 ? '' : 's'}{where}: functional consultants, technical (ABAP) consultants, leads and solution architects. Updated daily.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href={m.path} className={`rounded-full border px-3 py-1 ${!c ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-canvas-200 bg-white hover:border-brand-500'}`}>All countries</Link>
        {COUNTRIES.filter((x) => counts.has(x.code) || x.code === c?.code).map((x) => (
          <Link key={x.code} href={`${m.path}/${x.slug}`} className={`rounded-full border px-3 py-1 ${x.code === c?.code ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-canvas-200 bg-white hover:border-brand-500'}`}>
            {x.name} <span className="text-ink/45">{counts.get(x.code) || 0}</span>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {result.jobs.map((j) => <JobCard key={j.id} job={j} />)}
          {result.jobs.length === 0 && (
            <div className="card p-8 text-center text-sm text-ink/60">
              No {m.short} jobs{where} right now. <Link href="/signup" className="font-semibold text-brand-600">Create your profile</Link> and we’ll match you when one opens.
            </div>
          )}
          {result.pages > 1 && <Link href={`/jobs?module=${module}${c ? `&country=${c.code}` : ''}&page=2`} className="btn-ghost w-full">See more {m.short} jobs</Link>}
        </div>
        <aside className="space-y-4">
          <div className="card bg-brand-50 p-5">
            <h2 className="text-lg">Get matched to {m.short} roles</h2>
            <p className="mt-1 text-sm text-ink/70">Create a free profile once. We introduce you to companies hiring {m.short} consultants, with your consent each time.</p>
            <Link href="/signup" className="btn-primary mt-4">Create my profile</Link>
          </div>
          <div className="card p-5">
            <h2 className="text-lg">Other searches</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><Link href={NAMES[module === 'EWM' ? 'TM' : 'EWM'].path + (c ? `/${c.slug}` : '')} className="text-brand-600">{NAMES[module === 'EWM' ? 'TM' : 'EWM'].short} jobs{where}</Link></li>
              <li><Link href={`/jobs?module=${module}&type=Contract`} className="text-brand-600">{m.short} contract & freelance jobs</Link></li>
              <li><Link href={`/jobs?module=${module}&remote=1`} className="text-brand-600">Remote {m.short} jobs</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
