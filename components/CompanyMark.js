'use client';

import { useEffect, useRef, useState } from 'react';
import { initials } from '@/lib/format.mjs';

const PALETTE = ['bg-brand-50 text-brand-700', 'bg-canvas-100 text-ink/70', 'bg-accent-500/10 text-accent-600', 'bg-positive/10 text-positive'];
const LOGO_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

/** Company logo from its domain (Logo.dev if NEXT_PUBLIC_LOGO_DEV_TOKEN is set, else the site icon), falling back to initials. */
export function logoUrl(domain) {
  if (!domain) return null;
  const d = String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return LOGO_TOKEN
    ? `https://img.logo.dev/${encodeURIComponent(d)}?token=${LOGO_TOKEN}&size=128&format=png`
    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`;
}

export default function CompanyMark({ name = '', domain, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const img = useRef(null);
  // An image that failed before React hydrated never fires onError; check it once mounted.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);
  const dim = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  const src = !failed && logoUrl(domain);
  if (src) {
    return (
      <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-canvas-200 bg-white p-1.5 ${dim}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={img} src={src} alt={`${name} logo`} className="h-full w-full object-contain" loading="lazy" onError={() => setFailed(true)} />
      </div>
    );
  }
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${dim} ${PALETTE[h % PALETTE.length]}`} aria-hidden>
      {initials(name)}
    </div>
  );
}
