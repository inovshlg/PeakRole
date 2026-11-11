import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-sand-100">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink/60">Senior and leadership roles from top employers, with salaries shown up front.</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Candidates</p>
          <ul className="space-y-2 text-ink/60">
            <li><Link href="/jobs">Search jobs</Link></li>
            <li><Link href="/alerts">Job alerts</Link></li>
            <li><Link href="/pricing">Premium</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold">Employers</p>
          <ul className="space-y-2 text-ink/60">
            <li><Link href="/employers">Post a job</Link></li>
            <li><Link href="/employers/candidates">Search candidates</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-x border-t border-ink/10 py-5 text-xs text-ink/50">© {new Date().getFullYear()} PeakRole</div>
    </footer>
  );
}
