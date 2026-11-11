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
  greenhouse: ['stripe', 'databricks', 'rubrik', 'okta', 'gitlab', 'airbnb'],
  lever: ['cred', 'meesho', 'zeta'],
  ashby: ['notion'],
  // Each page is one Adzuna API call returning up to 50 jobs. A run is also capped by
  // ADZUNA_MAX_CALLS (default 6), so a trial key with 25 calls lasts about 4 runs.
  // Once Adzuna approves your production key, raise ADZUNA_MAX_CALLS and add queries.
  adzuna: {
    country: 'in',
    queries: ['director', 'head of', 'senior manager'],
    pages: 2,
    maxDaysOld: 30,
  },
};
