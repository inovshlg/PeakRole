import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: { default: 'PeakRole: senior jobs, salaries shown', template: '%s · PeakRole' },
  description: 'Senior, director and executive jobs from top employers, with salaries shown up front.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
