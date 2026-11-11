import Link from 'next/link';
import { MARKET } from '@/lib/market.mjs';

export const metadata = { title: 'Privacy notice' };

export default function Privacy() {
  const contact = MARKET.contactEmail;
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="page-title">Privacy notice</h1>
      <div className="prose-job mt-6">
        <p>{MARKET.brand} helps SAP EWM and SAP TM consultants find jobs and puts consenting candidates forward to hiring companies. This notice explains what we collect and your rights under India’s Digital Personal Data Protection Act 2023 and the EU/UK GDPR.</p>
        <h3>What we collect</h3>
        <ul>
          <li>Account details: name, email, password (stored only as a secure hash).</li>
          <li>Profile details you enter: phone, location, experience, SAP modules, salary expectations, notice period and preferences.</li>
          <li>Your CV / résumé, and any CVs you create with our CV tools.</li>
          <li>Your applications, saved jobs, messages and the date you gave consent.</li>
        </ul>
        <h3>Why and on what basis</h3>
        <ul>
          <li>To run your account and show you relevant jobs (to provide the service you asked for).</li>
          <li>To share your profile and CV with hiring companies <b>only with your consent</b>, which you give at sign-up and can withdraw at any time in <Link href="/profile#privacy">Profile → Privacy</Link>.</li>
          <li>AI features send your CV text to our AI provider (Anthropic) to generate results; it is not used to train their models.</li>
        </ul>
        <h3>Your rights</h3>
        <ul>
          <li>See and correct your data at any time on your profile.</li>
          <li>Withdraw consent at any time: we stop sharing your profile from that moment.</li>
          <li>Delete your account permanently from your profile page; this erases your profile, CVs, applications and messages.</li>
          <li>Unsubscribe from emails using the link in any email or in your privacy settings.</li>
        </ul>
        <h3>Retention</h3>
        <p>We keep your data while your account is active. When you delete your account it is erased from our live database immediately.</p>
        <h3>Contact</h3>
        <p>{contact ? <>Questions or requests: <a href={`mailto:${contact}`}>{contact}</a></> : 'Questions or requests: use the contact details on this site.'}</p>
      </div>
    </div>
  );
}
