# PeakRole: a job board for senior roles, salaries shown up front

A job platform with the same features as JobLeads, in its own design:
- **Candidates:** job search with filters (salary, seniority, field, remote, type), job pages, save jobs, apply (on-site with CV, or on the company's site), application tracker, profile + CV upload, daily job-alert emails, Premium plan.
- **Employers:** post and close jobs, see applicant and save counts, search candidates who opted in and download their CVs.
- **Jobs pipeline:** imports from Greenhouse, Lever, Ashby and Adzuna, normalises and de-duplicates them, and expires closed roles.
- **SEO:** Google for Jobs `JobPosting` structured data on every job page.

Stack: Next.js 15 (App Router, server actions) · Tailwind CSS · SQLite (Node's built-in `node:sqlite`, no native build needed).

## Run it locally

Requires **Node 22.13+**.

```bash
npm install
npm run seed            # demo jobs + demo accounts (add -- --reset to wipe)
npm run dev             # http://localhost:3000
```

Demo logins (password `demo1234`): `candidate@demo.test`, `priya@demo.test` (Premium), `employer@demo.test`.

## Getting real jobs

```bash
npm run ingest
```

Edit `config/sources.json` to choose sources:

| Source | What it is | Key needed |
|---|---|---|
| `greenhouse` | Company boards on Greenhouse, e.g. `boards.greenhouse.io/stripe` → `"stripe"` | No |
| `lever` | Company boards on Lever, e.g. `jobs.lever.co/spotify` → `"spotify"` | No |
| `ashby` | Company boards on Ashby, e.g. `jobs.ashbyhq.com/ramp` → `"ramp"` | No |
| `adzuna` | Aggregator covering 15+ countries | Free key: developer.adzuna.com → `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` |

To find more companies, look at where a company's **Careers → Apply** link goes. If it's on `greenhouse.io`, `lever.co` or `ashbyhq.com`, add the slug from that URL. Hundreds of mid-size and large companies use these systems.

Run `npm run ingest` on a schedule (every 2–6 h) and `npm run send-alerts` once a day, using cron, GitHub Actions or your host's scheduler. Jobs that disappear from a company's board are marked expired automatically. Jobs older than 60 days are also expired.

Not included on purpose: scraping LinkedIn, Indeed, JobLeads or other job boards. Their terms forbid it.

## Configuration (`.env.local`)

See `.env.example`.
- `RESEND_API_KEY`: sends real alert emails. Without it, alert emails are printed to the console.
- `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`: real Premium checkout. Without them, "Upgrade" switches the plan instantly (demo mode).
  **Before launch:** add a Stripe webhook (`checkout.session.completed`, `customer.subscription.deleted`) that sets `users.plan`.
- `SITE_URL`: the public URL of the site.

## Deploying

The app keeps its data in SQLite and uploaded CVs on disk in `./data` (change with `DATA_DIR`), so deploy it to a host with a persistent disk: a VPS, Railway, Render or Fly.io with a volume.

```bash
npm run build && npm start
```

For serverless hosting (Vercel), move the database to Postgres (e.g. Neon or Supabase) and CVs to S3 or R2. Only `lib/db.mjs` and the CV upload/download code need to change.

## Project layout

```
app/            pages + server actions (app/actions.js)
components/     UI components
lib/db.mjs      schema + connection
lib/jobs.mjs    search, upsert/dedupe, expiry, seniority/category detection
lib/sources.mjs Greenhouse / Lever / Ashby / Adzuna connectors
lib/auth.js     sessions (httpOnly cookie) + scrypt password hashing
scripts/        ingest, send-alerts, seed, parser tests
config/         sources.json
```

## Suggested next steps
- AI CV parsing and job matching (an LLM reads the CV and fills in the profile; jobs are ranked by fit)
- Paid job posts for employers, and featured listings
- Password reset and email verification
- Live exchange rates (`USD_RATES` in `lib/jobs.mjs` holds fixed approximate rates)
