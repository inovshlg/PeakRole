import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import SetupNeeded from '@/components/SetupNeeded';
import { getDbStatus } from '@/lib/db.mjs';

export const metadata = {
  title: { default: 'PeakRole: senior jobs, salaries shown', template: '%s · PeakRole' },
  description: 'Senior, director and executive jobs from top employers, with salaries shown up front.',
};

export default async function RootLayout({ children }) {
  const db = await getDbStatus();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {db.ok ? (
          <>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </>
        ) : (
          <main className="flex-1">
            <div className="container-x pt-6"><Logo /></div>
            <SetupNeeded status={db} />
          </main>
        )}
      </body>
    </html>
  );
}
