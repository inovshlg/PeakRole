#!/usr/bin/env node
// Checks the source parsers against sample payloads shaped like each API's real response.
import assert from 'node:assert/strict';
import { parseGreenhouse, parseLever, parseAshby, parseAdzuna } from '../lib/sources.mjs';
import { inferSeniority, dedupeKey, cleanHtml } from '../lib/jobs.mjs';

const gh = parseGreenhouse({ jobs: [{ id: 1, title: 'Senior Engineer', location: { name: 'Remote - US' }, absolute_url: 'https://x/1', updated_at: '2026-11-01T00:00:00Z', content: '&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;' }] }, 'Acme');
assert.equal(gh[0].description_html, '<p>Hello &amp; welcome</p>');
assert.equal(gh[0].remote, true);

const lv = parseLever([{ id: 'abc', text: 'Head of Sales', categories: { location: 'London', commitment: 'Full-time' }, applyUrl: 'https://x/apply', createdAt: 1730000000000, description: '<p>d</p>', lists: [{ text: 'You', content: '<li>a</li>' }], salaryRange: { min: 100000, max: 140000, currency: 'GBP', interval: 'per-year-salary' } }], 'Acme');
assert.equal(lv[0].salary_max, 140000);
assert.match(lv[0].description_html, /<h3>You<\/h3>/);

const ab = parseAshby({ jobs: [{ id: 'z', title: 'Designer', location: 'Berlin', isRemote: false, employmentType: 'Contract', publishedAt: '2026-10-01', applyUrl: 'https://x', descriptionHtml: '<p>x</p>', compensation: { summaryComponents: [{ compensationType: 'Salary', minValue: 50, maxValue: 60, currencyCode: 'EUR', interval: '1 HOUR' }] } }] }, 'Acme');
assert.equal(ab[0].salary_min, 104000);
assert.equal(ab[0].employment_type, 'Contract');

const az = parseAdzuna({ results: [{ id: '9', title: '<strong>Director</strong> of Finance', company: { display_name: 'Big Co' }, location: { display_name: 'Manchester' }, description: 'x', redirect_url: 'https://adzuna/9', created: '2026-11-01T00:00:00Z', salary_min: 90000, salary_max: 90000, salary_is_predicted: '0', contract_time: 'full_time' }] }, 'gb');
assert.equal(az[0].title, 'Director of Finance');
assert.equal(az[0].currency, 'GBP');

assert.equal(inferSeniority('VP of Engineering'), 'Executive');
assert.equal(inferSeniority('Head of Product'), 'Director');
assert.equal(dedupeKey({ company: 'Acme Inc', title: 'Sr. Engineer (Remote)', location: 'London, UK' }), 'acme inc|sr engineer|london');
assert.ok(!cleanHtml('<p onclick="x">a<script>bad()</script></p>').includes('script'));
console.log('All parser tests passed ✓');

// Phase 4 connectors
import { parseSmartRecruitersPosting, parseRecruitee, parseWorkable } from '../lib/sources.mjs';
const sr = parseSmartRecruitersPosting(
  { id: 'sr1', name: 'Head of Finance', company: { name: 'Bosch', identifier: 'BoschGroup' }, location: { city: 'Bengaluru', region: 'KA', country: 'in', remote: false }, releasedDate: '2026-11-01T00:00:00Z', typeOfEmployment: { label: 'Full-time' } },
  { jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Lead finance</p>' }, qualifications: { text: '<ul><li>CA</li></ul>' } } }, applyUrl: 'https://jobs.smartrecruiters.com/BoschGroup/sr1/apply' }
);
assert.equal(sr.location, 'Bengaluru, KA, India');
assert.match(sr.description_html, /Lead finance.*Qualifications.*CA/s);
const rc = parseRecruitee({ offers: [{ id: 7, title: 'VP Sales', company_name: 'Acme', location: 'Mumbai, India', remote: false, employment_type_code: 'fulltime', description: '<p>x</p>', requirements: '<p>y</p>', careers_apply_url: 'https://acme.recruitee.com/o/vp/c/new', published_at: '2026-11-01', salary: { min: '4000000', max: '5000000', currency: 'INR', period: 'year' } }] }, 'acme');
assert.equal(rc[0].salary_max, 5000000);
assert.equal(rc[0].currency, 'INR');
const wk = parseWorkable({ name: 'Zeta Co', jobs: [{ title: 'Engineering Manager', shortcode: 'AB12', city: 'Pune', country: 'India', telecommuting: true, description: '<p>z</p>', application_url: 'https://apply.workable.com/zeta/j/AB12/apply', published_on: '2026-11-02', employment_type: 'Full-time' }] }, 'zeta');
assert.equal(wk[0].company, 'Zeta Co');
assert.equal(wk[0].remote, true);
console.log('Phase 4 connector tests passed ✓');
