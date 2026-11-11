import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db.mjs';
import { unreadCount } from '@/lib/messaging.mjs';
import { initials } from '@/lib/format.mjs';
import { logout } from '@/app/actions';
import Logo from './Logo';

function Icon({ d, className = 'h-5 w-5' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>;
}

export default async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(await getDb(), user) : 0;
  const employer = user?.role === 'employer';

  const nav = employer
    ? [['/employers', 'Dashboard'], ['/employers/candidates', 'Find candidates'], ['/headhunters', 'Headhunters'], ['/jobs', 'Jobs']]
    : [['/jobs', 'Jobs'], ...(user ? [['/matches', 'My matches'], ['/cv', 'CV Studio']] : []), ['/headhunters', 'Headhunters'], ['/salaries', 'Salaries']];
  const menu = employer
    ? [['/employers', 'Dashboard'], ['/employers/profile', user.recruiter_type === 'headhunter' ? 'My headhunter profile' : 'Company profile'], ['/employers/credits', `Credits (${user.credits})`]]
    : [['/dashboard', 'Dashboard'], ['/profile', 'Profile & privacy'], ['/cv', 'CV Studio'], ['/alerts', 'Job alerts'], ['/pricing', user?.plan === 'premium' ? 'Premium ✓' : 'Go Premium']];

  return (
    <header className="sticky top-0 z-30 bg-shell text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="container-x flex h-14 items-center gap-4">
        <Logo dark />
        <nav className="ml-2 hidden items-center gap-1 text-sm lg:flex">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">{label}</Link>
          ))}
        </nav>
        <form action="/jobs" className="ml-auto hidden max-w-xs flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Search jobs</span>
            <Icon d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input name="q" placeholder="Search jobs" className="w-full rounded-full border border-white/15 bg-white/10 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus:outline-none" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <>
              <Link href="/messages" className="relative rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label={`Messages${unread ? `, ${unread} unread` : ''}`}>
                <Icon d="M4 5h16v11H8l-4 4V5Z" />
                {unread > 0 && <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-accent-500 px-1 text-center text-[11px] font-bold leading-[18px]">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold">{initials(user.name)}</span>
                  <span className="hidden text-sm sm:block">{user.name.split(' ')[0]}</span>
                  {user.plan === 'premium' && <span className="hidden rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase sm:block">Premium</span>}
                </summary>
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-white py-1 text-sm text-ink shadow-raised">
                  <div className="border-b border-canvas-100 px-4 py-3">
                    <p className="font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-ink/55">{employer ? `${user.company || ''} · ${user.recruiter_type === 'headhunter' ? 'Headhunter' : 'Employer'}` : user.email}</p>
                  </div>
                  {[...nav.filter(([h]) => !menu.some(([m]) => m === h)).map((n) => [...n, 'lg:hidden']), ...menu].map(([href, label, cls]) => (
                    <Link key={href + label} href={href} className={`block px-4 py-2 hover:bg-canvas-50 ${cls || ''}`}>{label}</Link>
                  ))}
                  <form action={logout} className="border-t border-canvas-100">
                    <button className="w-full px-4 py-2 text-left hover:bg-canvas-50">Log out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/employers" className="hidden rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 sm:block">For employers</Link>
              <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-white/90 hover:bg-white/10">Log in</Link>
              <Link href="/signup" className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-semibold hover:bg-brand-600">Sign up</Link>
            </>
          )}
        </div>
      </div>
      {!user && (
        <nav className="container-x flex gap-1 overflow-x-auto pb-2 text-sm lg:hidden">
          {nav.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1 text-white/80 hover:bg-white/10">{label}</Link>)}
        </nav>
      )}
    </header>
  );
}
