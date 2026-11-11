import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { logout } from '@/app/actions';
import Logo from './Logo';

export default async function Header() {
  const user = await getCurrentUser();
  const links =
    user?.role === 'employer'
      ? [['/employers', 'Post & manage jobs'], ['/employers/candidates', 'Find candidates'], ['/jobs', 'Browse jobs']]
      : [['/jobs', 'Find jobs'], ['/pricing', 'Premium'], ...(user ? [['/dashboard', 'Dashboard'], ['/alerts', 'Alerts']] : [['/employers', 'For employers']])];

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-sand-50/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink/70 md:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-ink">{label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={user.role === 'employer' ? '/employers' : '/profile'} className="hidden text-sm font-medium text-ink/70 hover:text-ink sm:block">
                {user.name.split(' ')[0]}
                {user.plan === 'premium' && <span className="ml-2 rounded-full bg-clay-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Premium</span>}
              </Link>
              <form action={logout}>
                <button className="btn-ghost !px-4 !py-2">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn !px-3 text-ink/70 hover:text-ink">Log in</Link>
              <Link href="/signup" className="btn-primary !py-2">Sign up free</Link>
            </>
          )}
        </div>
      </div>
      <nav className="container-x flex gap-5 overflow-x-auto pb-3 text-sm font-medium text-ink/70 md:hidden">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap hover:text-ink">{label}</Link>
        ))}
      </nav>
    </header>
  );
}
