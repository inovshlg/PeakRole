/**
 * PDF rendering for CVs and cover letters (server only), using @react-pdf/renderer.
 * Fonts are bundled in assets/fonts (Inter: OFL-1.1, DejaVu: free licence) so ₹ and
 * accented characters render correctly.
 */
import path from 'node:path';
import React from 'react';
import { Document, Page, Text, View, Link, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(FONT_DIR, 'Inter-Regular.otf') },
      { src: path.join(FONT_DIR, 'Inter-Italic.otf'), fontStyle: 'italic' },
      { src: path.join(FONT_DIR, 'Inter-SemiBold.otf'), fontWeight: 600 },
      { src: path.join(FONT_DIR, 'Inter-Bold.otf'), fontWeight: 700 },
    ],
  });
  Font.register({
    family: 'DejaVuSerif',
    fonts: [
      { src: path.join(FONT_DIR, 'DejaVuSerif.ttf') },
      { src: path.join(FONT_DIR, 'DejaVuSerif-Bold.ttf'), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // don't hyphenate names/terms
  fontsReady = true;
}

const GREEN = '#1c4f33';
const MUTED = '#5b6660';
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const contactBits = (cv) => [cv.email, cv.phone, cv.location].filter(Boolean);

/* ------------------------------------------------------------- shared pieces */

function Bullets({ items, style, dot = '•' }) {
  return items.filter(Boolean).map((b, i) => (
    <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }} wrap={false}>
      <Text style={[style, { width: 9 }]}>{dot}</Text>
      <Text style={[style, { flex: 1 }]}>{b}</Text>
    </View>
  ));
}

function Experience({ cv, s }) {
  return cv.experience.map((e, i) => (
    <View key={i} style={{ marginBottom: 7 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false} minPresenceAhead={30}>
        <Text style={s.role}>{e.title}{e.company ? <Text style={s.company}>{`  ·  ${e.company}`}</Text> : null}</Text>
        <Text style={s.dates}>{[e.start, e.end].filter(Boolean).join(' – ')}</Text>
      </View>
      {e.location ? <Text style={s.meta}>{e.location}</Text> : null}
      <View style={{ marginTop: 2 }}><Bullets items={e.bullets} style={s.body} /></View>
    </View>
  ));
}

function Education({ cv, s }) {
  return cv.education.map((e, i) => (
    <View key={i} style={{ marginBottom: 4 }} wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.role}>{e.degree}</Text>
        <Text style={s.dates}>{[e.start, e.end].filter(Boolean).join(' – ')}</Text>
      </View>
      <Text style={s.meta}>{[e.institution, e.location].filter(Boolean).join(', ')}{e.details ? ` · ${e.details}` : ''}</Text>
    </View>
  ));
}

/* ------------------------------------------------------------- Modern */

function Modern({ cv }) {
  const s = StyleSheet.create({
    page: { fontFamily: 'Inter', fontSize: 9.5, color: '#14201b', paddingVertical: 40, paddingHorizontal: 42, lineHeight: 1.4 },
    name: { fontSize: 22, fontWeight: 700, color: GREEN, lineHeight: 1.2 },
    headline: { fontSize: 11, color: '#2f3b35', marginTop: 2, lineHeight: 1.3 },
    contact: { fontSize: 8.5, color: MUTED, marginTop: 5 },
    h: { fontSize: 8.5, fontWeight: 700, color: GREEN, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 12, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: '#cfe0d6' },
    role: { fontSize: 10, fontWeight: 600 }, company: { fontWeight: 400, color: '#2f3b35' },
    dates: { fontSize: 8.5, color: MUTED }, meta: { fontSize: 8.5, color: MUTED }, body: { fontSize: 9.5 },
  });
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.name}>{cv.full_name}</Text>
      {cv.headline ? <Text style={s.headline}>{cv.headline}</Text> : null}
      <Text style={s.contact}>
        {contactBits(cv).join('   ·   ')}
        {cv.links.map((l, i) => <Link key={i} src={href(l.url)} style={{ color: GREEN, textDecoration: 'none' }}>{`   ·   ${l.label || l.url}`}</Link>)}
      </Text>
      {cv.summary ? <><Text style={s.h} minPresenceAhead={40}>Profile</Text><Text style={s.body}>{cv.summary}</Text></> : null}
      {cv.experience.length ? <><Text style={s.h} minPresenceAhead={40}>Experience</Text><Experience cv={cv} s={s} /></> : null}
      {cv.education.length ? <><Text style={s.h} minPresenceAhead={40}>Education</Text><Education cv={cv} s={s} /></> : null}
      {cv.skills.length ? <><Text style={s.h} minPresenceAhead={40}>Skills</Text><Text style={s.body}>{cv.skills.join('  ·  ')}</Text></> : null}
      {cv.certifications.length ? <><Text style={s.h} minPresenceAhead={40}>Certifications</Text><Bullets items={cv.certifications} style={s.body} /></> : null}
      {cv.languages.length ? <><Text style={s.h} minPresenceAhead={40}>Languages</Text><Text style={s.body}>{cv.languages.join(', ')}</Text></> : null}
    </Page>
  );
}

/* ------------------------------------------------------------- Classic */

function Classic({ cv }) {
  const s = StyleSheet.create({
    page: { fontFamily: 'DejaVuSerif', fontSize: 9.5, color: '#111', paddingVertical: 40, paddingHorizontal: 48, lineHeight: 1.4 },
    name: { fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: 1, lineHeight: 1.2 },
    headline: { fontSize: 10.5, textAlign: 'center', marginTop: 3, lineHeight: 1.3 },
    contact: { fontSize: 8.5, textAlign: 'center', marginTop: 5, color: '#333' },
    h: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 13, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 0.8, borderBottomColor: '#111' },
    role: { fontSize: 10, fontWeight: 700 }, company: { fontWeight: 400 },
    dates: { fontSize: 9 }, meta: { fontSize: 9, color: '#333' }, body: { fontSize: 9.5 },
  });
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.name}>{cv.full_name.toUpperCase()}</Text>
      {cv.headline ? <Text style={s.headline}>{cv.headline}</Text> : null}
      <Text style={s.contact}>{[...contactBits(cv), ...cv.links.map((l) => l.url)].join('  |  ')}</Text>
      {cv.summary ? <><Text style={s.h} minPresenceAhead={40}>Professional Summary</Text><Text style={s.body}>{cv.summary}</Text></> : null}
      {cv.experience.length ? <><Text style={s.h} minPresenceAhead={40}>Professional Experience</Text><Experience cv={cv} s={s} /></> : null}
      {cv.education.length ? <><Text style={s.h} minPresenceAhead={40}>Education</Text><Education cv={cv} s={s} /></> : null}
      {cv.skills.length ? <><Text style={s.h} minPresenceAhead={40}>Core Competencies</Text><Text style={s.body}>{cv.skills.join(' • ')}</Text></> : null}
      {cv.certifications.length ? <><Text style={s.h} minPresenceAhead={40}>Certifications</Text><Bullets items={cv.certifications} style={s.body} /></> : null}
      {cv.languages.length ? <><Text style={s.h} minPresenceAhead={40}>Languages</Text><Text style={s.body}>{cv.languages.join(', ')}</Text></> : null}
    </Page>
  );
}

/* ------------------------------------------------------------- Compact (two columns) */

function Compact({ cv }) {
  const s = StyleSheet.create({
    page: { fontFamily: 'Inter', fontSize: 8.8, color: '#14201b', flexDirection: 'row', lineHeight: 1.38, paddingVertical: 32 },
    sideBg: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '31%', backgroundColor: '#eef4f0' },
    side: { width: '31%', paddingHorizontal: 18 },
    main: { width: '69%', paddingHorizontal: 22 },
    name: { fontSize: 17, fontWeight: 700, color: GREEN, lineHeight: 1.2 },
    headline: { fontSize: 9.5, marginTop: 4, color: '#2f3b35' },
    sh: { fontSize: 8, fontWeight: 700, color: GREEN, letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },
    h: { fontSize: 8.5, fontWeight: 700, color: GREEN, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 12, marginBottom: 5 },
    role: { fontSize: 9.5, fontWeight: 600 }, company: { fontWeight: 400, color: '#2f3b35' },
    dates: { fontSize: 8, color: MUTED }, meta: { fontSize: 8, color: MUTED }, body: { fontSize: 8.8 }, small: { fontSize: 8.3, marginBottom: 2 },
  });
  return (
    <Page size="A4" style={s.page}>
      <View style={s.sideBg} fixed />
      <View style={s.side}>
        <Text style={s.name}>{cv.full_name}</Text>
        {cv.headline ? <Text style={s.headline}>{cv.headline}</Text> : null}
        <Text style={s.sh} minPresenceAhead={30}>Contact</Text>
        {contactBits(cv).map((c, i) => <Text key={i} style={s.small}>{c}</Text>)}
        {cv.links.map((l, i) => <Link key={i} src={href(l.url)} style={[s.small, { color: GREEN, textDecoration: 'none' }]}>{l.label || l.url}</Link>)}
        {cv.skills.length ? <><Text style={s.sh} minPresenceAhead={30}>Skills</Text>{cv.skills.map((k, i) => <Text key={i} style={s.small}>{k}</Text>)}</> : null}
        {cv.languages.length ? <><Text style={s.sh} minPresenceAhead={30}>Languages</Text>{cv.languages.map((k, i) => <Text key={i} style={s.small}>{k}</Text>)}</> : null}
        {cv.certifications.length ? <><Text style={s.sh} minPresenceAhead={30}>Certifications</Text>{cv.certifications.map((k, i) => <Text key={i} style={s.small}>{k}</Text>)}</> : null}
      </View>
      <View style={s.main}>
        {cv.summary ? <><Text style={[s.h, { marginTop: 0 }]} minPresenceAhead={40}>Profile</Text><Text style={s.body}>{cv.summary}</Text></> : null}
        {cv.experience.length ? <><Text style={s.h} minPresenceAhead={40}>Experience</Text><Experience cv={cv} s={s} /></> : null}
        {cv.education.length ? <><Text style={s.h} minPresenceAhead={40}>Education</Text><Education cv={cv} s={s} /></> : null}
      </View>
    </Page>
  );
}

/* ------------------------------------------------------------- Cover letter */

function Letter({ cv, letter, company }) {
  const s = StyleSheet.create({
    page: { fontFamily: 'Inter', fontSize: 10.5, color: '#14201b', paddingVertical: 48, paddingHorizontal: 56, lineHeight: 1.55 },
    name: { fontSize: 18, fontWeight: 700, color: GREEN, lineHeight: 1.2 },
    contact: { fontSize: 9, color: MUTED, marginTop: 3 },
    date: { marginTop: 24, marginBottom: 14, fontSize: 10, color: MUTED },
    p: { marginBottom: 10 },
  });
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.name}>{cv.full_name}</Text>
      <Text style={s.contact}>{contactBits(cv).join('   ·   ')}</Text>
      <Text style={s.date}>{today}{company ? `  ·  ${company}` : ''}</Text>
      {letter.split(/\n\s*\n/).map((para, i) => <Text key={i} style={s.p}>{para.trim()}</Text>)}
    </Page>
  );
}

const TEMPLATE_COMPONENTS = { modern: Modern, classic: Classic, compact: Compact };

export async function renderCvPdf(cv, template = 'modern') {
  registerFonts();
  const Tpl = TEMPLATE_COMPONENTS[template] ?? Modern;
  return renderToBuffer(<Document title={`${cv.full_name} – CV`} author={cv.full_name}><Tpl cv={cv} /></Document>);
}

export async function renderLetterPdf(cv, letter, company) {
  registerFonts();
  return renderToBuffer(<Document title={`${cv.full_name} – Cover letter`} author={cv.full_name}><Letter cv={cv} letter={letter} company={company} /></Document>);
}
