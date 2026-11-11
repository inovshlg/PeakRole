const SYMBOLS = { USD: '$', GBP: '£', EUR: '€', INR: '₹', CAD: 'CA$', AUD: 'A$' };

function compact(n) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function formatSalary(min, max, currency = 'USD') {
  if (!min && !max) return null;
  const s = SYMBOLS[currency] ?? `${currency} `;
  if (min && max && min !== max) return `${s}${compact(min)} – ${s}${compact(max)}`;
  return `${s}${compact(min || max)}${min && !max ? '+' : ''}`;
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
