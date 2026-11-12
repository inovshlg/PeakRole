import Link from 'next/link';
import Logo from './Logo';

const cols = [
  ['Jobs', [['/sap-ewm-jobs', 'SAP EWM jobs'], ['/sap-tm-jobs', 'SAP TM jobs'], ['/sap-ewm-jobs/india', 'SAP EWM jobs in India'], ['/sap-ewm-jobs/germany', 'SAP EWM jobs in Germany'], ['/jobs?type=Contract', 'Contract & freelance'], ['/jobs?remote=1', 'Remote SAP jobs']]],
  ['More', [['/salaries', 'SAP EWM/TM salaries'], ['/companies', 'Companies hiring'], ['/employers', 'Hire consultants'], ['/privacy', 'Privacy notice'], ['/signup', 'Create your profile']]],
];

export default function Footer() {
  return (
    <footer className="mt-20 bg-white shadow-[0_-1px_0_#dfe2f1]">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">The job board for SAP EWM and SAP TM consultants: worldwide roles updated daily, salary data, job alerts and direct introductions to hiring companies.</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title} className="text-sm">
            <p className="mb-3 font-semibold">{title}</p>
            <ul className="space-y-2 text-muted">{links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-brand-600">{label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="container-x flex flex-wrap justify-between gap-2 border-t border-canvas-100 py-5 text-xs text-muted">
        <span>© {new Date().getFullYear()} EWM-TM Jobs · Not affiliated with SAP SE. SAP, SAP EWM and SAP TM are trademarks of SAP SE.</span>
        <a href="https://www.adzuna.in" target="_blank" rel="noopener" className="hover:text-ink">Jobs by Adzuna</a>
      </div>
    </footer>
  );
}
