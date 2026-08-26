import { parseJobWithRegex } from '../services/regexParser.js';
import { parseAgeLimit } from '../services/normalizeJob.js';

/**
 * Regression cases for the parser, drawn from the live audit.
 *
 * Case 1 is the headline defect: `M\.?E(?:ng)?` carries no LEADING `\b`, so it
 * matches the "me" inside Name / Time / Home / Employment. Breadcrumb and form
 * text leaking in from the container bug therefore produced `qualification: "me"`
 * on 6 of 18 sampled listings.
 */
const CASES = [
  {
    name: 'breadcrumb noise must NOT yield a qualification',
    text: 'Home > Recruitment > Name of Post Time of Examination Employment News',
    expectQualificationNot: ['me', 'be', 'e', 'm'],
  },
  {
    name: 'B.Tech survives the label capture',
    text: 'Educational Qualification: B.Tech in Computer Science from a recognised University.',
    expectQualificationContains: 'B.Tech',
  },
  {
    name: 'real degree keyword still detected',
    text: 'Candidates must hold a Bachelor of Engineering (B.E.) in Civil.',
    expectQualificationTruthy: true,
  },
  {
    name: 'pay level extracted',
    text: 'PAY SCALE: Level- 10 in the Pay Matrix as per 7th CPC.',
    expectSalaryContains: 'Level',
  },
  {
    name: 'vacancy count extracted',
    text: 'Total 11 posts are available in various regional offices.',
    expectVacanciesContains: '11',
  },
  {
    name: 'age range extracted',
    text: 'Age limit: 21 to 30 years as on 01/08/2026.',
    expectAgeTruthy: true,
  },
  {
    name: 'deadline date extracted',
    text: 'Last date for submission of online application is 11/09/2026 (1800 hrs).',
    expectDeadlineISO: '2026-09-11',
  },
  {
    name: 'no dates in text yields no deadline',
    text: 'Applications are invited for the post of Accountant on deputation basis.',
    expectDeadlineNull: true,
  },
];

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const r = parseJobWithRegex(c.text);
  const problems = [];

  const q = r.qualification;
  if (c.expectQualificationNot) {
    const bad = q && c.expectQualificationNot.includes(String(q).toLowerCase().trim());
    if (bad) problems.push(`qualification is junk: ${JSON.stringify(q)}`);
  }
  if (c.expectQualificationContains && !String(q || '').includes(c.expectQualificationContains)) {
    problems.push(`qualification ${JSON.stringify(q)} lacks ${JSON.stringify(c.expectQualificationContains)}`);
  }
  if (c.expectQualificationTruthy && !q) problems.push('qualification empty');
  if (c.expectSalaryContains && !String(r.salary || '').includes(c.expectSalaryContains)) {
    problems.push(`salary ${JSON.stringify(r.salary)} lacks ${JSON.stringify(c.expectSalaryContains)}`);
  }
  if (c.expectVacanciesContains && !String(r.vacanciesCount ?? '').includes(c.expectVacanciesContains)) {
    problems.push(`vacanciesCount ${JSON.stringify(r.vacanciesCount)} lacks ${JSON.stringify(c.expectVacanciesContains)}`);
  }
  if (c.expectAgeTruthy && !r.ageLimit) problems.push('ageLimit empty');
  if (c.expectDeadlineISO) {
    const iso = r.applicationDeadline instanceof Date ? r.applicationDeadline.toISOString().slice(0, 10) : null;
    // IST midnight-to-end-of-day lands the UTC calendar day one earlier at times;
    // compare on the IST calendar day instead.
    const ist = r.applicationDeadline
      ? new Date(r.applicationDeadline.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
      : null;
    if (ist !== c.expectDeadlineISO) problems.push(`deadline ${ist ?? iso} != ${c.expectDeadlineISO}`);
  }
  if (c.expectDeadlineNull && r.applicationDeadline) {
    problems.push(`deadline should be null, got ${r.applicationDeadline.toISOString()}`);
  }

  if (problems.length) {
    fail += 1;
    console.log(`FAIL  ${c.name}`);
    problems.forEach((p) => console.log(`        ${p}`));
    console.log(`        got: ${JSON.stringify({ q: r.qualifications, salary: r.salary, vac: r.vacanciesCount, age: r.ageLimit, loc: r.location })}`);
  } else {
    pass += 1;
    console.log(`ok    ${c.name}`);
  }
}

/**
 * Numeric age bounds.
 *
 * `parseAgeLimit` turns the raw string above into `{min, max}`, and the first
 * case is a live defect: every one of the 8 stored UPSC advertisements carried
 * `ageLimit.max: 10`, because UPSC's boilerplate ends "…The age is further
 * relaxable upto 10 years for PwBD" and `upto 10` matched the upper-bound
 * pattern. A relaxation is a concession, never the limit.
 */
const AGE_CASES = [
  ['40 years for ST. The age is further relaxable upto 10 years for PwBD', null, 40],
  ['Not exceeding 30 years (relaxable upto 5 years for SC/ST)', null, 30],
  ['21 to 30 years', 21, 30],
  ['18-27 years', 18, 27],
  ['Maximum age 56 years', null, 56],
  ['35 years', null, 35],
  // A relaxation with no stated limit tells you nothing — null is the honest answer.
  ['Relaxable upto 5 years for OBC candidates', null, null],
  ['Age as on 01/01/2026 must not exceed 32 years', null, 32],
  ['Not specified', null, null],
];

for (const [raw, expectMin, expectMax] of AGE_CASES) {
  const got = parseAgeLimit(raw);
  const label = `age: ${raw.slice(0, 52)}`;
  if (got.min === expectMin && got.max === expectMax) {
    pass += 1;
    console.log(`ok    ${label}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${label}`);
    console.log(
      `        expected {min:${expectMin}, max:${expectMax}}, got {min:${got.min}, max:${got.max}}`
    );
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
