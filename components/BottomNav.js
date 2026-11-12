'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const TABS = [
  ['/jobs', 'Jobs', 'briefcase', ['/jobs', '/sap-ewm-jobs', '/sap-tm-jobs']],
  ['/saved', 'Saved', 'bookmark', ['/saved']],
  ['/alerts', 'Alerts', 'bell', ['/alerts']],
  ['/messages', 'Messages', 'chat', ['/messages']],
  ['/dashboard', 'Profile', 'user', ['/dashboard', '/profile', '/matches']],
];

/** Mobile-only tab bar for signed-in candidates. */
export default function BottomNav({ unread = 0 }) {
  const path = usePathname() || '/';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-canvas-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      <ul className="grid grid-cols-5">
        {TABS.map(([href, label, icon, prefixes]) => {
          const active = prefixes.some((p) => path === p || path.startsWith(`${p}/`));
          return (
            <li key={href}>
              <Link href={href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-brand-500' : 'text-muted'}`} aria-current={active ? 'page' : undefined}>
                <span className={`rounded-full px-4 py-0.5 ${active ? 'bg-brand-100' : ''}`}><Icon name={icon} filled={active && icon !== 'chat'} className="h-5 w-5" /></span>
                {label}
                {href === '/messages' && unread > 0 && <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-negative" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
