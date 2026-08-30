import { sha256, normalizeForHash } from '../utils/hash.js';
import { NOT_SPECIFIED } from '../models/Job.js';

/**
 * Job Normalizer
 * ──────────────
 * Turns a raw extractor row into the canonical `Job` shape the API serves and
 * the frontend renders directly, then fingerprints it.
 *
 * Extractors are free to return whatever their source naturally provides —
 * UPSC's booklets give labelled prose blocks, SSC gives a parsed headline,
 * Employment News gives five table columns. Everything downstream (change
 * detection, expiry, the API, the UI) sees one shape because of this file.
 *
 * ── Why the hash excludes most of the record ──
 * `contentHash` decides whether a database write happens, so it must cover
 * exactly the fields whose change is *meaningful to a reader* and nothing else.
 * `fetchedAt`/`lastSeenAt` change on every single sweep; including them would
 * make every job "changed" every 30 minutes, which is precisely the
 * rescrape-everything behaviour this system exists to avoid.
 */

/** Fields that define a posting's content. Order is irrelevant — see canonicalize. */
const HASHED_FIELDS = [
  'title',
  'organization',
  'department',
  'description',
  'responsibilities',
  'qualifications',
  'skills',
  'experience',
  'employmentType',
  'workMode',
  'applicationUrl',
  'notificationPdfUrl',
];

const EMPLOYMENT_TYPES = new Set([
  'permanent',
  'contractual',
  'deputation',
  'internship',
  'temporary',
  'unknown',
]);

const WORK_MODES = new Set(['onsite', 'hybrid', 'remote', 'unknown']);

/** Indian state names, for splitting a location string into city/state. */
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands',
];

const PAN_INDIA = /\b(?:all\s*india|pan[\s-]*india|anywhere\s*in\s*india|across\s*india|various\s*(?:centres?|cities|locations)|throughout\s*india)\b/i;

const WORK_MODE_PATTERNS = [
  [/\b(?:fully\s+)?remote(?:ly)?\b|\bwork\s+from\s+home\b|\bWFH\b/i, 'remote'],
  [/\bhybrid\b/i, 'hybrid'],
  [/\bon[\s-]*site\b|\bin[\s-]*office\b|\bheadquarters?\b/i, 'onsite'],
];

const EMPLOYMENT_PATTERNS = [
  [/\bdeputation\b|\bfor\s+absorption\b/i, 'deputation'],
  [/\bcontract(?:ual)?\s*basis\b|\bon\s+contract\b|\bcontractual\b/i, 'contractual'],
  [/\binternship\b|\bintern\b|\btrainee\b|\bapprentice\b/i, 'internship'],
  [/\btemporary\b|\bad[\s-]*hoc\b|\bshort[\s-]*term\b/i, 'temporary'],
  [/\bpermanent\b|\bregular\s+basis\b|\bdirect\s+recruitment\b/i, 'permanent'],
];

function clean(value) {
  return value === null || value === undefined
    ? null
    : String(value).replace(/\s+/g, ' ').trim() || null;
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Splits a prose block into list items.
 *
 * Government notifications enumerate duties as "(i) … (ii) …", "1. … 2. …" or
 * plain sentences, so all three are handled. The result feeds
 * `responsibilities` / `qualifications`, which the schema types as arrays.
 */
export function toList(value, maxItems = 12) {
  const text = clean(value);
  if (!text) return [];

  let parts;
  if (/\(\s*(?:i{1,3}|iv|v|vi{1,3}|ix|x)\s*\)/i.test(text)) {
    parts = text.split(/\(\s*(?:i{1,3}|iv|v|vi{1,3}|ix|x)\s*\)/i);
  } else if (/(?:^|\s)\d{1,2}[.)]\s/.test(text)) {
    parts = text.split(/(?:^|\s)\d{1,2}[.)]\s/);
  } else if (text.includes(';')) {
    parts = text.split(';');
  } else {
    // Only split on sentence ends, so "B.Tech" and "Rs." stay intact.
    parts = text.split(/\.\s+(?=[A-Z(])/);
  }

  return parts
    .map((part) => clean(part))
    .filter((part) => part && part.length >= 3)
    .slice(0, maxItems);
}

/**
 * Reads a numeric range out of a pay string.
 *
 * Indian notifications write pay four different ways — "Level-11 (Rs. 67,700 -
 * 2,08,700)", "Rs. 56,100-1,77,500", "₹8-10 LPA", "Level 10 in the Pay Matrix".
 * Lakh-per-annum figures are scaled to rupees so `min`/`max` are comparable
 * across sources; leaving one source in lakhs and another in rupees would make
 * any salary sort or filter meaningless.
 */
export function parseSalary(raw) {
  const text = clean(raw);
  const result = { raw: text, min: null, max: null, currency: 'INR', payLevel: null };
  if (!text) return result;

  const level = text.match(/\bLevel[\s-]*(\d{1,2})\b/i);
  if (level) result.payLevel = `Level ${level[1]}`;

  const lpa = text.match(/(\d{1,3}(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d{1,3}(?:\.\d+)?)\s*LPA\b/i);
  if (lpa) {
    result.min = Math.round(Number(lpa[1]) * 100_000);
    result.max = Math.round(Number(lpa[2]) * 100_000);
    return result;
  }

  // Indian digit grouping: 2,08,700 — not 208,700.
  const amounts = [...text.matchAll(/(?:Rs\.?|₹|INR)?\s*(\d{1,3}(?:,\d{2,3})+|\d{4,7})\b/gi)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    // Below ₹1,000 is a fee or a clause number, not a salary; the upper bound
    // keeps a stray year or PIN code out.
    .filter((n) => n >= 1_000 && n <= 100_000_000);

  if (amounts.length === 1) {
    result.min = amounts[0];
  } else if (amounts.length >= 2) {
    result.min = Math.min(...amounts);
    result.max = Math.max(...amounts);
  }

  return result;
}

/**
 * Reads "21 to 30 years" / "Max 35 years" / "not exceeding 56 years".
 *
 * Two guards, both earning their place from real UPSC text:
 *
 * A relaxation clause states a *concession* for reserved categories, never the
 * limit. "…40 years for ST. The age is further relaxable upto 10 years for PwBD"
 * matched `upto 10` and produced a maximum age of 10, which the UI then rendered
 * as "Up to 10 years". Everything from the first relaxation keyword onward is
 * therefore discarded before any number is read.
 *
 * The plausibility clamp is the backstop for whatever the first guard misses:
 * no government post has an age bound outside 15–70, so a number outside that
 * range is a misparse and null is the honest answer.
 */
const AGE_MIN_PLAUSIBLE = 15;
const AGE_MAX_PLAUSIBLE = 70;

function plausibleAge(value) {
  return Number.isFinite(value) && value >= AGE_MIN_PLAUSIBLE && value <= AGE_MAX_PLAUSIBLE;
}

export function parseAgeLimit(raw) {
  const text = clean(raw);
  const result = { raw: text, min: null, max: null };
  if (!text) return result;

  // Keep only the text before any relaxation/concession clause.
  const stated = text.split(/\b(?:relaxab|relaxation|concession)/i)[0].trim() || text;

  const range = stated.match(/\b(\d{2})\s*(?:to|-|–|and)\s*(\d{2})\s*(?:years?)?\b/i);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (plausibleAge(min) && plausibleAge(max) && min <= max) {
      result.min = min;
      result.max = max;
      return result;
    }
  }

  const upper = stated.match(
    /\b(?:max(?:imum)?|not\s*exceeding|below|under|upto|up\s*to)\s*(\d{2})\b/i
  );
  if (upper && plausibleAge(Number(upper[1]))) {
    result.max = Number(upper[1]);
    return result;
  }

  const single = stated.match(/\b(\d{2})\s*years?\b/i);
  if (single && plausibleAge(Number(single[1]))) result.max = Number(single[1]);

  return result;
}

/** Splits a location string into city/state and flags pan-India postings. */
export function parseLocation(raw) {
  const text = clean(raw);
  const result = { raw: text, city: null, state: null, isPanIndia: false };
  if (!text) return result;

  if (PAN_INDIA.test(text)) {
    result.isPanIndia = true;
    return result;
  }

  const state = STATES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(text));
  if (state) result.state = state;

  // "New Delhi, Delhi" → city "New Delhi". Take the leading segment, minus the
  // state name if the segment happens to be the state itself.
  const head = clean(text.split(/[,(]/)[0]);
  if (head && head.length <= 40 && head.toLowerCase() !== (state || '').toLowerCase()) {
    result.city = head;
  }

  return result;
}

/** Resolves employment type from an explicit hint, then from the text. */
export function resolveEmploymentType(row) {
  const explicit = clean(row.employmentType || row.employmentTypeHint)?.toLowerCase();
  if (explicit && EMPLOYMENT_TYPES.has(explicit)) return explicit;

  const haystack = [row.title, row.employmentTypeRaw, row.otherDetails, row.rawText]
    .filter(Boolean)
    .join(' ');

  for (const [pattern, type] of EMPLOYMENT_PATTERNS) {
    if (pattern.test(haystack)) return type;
  }
  return 'unknown';
}

/**
 * Resolves work mode.
 *
 * Honest expectation: Indian government notifications essentially never state
 * this, so `unknown` is the common and correct answer. It is inferred only from
 * an explicit statement — never guessed from the presence of an office address,
 * which would label every posting `onsite` on no evidence.
 */
export function resolveWorkMode(row) {
  const explicit = clean(row.workMode)?.toLowerCase();
  if (explicit && WORK_MODES.has(explicit)) return explicit;

  const haystack = [row.title, row.description, row.otherDetails].filter(Boolean).join(' ');
  for (const [pattern, mode] of WORK_MODE_PATTERNS) {
    if (pattern.test(haystack)) return mode;
  }
  return 'unknown';
}

/**
 * Builds a canonical job document from an extractor row.
 *
 * @param {object} row  Extractor output
 * @param {object} site Registry entry, for provenance
 * @param {object} [options]
 * @param {string} [options.identityKey]
 * @returns {object} A document ready for `Job`, including `contentHash`
 */
export function normalizeJob(row, site, options = {}) {
  const salary = parseSalary(row.salary || row.salaryRaw);
  const ageLimit = parseAgeLimit(row.ageLimit || row.ageLimitRaw);
  const location = parseLocation(row.location || row.locationRaw || row.jobLocation);

  const vacanciesCount = Number.isFinite(Number(row.vacanciesCount))
    ? Number(row.vacanciesCount)
    : null;

  const job = {
    identityKey: options.identityKey || row.identityKey || null,

    title: clean(row.title),
    organization: clean(row.organization) || site.department,
    department: site.department,

    description: clean(row.description) || '',
    responsibilities: toList(row.responsibilities),
    qualifications: toList(row.qualifications),
    skills: Array.isArray(row.skills) ? row.skills.map(clean).filter(Boolean) : [],
    experience: clean(row.experience) || NOT_SPECIFIED,

    location,
    employmentType: resolveEmploymentType(row),
    workMode: resolveWorkMode(row),

    salary: { ...salary, raw: salary.raw || NOT_SPECIFIED },
    vacancies: {
      raw: clean(row.vacanciesRaw) || NOT_SPECIFIED,
      count: vacanciesCount,
    },
    ageLimit: { ...ageLimit, raw: ageLimit.raw || NOT_SPECIFIED },

    postedAt: asDate(row.postedAt),
    applicationStartDate: asDate(row.applicationStartDate),
    applicationDeadline: asDate(row.applicationDeadline),
    applicationDeadlineRaw: clean(row.applicationDeadlineRaw) || NOT_SPECIFIED,

    applicationUrl: clean(row.applicationUrl) || site.fallbackApplicationUrl || site.url,
    notificationPdfUrl: clean(row.notificationPdfUrl),

    source: {
      siteId: site.id,
      name: site.name,
      portalUrl: site.portalUrl || site.url,
    },

    extras: buildExtras(row),

    extraction: {
      engine: row.extraction?.engine || 'structured',
      usedAi: Boolean(row.extraction?.usedAi),
      usedPdf: Boolean(row.usedPdf || row.extraction?.usedPdf),
      fieldsFilled: 0,
      confidence: 0,
    },
  };

  job.extraction.fieldsFilled = countFilled(job);
  job.extraction.confidence = confidenceOf(job);
  job.contentHash = computeContentHash(job);

  return job;
}

/**
 * Carries source-specific detail that deserves to be shown but not a column.
 *
 * This is the "any other important information" requirement: UPSC's reservation
 * breakdown and probation period are genuinely useful to an applicant and have
 * no equivalent on the other four portals, so a fixed column for them would be
 * empty 90% of the time.
 */
function buildExtras(row) {
  const extras = {};
  const carry = [
    'reservation',
    'probation',
    'desirable',
    'otherDetails',
    'advertNumber',
    'vacancyId',
    'examId',
  ];
  for (const key of carry) {
    const value = clean(row[key]);
    if (value) extras[key] = value;
  }
  if (row.degraded) extras.degraded = true;
  return extras;
}

/** Counts genuinely-populated fields, for the coverage report. */
function countFilled(job) {
  const checks = [
    job.title,
    job.organization !== NOT_SPECIFIED && job.organization,
    job.description,
    job.responsibilities.length,
    job.qualifications.length,
    job.skills.length,
    job.experience !== NOT_SPECIFIED && job.experience,
    job.location.raw,
    job.employmentType !== 'unknown',
    job.workMode !== 'unknown',
    job.salary.raw !== NOT_SPECIFIED,
    job.vacancies.count !== null,
    job.ageLimit.raw !== NOT_SPECIFIED,
    job.postedAt,
    job.applicationStartDate,
    job.applicationDeadline,
    job.notificationPdfUrl,
  ];
  return checks.filter(Boolean).length;
}

/**
 * Fraction of the 17 tracked fields that are populated.
 *
 * Reported rather than used as a gate: a genuinely sparse source (IBPS lists
 * only org, post and two dates) should not be treated as a failed extraction.
 */
function confidenceOf(job) {
  return Math.round((countFilled(job) / 17) * 100) / 100;
}

/**
 * Fingerprints the reader-meaningful content of a job.
 *
 * Dates are reduced to their calendar day: a source that re-renders a deadline
 * with a different time component has not changed anything an applicant cares
 * about, and treating it as a change would trigger a pointless write on every
 * sweep. Numeric salary and vacancy values are included so the requirement's own
 * example — ₹8–10 LPA becoming ₹10–12 LPA — produces a new hash and therefore an
 * in-place update rather than a duplicate document.
 */
export function computeContentHash(job) {
  const payload = {};

  for (const field of HASHED_FIELDS) {
    const value = job[field];
    payload[field] = Array.isArray(value)
      ? value.map((v) => normalizeForHash(String(v)))
      : normalizeForHash(String(value ?? ''));
  }

  payload.salary = [job.salary?.min ?? '', job.salary?.max ?? '', job.salary?.payLevel ?? ''];
  payload.vacancies = job.vacancies?.count ?? '';
  payload.ageLimit = [job.ageLimit?.min ?? '', job.ageLimit?.max ?? ''];
  payload.location = [job.location?.city ?? '', job.location?.state ?? '', job.location?.isPanIndia];

  payload.dates = ['postedAt', 'applicationStartDate', 'applicationDeadline'].map((key) =>
    job[key] instanceof Date ? job[key].toISOString().slice(0, 10) : ''
  );

  return sha256(payload);
}

/**
 * Hash of a listing row, before any detail fetching.
 *
 * Tier-1 signal: when this is unchanged the detail page is not re-fetched, no
 * PDF is re-parsed and no AI call is made. Only the fields the index itself
 * shows are included, since that is all the comparison can see.
 */
export function computeListingHash(row) {
  return sha256({
    title: normalizeForHash(row.title || ''),
    organization: normalizeForHash(row.organization || ''),
    url: normalizeForHash(row.applicationUrl || ''),
    pdf: normalizeForHash(row.notificationPdfUrl || ''),
    deadline:
      row.applicationDeadline instanceof Date
        ? row.applicationDeadline.toISOString().slice(0, 10)
        : normalizeForHash(row.applicationDeadlineRaw || ''),
    vacancies: row.vacanciesCount ?? '',
    salary: normalizeForHash(row.salary || ''),
  });
}

export default { normalizeJob, computeContentHash, computeListingHash };
