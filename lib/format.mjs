const SYMBOLS = { USD: '$', GBP: '£', EUR: '€', INR: '₹', CAD: 'CA$', AUD: 'A$', SGD: 'S$' };

function compact(n) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** Indian style: ₹8.5 L (lakh = 1,00,000), ₹1.2 Cr (crore = 1,00,00,000). */
function lakhCrore(n) {
  if (n >= 10_000_000) return `₹${+(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${+(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatSalary(min, max, currency = 'INR') {
  if (!min && !max) return null;
  const one = currency === 'INR' ? lakhCrore : (n) => `${SYMBOLS[currency] ?? `${currency} `}${compact(n)}`;
  if (min && max && min !== max) return `${one(min)} – ${one(max)}`;
  return `${one(min || max)}${min && !max ? '+' : ''}`;
}

export function timeAgo(value) {
  const then = new Date(value);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
