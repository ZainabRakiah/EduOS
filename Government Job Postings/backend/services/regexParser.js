import { parseDate, parseDeadline, findLabeledDeadline } from '../utils/parseDate.js';

/**
 * Regex-Based Job Parser
 * ──────────────────────
 * Deterministic extraction from a raw text block (listing text + detail page
 * text + PDF text). Runs before Gemini so the AI is only asked for what genuine
 * prose-reading is needed for; every field this fills is a token not spent.
 *
 * Fields are `null` when absent — never the string `'Not specified'`. A sentinel
 * string is indistinguishable from a real value downstream: it defeats
 * `contentHash` comparison (two differently-unknown jobs hash as equal-ish),
 * it makes `Boolean(field)` a lie, and it forces the frontend to string-match
 * for emptiness. Defaults belong to the display layer.
 *
 * ── Two defects this file previously had, both found in a live audit ──
 *
 * 1. `qualification` was the literal string `"me"` on 6 of 18 sampled listings.
 *    `/(?:…|M\.?E(?:ng)?)\b/i` has a trailing `\b` but no LEADING one, so it
 *    matched the "me" inside *Name*, *Time*, *Home*, *Employment*. Breadcrumb
 *    text leaking in from the container-selection bug did the rest.
 *
 *    Anchoring alone is not enough, because `ME` and `me` are the same string
 *    under `/i` and "me" is an ordinary English word. Two rules fix it as a
 *    class rather than word by word: abbreviations are matched
 *    **case-sensitively**, and a bare abbreviation only counts when it appears
 *    **near a qualification cue** (see `QUALIFICATION_CUE`). "Home > Name of
 *    Post" contains no cue, so nothing is extracted — which is correct.
 *
 * 2. There were **no date patterns at all**, so deadlines could never be read
 *    from prose. Deadline-driven expiry depends on them.
 */

/** A bare degree abbreviation is only believable this close to one of these. */
const QUALIFICATION_CUE =
  /\b(?:qualification|eligibilit|educational|essential|desirable|degree|diploma|passed|hold|possess|recognised|recognized)/i;

/** How far from a cue a bare abbreviation may sit and still count. */
const CUE_WINDOW = 220;

// ── Salary ─────────────────────────────────────────────────────────────────
const SALARY_PATTERNS = [
  /(?:pay\s*scale|pay\s*level|pay\s*band|pay\s*matrix|salary|remuneration|emoluments)[:\s-]*([^\n]{5,120})/i,
  /\bLevel[\s-]*\d+\b[^\n]{0,60}/i,
  /**
   * At least four digits, or a thousands separator, or an explicit LPA/annum
   * unit. A bare `Rs. 4` is a fee, a clause number or a form field — matching it
   * produced `salary: "rs. 4"` from a UPSC exam page whose actual pay scale was
   * never stated on the page at all.
   */
  /(?:Rs\.?|₹|INR)\s*(?:\d{1,3}(?:,\d{2,3})+|\d{4,})(?:\s*[-–]\s*(?:Rs\.?|₹)?\s*(?:\d{1,3}(?:,\d{2,3})+|\d{4,}))?(?:\s*(?:per\s*month|p\.?m\.?|per\s*annum|p\.?a\.?))?/i,
  /\b\d{1,3}(?:\.\d+)?\s*[-–to]+\s*\d{1,3}(?:\.\d+)?\s*LPA\b/i,
];

// ── Qualification ──────────────────────────────────────────────────────────
/** Label-led form: the value follows a heading. Highest confidence. */
const QUALIFICATION_LABEL =
  /(?:educational\s*(?:&|and)?\s*)?(?:qualifications?|eligibility|educational\s*requirements?|academic\s*qualifications?)\s*(?:required)?\s*[:\-–]\s*([^\n]{5,200})/i;

/**
 * Unambiguous words. Safe case-insensitively — no English homograph.
 */
const QUALIFICATION_WORDS = [
  /\bBachelor'?s?\s*Degree\b/i,
  /\bMaster'?s?\s*Degree\b/i,
  // Spelt-out forms: "Bachelor of Engineering", "Master of Science".
  /\b(?:Bachelor|Master)'?s?\s+(?:of|in)\s+[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,3}/,
  /\bPost[\s-]*Graduate\b/i,
  /\bGraduat(?:e|ion)\b/i,
  /\bDoctorate\b/i,
  /\bChartered\s*Accountant\b/i,
  /\bLaw\s*Degree\b/i,
  /\bDiploma\b/i,
  /\bPolytechnic\b/i,
  /\bMatriculation\b/i,
  /\bSecondary\s*School\b/i,
  /\bSenior\s*Secondary\b/i,
  /\bHigher\s*Secondary\b/i,
  /\b1[02]th\s*(?:Pass|Standard)\b/i,
  /\bIntermediate\b/i,
];

/**
 * Abbreviations. **Case-sensitive on purpose** — `ME`, `MS`, `MA`, `CA`, `BE`
 * are all ordinary lowercase words or fragments, and `/i` is exactly what
 * produced `qualification: "me"`. Additionally gated by `QUALIFICATION_CUE`.
 */
const QUALIFICATION_ABBREVIATIONS = [
  /\bB\.?Tech\b/,
  /\bM\.?Tech\b/,
  /\bB\.?E\.?(?:ng)?\b/,
  /\bM\.?E\.?(?:ng)?\b/,
  /\bB\.?Sc\b/,
  /\bM\.?Sc\b/,
  /\bB\.?Com\b/,
  /\bM\.?Com\b/,
  /\bB\.?A\b/,
  /\bM\.?A\b/,
  /\bPh\.?D\b/,
  /\bMBBS\b/,
  /\bBDS\b/,
  /\bMDS\b/,
  /\bLL\.?[BM]\b/,
  /\bMBA\b/,
  /\bC\.?A\b/,
  /\bCMA\b/,
  /\bICAI\b/,
];

// ── Age limit ──────────────────────────────────────────────────────────────
const AGE_PATTERNS = [
  /(?:age\s*limit|age\s*criteria|upper\s*age|lower\s*age)\s*[:\-–]\s*([^\n]{3,100})/i,
  /(?:maximum\s*age|max\.?\s*age)\s*[:\-–]?\s*(\d{2}\s*years?)/i,
  /(?:between\s*)?\b(\d{2})\s*(?:to|-|–|and)\s*(\d{2})\s*years?\b/i,
  /\b(?:not\s*exceeding|below|above|under)\s*(\d{2})\s*years?\b/i,
];

// ── Location ───────────────────────────────────────────────────────────────
const LOCATION_PATTERNS = [
  /(?:place\s*of\s*posting|posting|location|station|headquarters?)\s*[:\-–]\s*([^\n]{3,100})/i,
  /\b(?:New\s*Delhi|Delhi|Mumbai|Kolkata|Chennai|Bengaluru|Bangalore|Hyderabad|Pune|Ahmedabad|Lucknow|Chandigarh)\b/i,
  /\b(?:All\s*India|Pan[\s-]*India|Anywhere\s*in\s*India|Across\s*India)\b/i,
  /\b(?:Various\s*Centres?|Various\s*Cities|Multiple\s*Locations)\b/i,
];

// ── Vacancies ──────────────────────────────────────────────────────────────
const VACANCY_PATTERNS = [
  /\btotal\s*(?:no\.?\s*of\s*)?(?:posts?|vacanc(?:y|ies))?\s*[:\-–]?\s*(\d{1,4})\b/i,
  /\b(?:no\.?|number)\s*of\s*(?:posts?|vacanc(?:y|ies))\s*[:\-–]?\s*(\d{1,4})\b/i,
  /\b(\d{1,4})\s*(?:posts?|vacanc(?:y|ies))\b/i,
  /\b(?:posts?|vacanc(?:y|ies))\s*[:\-–]\s*(\d{1,4})\b/i,
];

// ── Notification PDF ───────────────────────────────────────────────────────
const PDF_PATTERNS = [
  /https?:\/\/[^\s"'<>)]+\.pdf(?:\?[^\s"'<>)]*)?/gi,
  /https?:\/\/[^\s"'<>)]*(?:notification|advertisement|advt|circular|notice)[^\s"'<>)]*/gi,
];

// ── Dates ──────────────────────────────────────────────────────────────────
/**
 * Deadline phrasings, most specific first — `findLabeledDeadline` tries them in
 * order, so `last date for receipt of application` must precede `last date` or
 * the shorter label wins and can attach to the wrong date.
 */
const DEADLINE_LABELS = [
  'last date for receipt of online application',
  'last date for receipt of application',
  'last date of receipt of application',
  'last date for submission of online application',
  'last date for submission of application',
  'last date for online submission',
  'last date for submission',
  'last date of submission',
  'last date to apply',
  'last date for apply',
  'closing date for receipt of application',
  'closing date for submission',
  'closing date',
  'last date of application',
  'last date for application',
  'application end date',
  'end date',
  'last date',
];

const START_LABELS = [
  'opening date for online registration',
  'opening date of online application',
  'starting date for online application',
  'commencement of online registration',
  'application start date',
  'start date of application',
  'opening date',
  'starting date',
  'start date',
];

const POSTED_LABELS = [
  'date of advertisement',
  'advertisement date',
  'date of publication',
  'published on',
  'notification date',
  'date of issue',
  'issued date',
  'issue date',
];

function tidy(value) {
  return value === null || value === undefined
    ? null
    : String(value).replace(/\s+/g, ' ').trim() || null;
}

/**
 * Truncates a captured value at the first sentence break.
 *
 * The previous capture groups used `[^.\n]` to stop at a period, which silently
 * destroyed every value containing one: `B.Tech` became `B` (then failed the
 * 5-char minimum and vanished entirely). Periods are allowed through here, and
 * only a period *followed by whitespace* ends the value — so `B.Tech`, `M.Sc.`
 * and `Rs.` survive while genuine sentence boundaries still cut.
 */
function cutAtSentence(value, limit) {
  const text = tidy(value);
  if (!text) return null;
  const stop = text.search(/\.\s/);
  const cut = stop > 0 ? text.slice(0, stop) : text;
  return tidy(cut.slice(0, limit));
}

/** True when `index` sits within `CUE_WINDOW` characters of a qualification cue. */
function nearCue(text, index) {
  const from = Math.max(0, index - CUE_WINDOW);
  const window = text.slice(from, index + CUE_WINDOW);
  return QUALIFICATION_CUE.test(window);
}

function extractSalary(text) {
  const labelled = text.match(SALARY_PATTERNS[0]);
  if (labelled) {
    const value = cutAtSentence(labelled[1], 120);
    if (value && value.length >= 5) return value;
  }
  for (let i = 1; i < SALARY_PATTERNS.length; i += 1) {
    const match = text.match(SALARY_PATTERNS[i]);
    const value = tidy(match?.[0]);
    if (value && value.length >= 4) return value.slice(0, 120);
  }
  return null;
}

function extractQualification(text) {
  const labelled = text.match(QUALIFICATION_LABEL);
  if (labelled) {
    const value = cutAtSentence(labelled[1], 200);
    if (value && value.length >= 5) return value;
  }

  for (const pattern of QUALIFICATION_WORDS) {
    const match = text.match(pattern);
    if (match) return tidy(match[0]);
  }

  // Abbreviations only count near a cue — see the module header.
  for (const pattern of QUALIFICATION_ABBREVIATIONS) {
    const match = text.match(pattern);
    if (match && nearCue(text, match.index)) return tidy(match[0]);
  }

  return null;
}

function extractAgeLimit(text) {
  const labelled = text.match(AGE_PATTERNS[0]);
  if (labelled) {
    const value = cutAtSentence(labelled[1], 100);
    if (value && value.length >= 3) return value;
  }

  const max = text.match(AGE_PATTERNS[1]);
  if (max) return `Max ${tidy(max[1])}`;

  const range = text.match(AGE_PATTERNS[2]);
  if (range) return `${range[1]} - ${range[2]} years`;

  const bound = text.match(AGE_PATTERNS[3]);
  if (bound) return tidy(bound[0]);

  return null;
}

function extractLocation(text) {
  const labelled = text.match(LOCATION_PATTERNS[0]);
  if (labelled) {
    const value = cutAtSentence(labelled[1], 100);
    if (value && value.length >= 3) return value;
  }
  if (LOCATION_PATTERNS[2].test(text)) return 'Across India';
  const city = text.match(LOCATION_PATTERNS[1]);
  if (city) return tidy(city[0]);
  if (LOCATION_PATTERNS[3].test(text)) return 'Various Locations';
  return null;
}

function extractVacancies(text) {
  for (const pattern of VACANCY_PATTERNS) {
    const match = text.match(pattern);
    const count = Number(match?.[1]);
    // A four-digit "vacancy count" is nearly always a year that drifted into
    // range, and 0 posts is not a posting.
    if (Number.isFinite(count) && count > 0 && count < 100_000 && !/^(?:19|20)\d{2}$/.test(match[1])) {
      return { raw: tidy(match[0]), count };
    }
  }
  return null;
}

function extractNotificationPdf(text) {
  for (const pattern of PDF_PATTERNS) {
    pattern.lastIndex = 0;
    const first = [...text.matchAll(pattern)][0];
    if (first) return first[0];
  }
  return null;
}

/**
 * Parses a raw text block into structured job fields.
 *
 * @param {string} rawText Combined listing + detail + PDF text
 * @returns {object} Canonical fields, `null` where not found, plus `fieldsFilled`
 *   and `isComplete`. Legacy aliases (`qualification`, `jobLocation`,
 *   `officialNotificationPdf`) are kept while the old pipeline is retired.
 */
export function parseJobWithRegex(rawText) {
  const text = tidy(rawText) || '';

  const qualifications = extractQualification(text);
  const vacancies = extractVacancies(text);
  const salary = extractSalary(text);
  const ageLimit = extractAgeLimit(text);
  const notificationPdfUrl = extractNotificationPdf(text);
  const location = extractLocation(text);

  const applicationDeadline = findLabeledDeadline(text, DEADLINE_LABELS) || null;
  const applicationStartDate = findLabeledDeadline(text, START_LABELS) || null;
  const postedAt = findLabeledDeadline(text, POSTED_LABELS) || null;

  const fields = {
    qualifications,
    vacanciesRaw: vacancies?.raw || null,
    vacanciesCount: vacancies?.count ?? null,
    salary,
    ageLimit,
    location,
    notificationPdfUrl,
    applicationDeadline,
    applicationStartDate,
    postedAt,
  };

  const fieldsFilled = Object.values(fields).filter(
    (value) => value !== null && value !== undefined
  ).length;

  /**
   * Gate for skipping the AI call. The old rule — 2 of {qualification, salary,
   * vacancies} — fired 0/18 times in the audit while simultaneously counting the
   * bogus `"me"` as a hit, so it was both too strict and unsound. A posting is
   * only "complete enough" when the fields a reader actually needs are present:
   * what the job is paid, who may apply, and by when.
   */
  const isComplete = Boolean(
    qualifications && salary && applicationDeadline && (vacancies || ageLimit)
  );

  return {
    ...fields,

    // Legacy names, still read by the pipeline being replaced.
    qualification: qualifications,
    jobLocation: location,
    officialNotificationPdf: notificationPdfUrl,

    fieldsFilled,
    isComplete,
  };
}

export { DEADLINE_LABELS, START_LABELS, POSTED_LABELS, parseDate, parseDeadline };
export default { parseJobWithRegex };
