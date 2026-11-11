/**
 * Which job sources to import. Find a company's slug from where its "Careers → Apply" link points:
 *   Greenhouse: boards.greenhouse.io/<slug>   Lever: jobs.lever.co/<slug>   Ashby: jobs.ashbyhq.com/<slug>
 */
export default {
  greenhouse: ['stripe', 'airbnb', 'databricks', 'cloudflare', 'figma'],
  lever: ['palantir', 'spotify'],
  ashby: ['ramp', 'notion'],
  // Adzuna aggregator (needs ADZUNA_APP_ID / ADZUNA_APP_KEY). Country codes: gb, us, de, fr, nl, in, ca, au, ...
  adzuna: { country: 'gb', queries: ['director', 'head of', 'senior manager'], pages: 2 },
};
