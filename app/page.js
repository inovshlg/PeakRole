import Link from 'next/link';
import { getDb } from '@/lib/db.mjs';
import { searchJobs, facetCounts } from '@/lib/jobs.mjs';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await getDb();
  const [stats, { jobs }] = await Promise.all([facetCounts(db), searchJobs(db, { sort: 'salary', pageSize: 6 })]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink/10 bg-moss-900 text-sand-50">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-moss-600/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />
        <div className="container-x relative py-16 sm:py-24">
          <p className="mb-4 inline-block rounded-full border border-sand-50/20 px-3 py-1 text-xs font-medium uppercase tracking-widest text-sand-100/80">
            For senior & leadership talent
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-6xl">
            Your next senior role, <em className="text-clay-500 not-italic">with the salary shown</em>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sand-100/75">
            {stats.total.toLocaleString()} open roles from {stats.companies.toLocaleString()} companies, many with salary ranges. Search them, save them and get alerts when new ones are posted.
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchBar dark />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {['Director', 'Head of', 'VP', 'Engineering Manager', 'Remote'].map((t) => (
              <Link key={t} href={t === 'Remote' ? '/jobs?remote=1' : `/jobs?q=${encodeURIComponent(t)}`} className="rounded-full bg-sand-50/10 px-3 py-1 text-sand-100/90 hover:bg-sand-50/20">
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x grid gap-6 py-14 sm:grid-cols-3">
        {[
          ['Salaries up front', `${Math.round((stats.withSalary / Math.max(stats.total, 1)) * 100)}% of roles list a salary range. Filter by the minimum you'd accept.`],
          ['Straight from employers', 'Jobs come directly from company career sites and trusted partners, refreshed several times a day.'],
          ['Be found by recruiters', 'Make your profile visible and let hiring teams contact you about roles that aren’t advertised.'],
        ].map(([t, d], i) => (
          <div key={t} className="card p-6">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-moss-50 font-display text-moss-700">{i + 1}</div>
            <h3 className="text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-ink/60">{d}</p>
          </div>
        ))}
      </section>

      <section className="container-x">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl">Top-paying roles right now</h2>
          <Link href="/jobs?sort=salary" className="shrink-0 text-sm font-semibold text-moss-700 hover:underline">See all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {jobs.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </section>

      <section className="container-x mt-16">
        <h2 className="mb-6 text-3xl">Browse by field</h2>
        <div className="flex flex-wrap gap-3">
          {stats.categories.map((c) => (
            <Link key={c.name} href={`/jobs?category=${encodeURIComponent(c.name)}`} className="card px-4 py-3 text-sm font-medium hover:border-moss-500">
              {c.name} <span className="ml-1 text-ink/40">{c.n}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="card flex flex-col items-start justify-between gap-6 bg-sand-100 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl">Hiring senior talent?</h2>
            <p className="mt-1 text-ink/60">Post a role in minutes and search profiles of candidates open to new opportunities.</p>
          </div>
          <Link href="/signup?role=employer" className="btn-accent">Post a job</Link>
        </div>
      </section>
    </>
  );
}
