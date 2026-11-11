import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export const metadata = { title: 'Admin', robots: { index: false } };

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <div className="container-x py-6">
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-canvas-200 pb-3 text-sm font-medium">
        {[['/admin', 'Overview'], ['/admin/candidates', 'Candidates'], ['/admin/clients', 'Clients & placements']].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-ink/70 hover:bg-white hover:text-brand-600">{label}</Link>
        ))}
        <span className="ml-auto self-center text-xs text-ink/45">Admin only</span>
      </nav>
      {children}
    </div>
  );
}
