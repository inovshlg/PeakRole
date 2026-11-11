/**
 * EWM-TM Jobs sources. Every imported job must mention SAP EWM or SAP TM (see lib/niche.mjs);
 * anything else is dropped.
 *
 * JSearch (RapidAPI, Google for Jobs data) is the main worldwide feed. Each run makes at most
 * JSEARCH_MAX_CALLS requests (default 4) and rotates through the query × country combinations,
 * so the whole list is refreshed every few days within the free tier.
 */
export default {
  niche: true,
  jsearch: {
    queries: ['SAP EWM', 'SAP TM'],
    countries: ['in', 'de', 'us', 'gb', 'nl', 'be', 'ch', 'ae', 'sg', 'au', 'ca', 'pl'],
    datePosted: 'week',
  },
  // Adzuna (optional, free key): SAP EWM/TM searches in a few countries; capped by ADZUNA_MAX_CALLS (default 6).
  adzuna: [
    { country: 'in', queries: ['SAP EWM', 'SAP TM'], pages: 1, maxDaysOld: 30 },
    { country: 'de', queries: ['SAP EWM', 'SAP TM'], pages: 1, maxDaysOld: 30 },
    { country: 'gb', queries: ['SAP EWM'], pages: 1, maxDaysOld: 30 },
  ],
  // Company boards rarely have EWM/TM roles; add SAP consultancies here if you find their board slugs.
  greenhouse: [],
  lever: [],
  ashby: [],
  smartrecruiters: [],
  recruitee: [],
  workable: [],
  domains: {},
};
