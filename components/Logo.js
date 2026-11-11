import Link from 'next/link';

export default function Logo({ dark = false }) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-[17px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="7" fill="#0070f2" />
        <path d="M5 19 L11 9 L14.5 14 L16.5 11 L21 19 Z" fill="#ffffff" />
        <circle cx="18.5" cy="7.5" r="2" fill="#ffb347" />
      </svg>
      PeakRole
    </Link>
  );
}
