import { getDb } from '@/lib/db.mjs';
import { requireUser } from '@/lib/auth';
import CompanyMark from '@/components/CompanyMark';

export const metadata = { title: 'Search candidates' };

export default async function CandidatesPage({ searchParams }) {
  const sp = await searchParams;
  await requireUser('/employers/candidates', 'employer');
  const q = (sp.q || '').trim();
  const where = ["role = 'candidate'", 'visible_to_recruiters = 1'];
  const params = [];
  for (const term of q.split(/\s+/).filter(Boolean).slice(0, 5)) {
    where.push('(headline LIKE ? OR skills LIKE ? OR location LIKE ? OR name LIKE ?)');
    params.push(...Array(4).fill(`%${term}%`));
  }
  const people = getDb().prepare(
    `SELECT id, name, headline, location, years_experience, desired_salary, skills, plan, cv_path
     FROM users WHERE ${where.join(' AND ')}
     ORDER BY plan = 'premium' DESC, created_at DESC LIMIT 50`
  ).all(...params);

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">Search candidates</h1>
      <p className="mt-1 text-ink/60">Only candidates who chose to be visible to recruiters are shown.</p>
      <form className="mt-6 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="Title, skill or location" className="input" />
        <button className="btn-primary">Search</button>
      </form>
      <p className="mt-6 text-sm text-ink/60">{people.length} candidate{people.length === 1 ? '' : 's'}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {people.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start gap-4">
              <CompanyMark name={p.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.name} {p.plan === 'premium' && <span className="chip ml-1 !bg-clay-500 !text-white">Premium</span>}</p>
                <p className="text-sm text-ink/70">{p.headline || 'No headline yet'}</p>
                <p className="mt-1 text-sm text-ink/50">{[p.location, p.years_experience && `${p.years_experience} yrs experience`, p.desired_salary && `Seeking ${(p.desired_salary / 1000).toLocaleString()}k`].filter(Boolean).join(' · ')}</p>
                {p.skills && <div className="mt-3 flex flex-wrap gap-1.5">{p.skills.split(',').slice(0, 6).map((s) => <span key={s} className="chip">{s.trim()}</span>)}</div>}
                {p.cv_path && <a href={`/api/cv/${p.id}`} className="mt-3 inline-block text-sm font-semibold text-moss-700">Download CV →</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
