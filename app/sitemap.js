import { getDb } from '@/lib/db.mjs';
import { COUNTRIES } from '@/lib/niche.mjs';

export const dynamic = 'force-dynamic';

const base = () => process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export default async function sitemap() {
  const site = base();
  const db = await getDb();
  const [jobs, countries] = await Promise.all([
    db.all("SELECT id, posted_at FROM jobs WHERE status = 'active' AND source <> 'adzuna' ORDER BY posted_at DESC LIMIT 5000"),
    db.all("SELECT DISTINCT country, CASE WHEN category ILIKE '%EWM%' THEN 'ewm' END AS ewm, CASE WHEN category ILIKE '%TM%' THEN 'tm' END AS tm FROM jobs WHERE status = 'active' AND country IS NOT NULL"),
  ]);
  const pages = ['', '/jobs', '/sap-ewm-jobs', '/sap-tm-jobs', '/companies', '/employers', '/signup', '/salaries', '/privacy'].map((p) => ({ url: `${site}${p}`, changeFrequency: 'daily', priority: p === '' ? 1 : 0.8 }));
  const seo = [];
  for (const m of ['ewm', 'tm']) {
    for (const c of COUNTRIES) {
      if (countries.some((r) => r.country === c.code && r[m])) seo.push({ url: `${site}/sap-${m}-jobs/${c.slug}`, changeFrequency: 'daily', priority: 0.7 });
    }
  }
  return [...pages, ...seo, ...jobs.map((j) => ({ url: `${site}/jobs/${j.id}`, lastModified: j.posted_at, changeFrequency: 'weekly', priority: 0.6 }))];
}
