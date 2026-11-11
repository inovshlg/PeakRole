import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.mjs';
import { CARD_COLS } from '@/lib/jobs.mjs';
import { COMPANY_SLUG_SQL, formatSalary } from '@/lib/format.mjs';
import { MARKET } from '@/lib/market.mjs';
import JobCard from '@/components/JobCard';
import CompanyMark from '@/components/CompanyMark';

export const dynamic = 'force-dynamic';

async function load(slug) {
  const db = await getDb();
  const jobs = await db.all(
    `SELECT ${CARD_COLS}, substr(j.description_text, 1, 220) AS snippet FROM jobs j
     WHERE ${COMPANY_SLUG_SQL.replace('company', 'j.company')} = $1 AND j.status = 'active'
     ORDER BY (j.featured_until > now()) DESC NULLS LAST, j.posted_at DESC LIMIT 100`,
    [slug]
  );
  const profile = await db.get(
    `SELECT company, company_about, company_website, company_size, company_industry FROM users
     WHERE role = 'employer' AND recruiter_type IS DISTINCT FROM 'headhunter' AND ${COMPANY_SLUG_SQL} = $1 AND company_about IS NOT NULL
     ORDER BY created_at LIMIT 1`,
    [slug]
  );
  return { jobs, profile };
}

export async function generateMetadata({ params }) {
  const { jobs, profile } = await load((await params).slug);
  const name = profile?.company || jobs[0]?.company;
  return name ? { title: `${name} jobs`, description: `${jobs.length} open roles at ${name} in ${MARKET.country}.` } : {};
}

export default async function CompanyPage({ params }) {
  const { slug } = await params;
  const { jobs, profile } = await load(slug);
  if (!jobs.length && !profile) notFound();
  const name = profile?.company || jobs[0].company;
  const domain = jobs.find((j) => j.company_domain)?.company_domain || profile?.company_website;
  const salaried = jobs.filter((j) => j.salary_min || j.salary_max);
  const cities = [...new Set(jobs.map((j) => j.location.split(',')[0]).filter(Boolean))].slice(0, 6);

  return (
    <div className="container-x py-8">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <CompanyMark name={name} domain={domain} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{name}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {[profile?.company_industry, profile?.company_size && `${profile.company_size} employees`, cities.join(', ')].filter(Boolean).join(' · ')}
          </p>
        </div>
        {profile?.company_website && <a href={profile.company_website} target="_blank" rel="noopener nofollow" className="btn-ghost">Website ↗</a>}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="section-title mb-3">{jobs.length} open role{jobs.length === 1 ? '' : 's'}</h2>
          <div className="space-y-3">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
        <aside className="space-y-4">
          {profile?.company_about && <div className="card p-5"><h2 className="section-title">About</h2><p className="mt-2 whitespace-pre-line text-sm text-ink/75">{profile.company_about}</p></div>}
          {salaried.length > 0 && (
            <div className="card p-5 text-sm">
              <h2 className="section-title">Pay at {name}</h2>
              <ul className="mt-3 space-y-2">{salaried.slice(0, 6).map((j) => (
                <li key={j.id} className="flex justify-between gap-3"><Link href={`/jobs/${j.id}`} className="truncate hover:text-brand-600">{j.title}</Link><b className="shrink-0">{formatSalary(j.salary_min, j.salary_max, j.currency)}</b></li>
              ))}</ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
