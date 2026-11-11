import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-5xl">Page not found</h1>
      <p className="mt-3 text-ink/60">This job may have been filled, or the link is wrong.</p>
      <Link href="/jobs" className="btn-primary mt-8">Browse open jobs</Link>
    </div>
  );
}
