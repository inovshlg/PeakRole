import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { completeOnboarding } from '@/app/actions';
import { SAP_MODULE_OPTIONS, NOTICE_OPTIONS } from '@/lib/niche.mjs';
import RangeField from '@/components/RangeField';
import SubmitButton from '@/components/SubmitButton';
import Flash from '@/components/Flash';
import Icon from '@/components/Icon';

export const metadata = { title: 'Set up your profile' };
export const maxDuration = 120;

function Step({ n, title, hint, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-bold text-white">{n}</span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Pill({ type = 'checkbox', name, value, checked, children }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas-100 px-3.5 py-2 text-sm font-medium text-ink/80 hover:bg-canvas-200 peer-checked:bg-brand-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">{children}</span>
    </label>
  );
}

function Toggle({ name, checked, children }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium">
      {children}
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={checked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-canvas-200 transition peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default async function Onboarding({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/onboarding', 'candidate');
  const mods = (user.sap_modules || '').split(',').map((m) => m.trim()).filter(Boolean);

  return (
    <div className="bg-brand-50/60">
      <div className="container-x max-w-2xl py-8">
        <p className="eyebrow">Welcome, {user.name.split(' ')[0]}</p>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight sm:text-[30px]">Tell us about your SAP experience</h1>
        <p className="mt-1 text-muted">Takes a minute. We use it to rank jobs for you and, only with your consent, to introduce you to hiring companies.</p>

        <form action={completeOnboarding} className="mt-6 space-y-4">
          <Flash error={sp.error} />
          <Step n="1" title="Your SAP modules" hint="Pick everything you have hands-on project experience in.">
            <div className="flex flex-wrap gap-2">
              {SAP_MODULE_OPTIONS.map((m) => <Pill key={m} name="sap_modules" value={m} checked={mods.includes(m)}>{m}</Pill>)}
            </div>
            <div className="mt-4"><Toggle name="s4hana" checked={!!user.s4hana}>I have worked on S/4HANA (embedded or decentralised)</Toggle></div>
          </Step>

          <Step n="2" title="Experience & availability">
            <RangeField name="years_experience" label="Years of SAP experience" min={0} max={25} defaultValue={user.years_experience ?? 3} />
            <p className="mb-2 mt-6 text-sm font-semibold">Notice period</p>
            <div className="flex flex-wrap gap-2">
              {NOTICE_OPTIONS.map((n) => <Pill key={n} type="radio" name="notice_period" value={n} checked={user.notice_period === n}>{n}</Pill>)}
            </div>
            <label className="mt-6 block text-sm font-semibold" htmlFor="location">Where are you based?</label>
            <input id="location" name="location" defaultValue={user.location || ''} placeholder="e.g. Pune, India" className="input mt-2" />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Toggle name="open_remote" checked={!!user.open_remote}>Remote</Toggle>
              <Toggle name="open_relocation" checked={!!user.open_relocation}>Relocation</Toggle>
              <Toggle name="open_contract" checked={!!user.open_contract}>Contract</Toggle>
            </div>
          </Step>

          <Step n="3" title="Upload your CV (optional)" hint="PDF or Word, up to 4 MB. We read it to fill your profile and match you to jobs.">
            <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-line bg-brand-50 px-4 py-8 text-center hover:border-brand-500">
              <Icon name="upload" className="h-8 w-8 text-brand-500" />
              <span className="mt-2 text-sm font-semibold">{user.cv_name ? `Current: ${user.cv_name}. Choose a new file to replace it` : 'Choose your CV file'}</span>
              <input type="file" name="cv" accept=".pdf,.doc,.docx" className="mt-3 max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:font-semibold file:text-white" />
            </label>
          </Step>

          <div className="flex flex-col-reverse items-center gap-3 pt-2 sm:flex-row sm:justify-between">
            <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">Skip for now</Link>
            <SubmitButton className="btn-primary w-full sm:w-auto !px-8" pendingText="Saving…">Finish &amp; see my jobs</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
