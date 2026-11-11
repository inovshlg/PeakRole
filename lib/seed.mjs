/**
 * Demo data. seedIfEmpty() runs automatically the first time the app connects to an empty
 * database, so a fresh deploy has something to show. Demo jobs are expired automatically the
 * first time a real import (lib/ingest.mjs) brings in real jobs.
 */
import { upsertJob } from './jobs.mjs';
import { hashPassword } from './password.mjs';

const companies = [
  ['Northwind Analytics', 'London, UK', 'GBP'], ['Bluepeak Energy', 'Berlin, Germany', 'EUR'],
  ['Harbor & Finch Capital', 'New York, NY', 'USD'], ['Lumen Health', 'Boston, MA', 'USD'],
  ['Orchard Logistics', 'Amsterdam, Netherlands', 'EUR'], ['Quill Software', 'Bengaluru, India', 'INR'],
  ['Meridian Retail Group', 'Manchester, UK', 'GBP'], ['Tidewater Robotics', 'Munich, Germany', 'EUR'],
  ['Cobalt Payments', 'San Francisco, CA', 'USD'], ['Evergreen Foods', 'Toronto, Canada', 'CAD'],
  ['Atlas Mobility', 'Paris, France', 'EUR'], ['Summit Cloud', 'Remote', 'USD'],
];
const roles = [
  ['Chief Financial Officer', 'Finance', 1.9], ['VP of Engineering', 'Engineering', 1.8],
  ['Head of Product', 'Product', 1.55], ['Director of Sales, EMEA', 'Sales', 1.5],
  ['Senior Software Engineer', 'Engineering', 1.05], ['Engineering Manager', 'Engineering', 1.3],
  ['Senior Data Scientist', 'Data & AI', 1.1], ['Head of Marketing', 'Marketing', 1.35],
  ['Senior Product Designer', 'Design', 0.95], ['Finance Controller', 'Finance', 1.0],
  ['Director of Operations', 'Operations', 1.4], ['Head of Talent Acquisition', 'People & HR', 1.15],
  ['Senior Account Executive', 'Sales', 0.95], ['Machine Learning Lead', 'Data & AI', 1.35],
  ['General Counsel', 'Legal', 1.7], ['Customer Success Director', 'Customer Success', 1.2],
  ['Staff Platform Engineer', 'Engineering', 1.25], ['Product Marketing Manager', 'Marketing', 0.9],
];
const base = { GBP: 85000, EUR: 90000, USD: 160000, INR: 3500000, CAD: 130000 };
const rand = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

function describe(title, company, category, remote) {
  return `
<p><strong>${company}</strong> is hiring a <strong>${title}</strong> to join our ${category} organisation. You'll report to the leadership team and own outcomes that directly shape our next stage of growth.</p>
<h3>What you'll do</h3>
<ul>
  <li>Set the strategy and roadmap for your area and turn it into measurable quarterly goals.</li>
  <li>Build, coach and grow a high-performing team across multiple locations.</li>
  <li>Partner with senior stakeholders in Product, Finance and Commercial to prioritise investment.</li>
  <li>Report on performance to the executive team and board.</li>
</ul>
<h3>What you bring</h3>
<ul>
  <li>8+ years of relevant experience, including several in a leadership position.</li>
  <li>A track record of delivering results in a fast-growing, international business.</li>
  <li>Clear written and verbal communication; comfortable presenting to executives.</li>
  <li>Fluent English; additional European languages are a plus.</li>
</ul>
<h3>What we offer</h3>
<ul>
  <li>Competitive base salary, bonus and equity.</li>
  <li>${remote ? 'Fully remote with quarterly team offsites.' : 'Hybrid working: 3 days a week in our office.'}</li>
  <li>30 days holiday, private health insurance and a learning budget.</li>
</ul>
<p><em>This is a fictional demo listing.</em></p>`;
}

export async function seedDemoJobs(db) {
  let n = 0;
  for (const [ci, [company, location, currency]] of companies.entries()) {
    for (const [ri, [title, category, mult]] of roles.entries()) {
      const s = ci * 31 + ri * 7;
      if (rand(s) > 0.33) continue;
      const remote = location === 'Remote' || rand(s + 1) > 0.75;
      const hasSalary = rand(s + 2) > 0.2;
      const mid = base[currency] * mult * (0.9 + rand(s + 3) * 0.3);
      const daysAgo = Math.floor(rand(s + 4) * 28);
      await upsertJob(db, {
        source: 'seed', external_id: `${ci}-${ri}`, title, company, category,
        location: remote && location !== 'Remote' ? `${location} (Remote)` : location, remote,
        employment_type: rand(s + 5) > 0.9 ? 'Contract' : 'Full-time',
        salary_min: hasSalary ? Math.round((mid * 0.88) / 1000) * 1000 : null,
        salary_max: hasSalary ? Math.round((mid * 1.12) / 1000) * 1000 : null,
        currency,
        description_html: describe(title, company, category, remote),
        apply_url: null,
        posted_at: new Date(Date.now() - daysAgo * 86_400_000 - rand(s + 6) * 86_400_000).toISOString(),
      });
      n++;
    }
  }
  return n;
}

export async function seedDemoUsers(db) {
  const users = [
    ['candidate@demo.test', 'Alex Morgan', 'candidate', 'free', null, 'Senior Product Manager · B2B SaaS', 'London, UK', 110000, 9, 'Product strategy, Roadmapping, SQL, Stakeholder management', 1],
    ['employer@demo.test', 'Jordan Lee', 'employer', 'free', 'Northwind Analytics', null, null, null, null, null, 0],
    ['priya@demo.test', 'Priya Raman', 'candidate', 'premium', null, 'Director of Engineering · Fintech', 'Berlin, Germany', 140000, 14, 'Engineering leadership, Distributed systems, Hiring', 1],
  ];
  for (const u of users) {
    await db.run(
      `INSERT INTO users (email, password_hash, name, role, plan, company, headline, location, desired_salary, years_experience, skills, visible_to_recruiters)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (email) DO NOTHING`,
      [u[0], hashPassword('demo1234'), ...u.slice(1)]
    );
  }
}

/** Seed demo jobs into an empty database. Demo users only outside production, or when SEED_DEMO_USERS=1. */
export async function seedIfEmpty(db) {
  const { n } = await db.get('SELECT COUNT(*)::int AS n FROM jobs');
  if (n > 0) return false;
  await seedDemoJobs(db);
  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_USERS === '1') await seedDemoUsers(db);
  return true;
}
