'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Desktop header links with the current section underlined. */
export default function NavLinks({ items }) {
  const path = usePathname() || '/';
  return (
    <nav className="hidden self-stretch items-stretch gap-1 text-[15px] font-medium lg:flex">
      {items.map(([href, label]) => {
        const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
        return (
          <Link key={href} href={href} className={`flex items-center border-b-2 px-3 ${active ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-brand-500'}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
