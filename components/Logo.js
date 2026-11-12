import Link from 'next/link';

export default function Logo({ subtitle = true }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 text-ink" aria-label="EWM-TM Jobs home">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1f4fd1" />
        <path d="M7 22V10h7M7 16h6M7 22h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M17 10h8M21 10v12" stroke="#fda214" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[19px] font-bold tracking-tight">EWM<span className="text-brand-500">·</span>TM Jobs</span>
        {subtitle && <span className="mt-0.5 hidden text-[11px] font-medium text-muted sm:block">SAP Supply Chain Network</span>}
      </span>
    </Link>
  );
}
