import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import SetupNeeded from '@/components/SetupNeeded';
import { getDbStatus } from '@/lib/db.mjs';

export const metadata = {
  title: { default: 'EWM-TM Jobs: SAP EWM & SAP TM jobs worldwide', template: '%s · EWM-TM Jobs' },
  description: 'Find SAP EWM and SAP TM consultant jobs worldwide: permanent, contract and remote roles, updated daily.',
  metadataBase: new URL(process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')),
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
