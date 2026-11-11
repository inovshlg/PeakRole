/**
 * EWM-TM Jobs niche rules: which jobs belong on the site (SAP EWM / SAP TM) and which countries we track.
 */

/** A job belongs on the site if it mentions SAP EWM or SAP TM. */
const EWM_RE = /\b(s\/?4\s?hana\s+)?ewm\b|extended\s+warehouse\s+management|embedded\s+ewm|decentrali[sz]ed\s+ewm/i;
const TM_RE = /\bsap[\s-]+tm\b|\bs\/?4\s?hana\s+tm\b|transportation\s+management\s*\(?\s*(sap|tm)|sap\s+transportation\s+management|\btm\s+(consultant|functional|lead|architect|developer)\b/i;

export const NICHE_SQL_RE = String.raw`(\mewm\M|extended warehouse management|sap[ -]+tm\M|s/?4 ?hana tm\M|sap transportation management|transportation management \(?sap)`;

/** Returns 'SAP EWM' | 'SAP TM' | 'SAP EWM & TM' | null, from the title first, then the description. */
export function detectModule(title = '', description = '') {
  const t = `${title}`;
  const ewmT = EWM_RE.test(t), tmT = TM_RE.test(t);
  if (ewmT && tmT) return 'SAP EWM & TM';
  if (ewmT) return 'SAP EWM';
  if (tmT) return 'SAP TM';
  const d = `${description}`.slice(0, 8000);
  const ewmD = EWM_RE.test(d), tmD = TM_RE.test(d);
  // Only accept description-only matches for SAP-flavoured titles, to avoid generic warehouse/transport jobs.
  if (!/\bsap\b|s\/?4|consultant|functional|analyst|architect|developer|abap|solution/i.test(t)) return null;
  // A title naming another SAP module (e.g. "SAP SD Consultant") isn't an EWM/TM role, even if the text mentions EWM.
  if (/\b(SD|MM|FI|CO|FICO|PP|QM|PM|HCM|HR|BW|BI|Basis|Ariba|SuccessFactors|CRM|PS|GRC|BTP|Fiori|IBP|APO)\b/.test(t)) return null;
  if (ewmD && tmD) return 'SAP EWM & TM';
  if (ewmD) return 'SAP EWM';
  if (tmD) return 'SAP TM';
  return null;
}

export const MODULES = ['SAP EWM', 'SAP TM', 'SAP EWM & TM'];

/** Countries with an active SAP EWM/TM market. slug → URL, code → ISO-3166 alpha-2. */
export const COUNTRIES = [
  ['IN', 'India', 'india'], ['DE', 'Germany', 'germany'], ['NL', 'Netherlands', 'netherlands'], ['BE', 'Belgium', 'belgium'],
  ['GB', 'United Kingdom', 'uk'], ['IE', 'Ireland', 'ireland'], ['US', 'United States', 'usa'], ['CA', 'Canada', 'canada'],
  ['CH', 'Switzerland', 'switzerland'], ['AT', 'Austria', 'austria'], ['FR', 'France', 'france'], ['ES', 'Spain', 'spain'],
  ['IT', 'Italy', 'italy'], ['PL', 'Poland', 'poland'], ['DK', 'Denmark', 'denmark'], ['SE', 'Sweden', 'sweden'],
  ['NO', 'Norway', 'norway'], ['FI', 'Finland', 'finland'], ['CZ', 'Czech Republic', 'czech-republic'], ['AE', 'UAE', 'uae'],
  ['SA', 'Saudi Arabia', 'saudi-arabia'], ['SG', 'Singapore', 'singapore'], ['MY', 'Malaysia', 'malaysia'], ['AU', 'Australia', 'australia'],
  ['JP', 'Japan', 'japan'], ['MX', 'Mexico', 'mexico'], ['BR', 'Brazil', 'brazil'], ['ZA', 'South Africa', 'south-africa'],
].map(([code, name, slug]) => ({ code, name, slug }));

export const countryByCode = (c) => COUNTRIES.find((x) => x.code === String(c || '').toUpperCase());
export const countryBySlug = (s) => COUNTRIES.find((x) => x.slug === String(s || '').toLowerCase());

const CITY_HINTS = {
  IN: /\b(india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad)\b/i,
  DE: /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|walldorf|stuttgart|cologne|köln|düsseldorf)\b/i,
  NL: /\b(netherlands|amsterdam|rotterdam|utrecht|eindhoven|the hague)\b/i,
  GB: /\b(united kingdom|uk|england|london|manchester|birmingham|leeds|scotland)\b/i,
  US: /\b(united states|usa|u\.s\.|new york|chicago|texas|california|atlanta|dallas)\b|,\s?(ny|ca|tx|il|ga|nj|pa|oh|mi|wa)\b/i,
  BE: /\b(belgium|brussels|antwerp|ghent)\b/i, CH: /\b(switzerland|zurich|zürich|basel|geneva)\b/i,
  AE: /\b(uae|dubai|abu dhabi)\b/i, SG: /\bsingapore\b/i, AU: /\b(australia|sydney|melbourne|brisbane)\b/i,
  CA: /\b(canada|toronto|montreal|vancouver)\b/i, IE: /\b(ireland|dublin)\b/i, PL: /\b(poland|warsaw|krakow|kraków|wroclaw)\b/i,
};

/** Best-effort ISO country code from a free-text location. */
export function inferCountry(location = '') {
  for (const c of COUNTRIES) if (new RegExp(`\\b${c.name}\\b`, 'i').test(location)) return c.code;
  for (const [code, re] of Object.entries(CITY_HINTS)) if (re.test(location)) return code;
  return null;
}
