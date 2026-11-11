/**
 * Which job sources to import.
 *
 * Adzuna India is the main source of volume (free key: developer.adzuna.com → set
 * ADZUNA_APP_ID / ADZUNA_APP_KEY in Vercel).
 *
 * Company boards: find a company's slug from where its "Careers → Apply" link points:
 *   Greenhouse: boards.greenhouse.io/<slug>   Lever: jobs.lever.co/<slug>   Ashby: jobs.ashbyhq.com/<slug>
 * Global companies post jobs worldwide; with indiaOnly, only roles located in India (or
 * remote roles open to India) are kept. A wrong slug just shows "✗ … 404" in the import log.
 */
export default {
  indiaOnly: true,
  greenhouse: ['stripe', 'databricks', 'cloudflare', 'rubrik', 'okta', 'gitlab', 'postman', 'airbnb'],
  lever: ['cred', 'meesho', 'zeta'],
  ashby: ['zepto', 'notion', 'ramp'],
  adzuna: {
    country: 'in',
    queries: ['director', 'head of', 'vice president', 'senior manager', 'general manager', 'lead'],
    pages: 2, // 50 jobs per page → up to 600 jobs per run; Adzuna's free tier allows ~250 requests/day
  },
};
