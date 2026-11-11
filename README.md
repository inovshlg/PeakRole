# PeakRole: senior jobs, salaries up front, AI matching

A job platform with the same features as JobLeads, in its own design:

- **Candidates:** job search with filters (salary in USD equivalent, seniority, field, remote, type), job pages, save and apply, application tracker, job-alert emails, Premium plan.
- **AI CV reading:** upload a PDF or .docx and Claude extracts your headline, level, years of experience, skills, industries, work history and the roles you're a strong fit for. It fills in empty profile fields and never overwrites what you typed.
- **AI job matching:** a fast keyword pre-filter shortlists 25 jobs, then Claude scores each 0–100 with a one-line reason. Results appear as ✦ match badges across the site and on **My matches**.
- **AI fit check:** on any job page, get a detailed report with your strengths, gaps and what to emphasise in your application.
- **Employers:** post and close jobs, see applicants, and search candidates who opted in (including text from their AI-parsed CV).
- **Job pipeline:** imports from Greenhouse, Lever, Ashby and Adzuna, removes duplicates and expires closed roles, on a daily Vercel Cron.
- **SEO:** Google for Jobs `JobPosting` structured data on every job page.

Stack: Next.js 15 · Tailwind · Postgres (Neon on Vercel; embedded PGlite locally) · Claude API (`@anthropic-ai/sdk`).

## Deploy on Vercel (no local install needed)

1. **Import the repo:** go to vercel.com/new, choose this GitHub repository, and click **Deploy**. The first deploy shows a "No database configured" error page; that's expected.
2. **Add a database:** in the project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL` for you.
3. **Add environment variables** under **Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY`: create one at console.anthropic.com. This powers CV reading and matching.
   - `CRON_SECRET`: any long random string.
   - Optional: `SEED_DEMO_USERS=1` and `DEMO_UPGRADES=1` while you test (demo logins and free Premium). Remove them before launch.
4. **Redeploy:** go to **Deployments → ⋯ → Redeploy**. The first visit creates the tables and adds demo jobs.
5. **Load real jobs now** instead of waiting for the daily cron: go to **Settings → Cron Jobs** and click **Run** on `/api/cron/ingest`. Demo jobs are retired automatically once 20+ real jobs exist.

Crons (`vercel.json`): the job import runs daily at 05:17 UTC and alert emails at 07:43 UTC. Vercel Hobby allows daily crons; Pro allows hourly.

## Job sources

Edit `config/sources.mjs`. To find a company's slug, look at where its **Careers → Apply** link goes:

| Source | Example | Key |
|---|---|---|
| Greenhouse | `boards.greenhouse.io/stripe` → `stripe` | none |
| Lever | `jobs.lever.co/spotify` → `spotify` | none |
| Ashby | `jobs.ashbyhq.com/ramp` → `ramp` | none |
| Adzuna (aggregator, 15+ countries) | set `country` + `queries` | `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (free) |

Not included on purpose: scraping LinkedIn, Indeed, JobLeads or other job boards. Their terms forbid it.

## AI details and costs

- Model: `claude-opus-5-5` (override with `ANTHROPIC_MODEL`). Calls use structured JSON output, and server-side fallbacks are enabled for refusals.
- **Uses per action:** one call when a CV is uploaded (low effort), one per match refresh (25 jobs, medium effort), and one per fit check.
- **Usage limits:** free accounts refresh matches once a day and get 5 fit checks a day. Premium refreshes every 10 minutes and gets unlimited fit checks. These limits are in `lib/matching.mjs` and `app/actions.js`.
- CVs and job text are treated as untrusted data in the prompts. Scores are clamped to 0–100, and unknown job ids are discarded.
- **Without an API key:** everything still works, and matching uses keyword scoring.

## Local development (optional)

```bash
npm install && npm run dev        # embedded Postgres in ./data/pg, demo jobs + logins (password demo1234)
npm run ingest                    # import jobs now
npm run test:parsers              # source parser tests
```

## Before launch
- **Stripe webhook:** add one (`checkout.session.completed`, `customer.subscription.deleted`) that sets `users.plan`, and set `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID`.
- **Alert emails:** set `RESEND_API_KEY` and `ALERTS_FROM_EMAIL`.
- **Accounts:** add password reset and email verification.
- **Demo settings:** remove `SEED_DEMO_USERS` and `DEMO_UPGRADES`.

## Layout
```
app/                pages, server actions (app/actions.js), cron + CV API routes
lib/ai.mjs          Claude: CV parsing, job ranking, fit analysis
lib/matching.mjs    shortlist → AI ranking, caching, rate limits
lib/db.mjs          schema + Postgres/PGlite adapter
lib/jobs.mjs        search, upsert/dedupe, expiry
lib/sources.mjs     Greenhouse / Lever / Ashby / Adzuna connectors
lib/ingest.mjs      import run (cron + script)    lib/alerts.mjs   alert emails (cron + script)
config/sources.mjs  which companies to import
```
