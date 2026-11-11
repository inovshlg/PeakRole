import Link from 'next/link';
import { getCurrentUser, isAdmin } from '@/lib/auth';
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
    ? [['/employers', 'Dashboard'], ['/employers/candidates', 'Search candidates'], ['/headhunters', 'Headhunters'], ['/jobs', 'Jobs']]
    : [['/sap-ewm-jobs', 'SAP EWM jobs'], ['/sap-tm-jobs', 'SAP TM jobs'], ['/jobs', 'All jobs'], ['/companies', 'Companies'], ['/salaries', 'Salaries']];
  if (isAdmin(user)) nav.push(['/admin', 'Admin']);
  const menu = employer
    ? [['/employers', 'Dashboard'], ['/employers/profile', user.recruiter_type === 'headhunter' ? 'My headhunter profile' : 'Company profile'], ['/employers/credits', `Credits (${user.credits})`]]
    : [['/dashboard', 'My applications'], ['/matches', 'Recommended jobs'], ['/profile', 'Profile & resume'], ['/alerts', 'Job alerts']];

  return (
    <header className="sticky top-0 z-30 border-b border-canvas-200 bg-white">
      <div className="container-x flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 text-[15px] font-medium text-ink/75 lg:flex">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-canvas-50 hover:text-brand-600">{label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/messages" className="relative rounded-full p-2 text-ink/70 hover:bg-canvas-50 hover:text-brand-600" aria-label={`Messages${unread ? `, ${unread} unread` : ''}`}>
                <Icon d="M4 5h16v11H8l-4 4V5Z" />
                {unread > 0 && <span className="absolute right-0 top-0 min-w-[18px] rounded-full bg-negative px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-canvas-200 py-1 pl-1 pr-3 hover:border-brand-200 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{initials(user.name)}</span>
                  <span className="hidden text-sm font-medium sm:block">{user.name.split(' ')[0]}</span>
                  <Icon d="m6 9 6 6 6-6" className="h-4 w-4 text-ink/50" />
                </summary>
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-canvas-200 bg-white py-1 text-sm shadow-raised">
                  <div className="border-b border-canvas-100 px-4 py-3">
                    <p className="font-semibold">{user.name} {user.plan === 'premium' && <span className="ml-1 rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Premium</span>}</p>
                    <p className="truncate text-xs text-ink/55">{employer ? `${user.company || ''} · ${user.recruiter_type === 'headhunter' ? 'Headhunter' : 'Employer'}` : user.email}</p>
                  </div>
                  {[...nav.map((n) => [...n, 'lg:hidden']), ...menu].map(([href, label, cls]) => (
                    <Link key={href + label} href={href} className={`block px-4 py-2 hover:bg-canvas-50 ${cls || ''}`}>{label}</Link>
                  ))}
                  <form action={logout} className="border-t border-canvas-100">
                    <button className="w-full px-4 py-2 text-left text-negative hover:bg-canvas-50">Log out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn border border-brand-500 !py-2 text-brand-600 hover:bg-brand-50">Login</Link>
              <Link href="/signup" className="btn-accent !py-2">Register</Link>
              <span className="mx-1 hidden h-6 w-px bg-canvas-200 md:block" />
              <Link href="/employers" className="hidden text-sm font-medium text-ink/70 hover:text-brand-600 md:block">Hire consultants</Link>
            </>
          )}
        </div>
      </div>
      {!user && (
        <nav className="container-x flex gap-1 overflow-x-auto border-t border-canvas-100 py-1.5 text-sm font-medium lg:hidden">
          {nav.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1 text-ink/70 hover:text-brand-600">{label}</Link>)}
          <Link href="/employers" className="whitespace-nowrap rounded-md px-3 py-1 text-ink/70 md:hidden">Hire consultants</Link>
        </nav>
      )}
    </header>
  );
}
