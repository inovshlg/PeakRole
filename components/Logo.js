import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-display text-[22px] font-bold tracking-tight text-ink" aria-label="PeakRole home">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 24 L11 7 L16 15 L19 10 L26 24 Z" fill="#1f4fd1" />
        <path d="M11 7 L13.6 11.9 L11 11 L8.6 12.2 Z" fill="#ffffff" />
        <circle cx="21.5" cy="6" r="2.6" fill="#f29900" />
      </svg>
      <span>peak<span className="text-brand-500">role</span></span>
    </Link>
  );
}
