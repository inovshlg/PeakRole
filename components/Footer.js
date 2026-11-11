import Link from 'next/link';
import Logo from './Logo';

const cols = [
  ['Candidates', [['/jobs', 'Search jobs'], ['/cv', 'CV Studio'], ['/matches', 'AI job matches'], ['/headhunters', 'Headhunters'], ['/salaries', 'Salary insights'], ['/pricing', 'Premium']]],
  ['Recruiters', [['/employers', 'Post a job'], ['/employers/candidates', 'Search candidates'], ['/employers/credits', 'Credits & pricing'], ['/signup?role=headhunter', 'Join as a headhunter']]],
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-canvas-200 bg-white">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink/60">India’s platform for senior and leadership careers: real jobs with salaries, AI-tailored CVs, and direct access to headhunters.</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title} className="text-sm">
            <p className="mb-3 font-semibold">{title}</p>
            <ul className="space-y-2 text-ink/60">{links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-brand-600">{label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="container-x flex flex-wrap justify-between gap-2 border-t border-canvas-100 py-5 text-xs text-ink/50">
        <span>© {new Date().getFullYear()} PeakRole</span>
        <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="hover:text-ink">Jobs by Adzuna</a>
      </div>
    </footer>
  );
}
