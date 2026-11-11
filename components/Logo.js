import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="8" fill="#1c4f33" />
        <path d="M5 19 L11 9 L14.5 14 L16.5 11 L21 19 Z" fill="#f4eee2" />
        <circle cx="18.5" cy="7.5" r="2" fill="#c8643b" />
      </svg>
      PeakRole
    </Link>
  );
}
