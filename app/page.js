import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, facetCounts } from '@/lib/jobs.mjs';
import { MARKET } from '@/lib/market.mjs';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

const FEATURES = [
  ['/cv', 'CV Studio', 'Build a professional CV with AI and tailor it to every job, with a matching cover letter.', 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6'],
  ['/headhunters', 'Headhunter network', 'Find executive search consultants by industry and city, and message them directly.', 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0'],
  ['/matches', 'AI job matches', 'Upload your CV once; we rank every open role by how well it fits you.', 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z'],
  ['/salaries', 'Salary insights', `Know your worth: real salary ranges by role and city across ${MARKET.country}.`, 'M4 19V9M10 19V5M16 19v-7M22 19H2'],
];

export default async function Home() {
  const db = await getDb();
  const [stats, { jobs }, hh] = await Promise.all([
    facetCounts(db),
    searchJobs(db, { sort: 'salary', pageSize: 6 }),
    db.get("SELECT COUNT(*)::int AS n FROM users WHERE role = 'employer' AND recruiter_type = 'headhunter'"),
  ]);

  return (
    <>
      <section className="bg-shell text-white">
        <div className="container-x grid gap-10 pb-14 pt-12 sm:pb-20 sm:pt-16 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="mb-4 text-sm font-medium text-white/60">For senior & leadership professionals in {MARKET.country}</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-[56px]">
              Your next leadership role, <span className="text-[#7cb8ff]">salary shown up front.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              Real roles from top employers, CVs tailored by AI for every application, and direct access to India’s headhunters.
            </p>
            <div className="mt-8 max-w-3xl"><SearchBar dark /></div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {MARKET.cities.map((c) => (
                <Link key={c} href={`/jobs?location=${encodeURIComponent(c)}`} className="rounded-full border border-white/15 px-3 py-1 text-white/80 hover:bg-white/10">{c}</Link>
              ))}
              <Link href="/jobs?remote=1" className="rounded-full border border-white/15 px-3 py-1 text-white/80 hover:bg-white/10">Remote</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [stats.total.toLocaleString('en-IN'), 'open roles'],
              [stats.companies.toLocaleString('en-IN'), 'companies hiring'],
              [`${Math.round((stats.withSalary / Math.max(stats.total, 1)) * 100)}%`, 'show a salary'],
              [hh.n ? hh.n.toLocaleString('en-IN') : 'New', 'headhunters'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-3xl font-semibold">{v}</p>
                <p className="mt-1 text-sm text-white/60">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x -mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([href, title, text, icon]) => (
          <Link key={href} href={href} className="card card-hover group p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-5 w-5" aria-hidden><path d={icon} /></svg>
            </span>
            <h2 className="mt-4 text-base font-semibold group-hover:text-brand-600">{title}</h2>
            <p className="mt-1 text-sm text-ink/60">{text}</p>
          </Link>
        ))}
      </section>

      <section className="container-x mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="eyebrow">Top-paying</p><h2 className="text-2xl">Highest-paying roles right now</h2></div>
          <Link href="/jobs?sort=salary" className="btn-quiet shrink-0">See all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
      </section>

      <section className="container-x mt-14">
        <p className="eyebrow">Explore</p>
        <h2 className="mb-5 text-2xl">Browse by field</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.categories.map((c) => (
            <Link key={c.name} href={`/jobs?category=${encodeURIComponent(c.name)}`} className="card card-hover p-4">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="mt-1 text-xs text-ink/50">{c.n} roles</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-14 grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col justify-between gap-5 p-8">
          <div><p className="eyebrow">Employers</p><h2 className="mt-1 text-2xl">Hire senior talent faster</h2>
            <p className="mt-2 text-ink/60">Post roles, search AI-ranked candidates, and manage applicants in one pipeline.</p></div>
          <Link href="/signup?role=employer" className="btn-primary self-start">Start hiring</Link>
        </div>
        <div className="card flex flex-col justify-between gap-5 p-8">
          <div><p className="eyebrow">Headhunters</p><h2 className="mt-1 text-2xl">Join the headhunter network</h2>
            <p className="mt-2 text-ink/60">Get a public profile, receive enquiries from senior candidates, and search our talent pool.</p></div>
          <Link href="/signup?role=headhunter" className="btn-ghost self-start">Create a headhunter profile</Link>
        </div>
      </section>
    </>
  );
}
