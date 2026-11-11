'use client';

import { useEffect, useMemo, useState } from 'react';
import SubmitButton from '@/components/SubmitButton';

const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const commas = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function Field({ label, value, onChange, placeholder, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

function Area({ label, value, onChange, rows = 3, hint, ...rest }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ItemControls({ index, count, onMove, onRemove }) {
  const btn = 'rounded-md px-2 py-1 text-xs text-ink/50 hover:bg-sand-100 hover:text-ink disabled:opacity-30';
  return (
    <div className="flex gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move up">↑</button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label="Move down">↓</button>
      <button type="button" className={`${btn} hover:!text-clay-600`} onClick={() => onRemove(index)}>Remove</button>
    </div>
  );
}

export default function CvEditor({ id, title: initialTitle, template: initialTemplate, cv, coverLetter, templates, action }) {
  const [title, setTitle] = useState(initialTitle);
  const [template, setTemplate] = useState(initialTemplate);
  const [d, setD] = useState({
    ...cv,
    experience: cv.experience.map((e) => ({ ...e, bulletsText: e.bullets.join('\n') })),
  });
  const [skillsText, setSkillsText] = useState(cv.skills.join(', '));
  const [certsText, setCertsText] = useState(cv.certifications.join('\n'));
  const [langsText, setLangsText] = useState(cv.languages.join(', '));
  const [letter, setLetter] = useState(coverLetter ?? '');
  const [dirty, setDirty] = useState(false);

  const touch = (fn) => (...args) => { setDirty(true); fn(...args); };
  const set = touch((k, v) => setD((x) => ({ ...x, [k]: v })));
  const setItem = touch((list, i, k, v) => setD((x) => ({ ...x, [list]: x[list].map((it, j) => (j === i ? { ...it, [k]: v } : it)) })));
  const addItem = touch((list, item) => setD((x) => ({ ...x, [list]: [...x[list], item] })));
  const removeItem = (list) => touch((i) => setD((x) => ({ ...x, [list]: x[list].filter((_, j) => j !== i) })));
  const moveItem = (list) => touch((i, dir) => setD((x) => {
    const arr = [...x[list]];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    return { ...x, [list]: arr };
  }));

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const payload = useMemo(() => JSON.stringify({
    ...d,
    experience: d.experience.map(({ bulletsText, ...e }) => ({ ...e, bullets: lines(bulletsText) })),
    skills: commas(skillsText),
    certifications: lines(certsText),
    languages: commas(langsText),
  }), [d, skillsText, certsText, langsText]);

  return (
    <form action={action} onSubmit={() => setDirty(false)} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="data" value={payload} />
      <input type="hidden" name="template" value={template} />

      <div className="card flex flex-wrap items-end gap-4 p-5">
        <Field label="CV name (only you see this)" value={title} onChange={touch(setTitle)} name="title" className="min-w-[200px] flex-1" maxLength={120} />
        <SubmitButton pendingText="Saving…">{dirty ? 'Save changes' : 'Saved ✓'}</SubmitButton>
      </div>

      <Section title="Design">
        <div className="grid gap-3 sm:grid-cols-3">
          {templates.map((t) => (
            <label key={t.id} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${template === t.id ? 'border-moss-700 bg-moss-50 ring-1 ring-moss-700' : 'border-ink/15 hover:border-ink/40'}`}>
              <input type="radio" name="template_choice" value={t.id} checked={template === t.id} onChange={touch(() => setTemplate(t.id))} className="sr-only" />
              <span className="block font-semibold">{t.name}</span>
              <span className="text-xs text-ink/55">{t.description}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={d.full_name} onChange={(v) => set('full_name', v)} maxLength={120} />
          <Field label="Headline" value={d.headline} onChange={(v) => set('headline', v)} placeholder="Senior Product Manager | Fintech | 9 years" maxLength={200} />
          <Field label="Email" type="email" value={d.email} onChange={(v) => set('email', v)} maxLength={200} />
          <Field label="Phone" type="tel" value={d.phone} onChange={(v) => set('phone', v)} placeholder="+91 98xxx xxxxx" maxLength={40} />
          <Field label="Location" value={d.location} onChange={(v) => set('location', v)} placeholder="Bengaluru, India" maxLength={120} />
        </div>
        <div className="space-y-2">
          <span className="label">Links</span>
          {d.links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input className="input !w-32" placeholder="LinkedIn" value={l.label} onChange={(e) => setItem('links', i, 'label', e.target.value)} maxLength={40} />
              <input className="input" placeholder="linkedin.com/in/you" value={l.url} onChange={(e) => setItem('links', i, 'url', e.target.value)} maxLength={300} />
              <button type="button" className="px-2 text-sm text-ink/40 hover:text-clay-600" onClick={() => removeItem('links')(i)} aria-label="Remove link">✕</button>
            </div>
          ))}
          {d.links.length < 6 && <button type="button" className="text-sm font-semibold text-moss-700" onClick={() => addItem('links', { label: '', url: '' })}>+ Add link</button>}
        </div>
      </Section>

      <Section title="Professional summary">
        <Area label="3–4 lines about your experience and what you’re looking for" value={d.summary} onChange={(v) => set('summary', v)} rows={4} maxLength={1500} />
      </Section>

      <Section title="Experience" action={<button type="button" className="text-sm font-semibold text-moss-700" onClick={() => addItem('experience', { title: '', company: '', location: '', start: '', end: '', bulletsText: '' })}>+ Add role</button>}>
        {d.experience.map((e, i) => (
          <div key={i} className="rounded-xl border border-ink/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink/70">{e.title || e.company || `Role ${i + 1}`}</span>
              <ItemControls index={i} count={d.experience.length} onMove={moveItem('experience')} onRemove={removeItem('experience')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Job title" value={e.title} onChange={(v) => setItem('experience', i, 'title', v)} maxLength={150} />
              <Field label="Company" value={e.company} onChange={(v) => setItem('experience', i, 'company', v)} maxLength={150} />
              <Field label="Location" value={e.location} onChange={(v) => setItem('experience', i, 'location', v)} maxLength={120} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" value={e.start} onChange={(v) => setItem('experience', i, 'start', v)} placeholder="Mar 2019" maxLength={30} />
                <Field label="End" value={e.end} onChange={(v) => setItem('experience', i, 'end', v)} placeholder="Present" maxLength={30} />
              </div>
            </div>
            <div className="mt-3">
              <Area label="Achievements (one per line)" value={e.bulletsText} onChange={(v) => setItem('experience', i, 'bulletsText', v)} rows={5}
                hint="Start with an action verb and include numbers: “Grew revenue 40% to ₹85 Cr in 2 years”." />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Education" action={<button type="button" className="text-sm font-semibold text-moss-700" onClick={() => addItem('education', { degree: '', institution: '', location: '', start: '', end: '', details: '' })}>+ Add education</button>}>
        {d.education.map((e, i) => (
          <div key={i} className="rounded-xl border border-ink/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink/70">{e.degree || e.institution || `Education ${i + 1}`}</span>
              <ItemControls index={i} count={d.education.length} onMove={moveItem('education')} onRemove={removeItem('education')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Degree" value={e.degree} onChange={(v) => setItem('education', i, 'degree', v)} placeholder="MBA, Finance" maxLength={200} />
              <Field label="Institution" value={e.institution} onChange={(v) => setItem('education', i, 'institution', v)} placeholder="IIM Bangalore" maxLength={200} />
              <Field label="Location" value={e.location} onChange={(v) => setItem('education', i, 'location', v)} maxLength={120} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" value={e.start} onChange={(v) => setItem('education', i, 'start', v)} maxLength={30} />
                <Field label="End" value={e.end} onChange={(v) => setItem('education', i, 'end', v)} maxLength={30} />
              </div>
              <Field label="Details" value={e.details} onChange={(v) => setItem('education', i, 'details', v)} placeholder="CGPA 3.6/4 · Dean’s list" className="sm:col-span-2" maxLength={300} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Skills, certifications & languages">
        <Area label="Skills (comma separated)" value={skillsText} onChange={touch(setSkillsText)} rows={3} />
        <Area label="Certifications (one per line)" value={certsText} onChange={touch(setCertsText)} rows={3} placeholder="PMP, PMI (2021)" />
        <Field label="Languages (comma separated)" value={langsText} onChange={touch(setLangsText)} placeholder="English, Hindi, Kannada" />
      </Section>

      {coverLetter !== null && (
        <Section title="Cover letter">
          <Area label="Edit before sending; paragraphs are separated by a blank line" name="cover_letter" value={letter} onChange={touch(setLetter)} rows={14} maxLength={6000} />
        </Section>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <SubmitButton className="btn-primary shadow-lg" pendingText="Saving…">{dirty ? 'Save changes' : 'Saved ✓'}</SubmitButton>
      </div>
    </form>
  );
}
