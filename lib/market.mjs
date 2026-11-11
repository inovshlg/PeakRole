/**
 * Market settings. PeakRole targets India: salaries in INR (lakh/crore), Indian cities,
 * and Indian job sources. Change these to retarget the site.
 */
export const MARKET = {
  country: 'India',
  currency: 'INR',
  // Minimum-salary filter steps, in MARKET.currency per year (₹10 L … ₹1 Cr)
  salarySteps: [1_000_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000, 10_000_000],
  cities: ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai'],
  premium: { price: '₹799', period: 'month' },
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
