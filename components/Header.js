import Link from 'next/link';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db.mjs';
import { unreadCount } from '@/lib/messaging.mjs';
import { initials } from '@/lib/format.mjs';
import { logout } from '@/app/actions';
import Logo from './Logo';
import Icon from './Icon';
import NavLinks from './NavLinks';
import BottomNav from './BottomNav';

export default async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(await getDb(), user) : 0;
  const employer = user?.role === 'employer';

  const nav = employer
    ? [['/employers', 'Dashboard'], ['/employers/candidates', 'Search candidates'], ['/headhunters', 'Headhunters'], ['/jobs', 'Jobs']]
    : [['/sap-ewm-jobs', 'SAP EWM jobs'], ['/sap-tm-jobs', 'SAP TM jobs'], ['/jobs', 'All jobs'], ['/companies', 'Companies'], ['/salaries', 'Salaries']];
  if (isAdmin(user)) nav.push(['/admin', 'Admin']);
  const menu = employer
    ? [['/employers', 'Dashboard'], ['/employers/profile', user.recruiter_type === 'headhunter' ? 'My headhunter profile' : 'Company profile'], ['/employers/credits', `Credits (${user.credits})`]]
    : [['/dashboard', 'Dashboard'], ['/saved', 'Saved jobs'], ['/matches', 'Recommended jobs'], ['/alerts', 'Job alerts'], ['/profile', 'Profile & resume']];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white shadow-[0_1px_0_#dfe2f1]">
        <div className="container-x flex h-16 items-center gap-6">
          <Logo />
          <NavLinks items={nav} />
          <div className="ml-auto flex items-center gap-1.5">
            {user ? (
              <>
                {!employer && (
                  <Link href="/alerts" className="hidden rounded-full p-2 text-muted hover:bg-brand-50 hover:text-brand-500 sm:block" aria-label="Job alerts">
                    <Icon name="bell" />
                  </Link>
                )}
                <Link href="/messages" className="relative rounded-full p-2 text-muted hover:bg-brand-50 hover:text-brand-500" aria-label={`Messages${unread ? `, ${unread} unread` : ''}`}>
                  <Icon name="chat" />
                  {unread > 0 && <span className="absolute right-0 top-0 min-w-[18px] rounded-full bg-negative px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 9 ? '9+' : unread}</span>}
                </Link>
                <details className="relative ml-1">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials(user.name)}</span>
                    <span className="hidden text-sm font-medium sm:block">{user.name.split(' ')[0]}</span>
                    <Icon name="chevronDown" className="h-4 w-4 text-muted" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-white py-1 text-sm shadow-raised">
                    <div className="border-b border-canvas-100 px-4 py-3">
                      <p className="font-semibold">{user.name} {user.plan === 'premium' && <span className="ml-1 rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Premium</span>}</p>
                      <p className="truncate text-xs text-muted">{employer ? `${user.company || ''} · ${user.recruiter_type === 'headhunter' ? 'Headhunter' : 'Employer'}` : user.email}</p>
                    </div>
                    {[...nav.map((n) => [...n, 'lg:hidden']), ...menu].map(([href, label, cls]) => (
                      <Link key={href + label} href={href} className={`block px-4 py-2 hover:bg-brand-50 ${cls || ''}`}>{label}</Link>
                    ))}
                    <form action={logout} className="border-t border-canvas-100">
                      <button className="w-full px-4 py-2 text-left text-negative hover:bg-brand-50">Log out</button>
                    </form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50">Log in</Link>
                <Link href="/signup" className="btn-primary !px-4 !py-2">Register</Link>
              </>
            )}
            {!employer && <Link href="/employers" className="btn-accent ml-2 hidden !px-4 !py-2 md:inline-flex">Hire consultants</Link>}
          </div>
        </div>
        {!user && (
          <nav className="container-x flex gap-1 overflow-x-auto border-t border-canvas-100 py-1.5 text-sm font-medium lg:hidden">
            {nav.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1 text-muted hover:text-brand-500">{label}</Link>)}
            <Link href="/employers" className="whitespace-nowrap rounded-md px-3 py-1 font-semibold text-accent-600 md:hidden">Hire consultants</Link>
          </nav>
        )}
      </header>
      {user && !employer && <BottomNav unread={unread} />}
    </>
  );
}
