/**
 * Market settings for EWM-TM Jobs: a worldwide niche board for SAP EWM and SAP TM consultants.
 */
export const MARKET = {
  brand: 'EWM-TM Jobs',
  tagline: 'SAP EWM & SAP TM jobs worldwide',
  country: 'worldwide',
  currency: 'USD',
  // Minimum-salary filter steps in USD per year (all currencies are compared via USD_RATES)
  salarySteps: [40_000, 60_000, 80_000, 100_000, 130_000, 160_000],
  cities: ['Bengaluru', 'Pune', 'Hyderabad', 'Mumbai', 'Chennai', 'Delhi NCR'],
  premium: { price: '₹799', period: 'month' },
  contactEmail: process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
};

/** Search aliases so "Bengaluru" also finds "Bangalore", "Delhi NCR" finds Gurugram/Noida, etc. */
export const LOCATION_ALIASES = {
  bengaluru: ['bengaluru', 'bangalore'],
  bangalore: ['bengaluru', 'bangalore'],
  'delhi ncr': ['delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad'],
  delhi: ['delhi', 'ncr', 'gurgaon', 'gurugram', 'noida'],
  gurgaon: ['gurgaon', 'gurugram'],
  gurugram: ['gurgaon', 'gurugram'],
  mumbai: ['mumbai', 'navi mumbai', 'thane', 'bombay'],
  chennai: ['chennai', 'madras'],
  kolkata: ['kolkata', 'calcutta'],
  india: ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'gurgaon', 'gurugram', 'noida', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad'],
};

/** Matches job locations in India, used to keep only Indian roles from global company boards. */
export const INDIA_LOCATION_RE = /\b(india|bengaluru|bangalore|mumbai|delhi|ncr|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|coimbatore|chandigarh|indore|thiruvananthapuram)\b/i;
