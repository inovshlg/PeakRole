import { initials } from '@/lib/format.mjs';

const PALETTE = ['bg-moss-100 text-moss-700', 'bg-sand-200 text-ink', 'bg-clay-500/15 text-clay-600', 'bg-moss-200 text-moss-900'];

export default function CompanyMark({ name, size = 'md' }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const dim = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl font-display font-semibold ${dim} ${PALETTE[h % PALETTE.length]}`}>
      {initials(name)}
    </div>
  );
}
