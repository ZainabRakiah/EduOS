import * as cheerio from 'cheerio';
import { fetchResource } from '../http.js';
import { extractPdfText, extractLabeledSection } from '../pdfExtractor.js';
import { resolveUrl } from '../../utils/normalizeUrl.js';
import { parseDeadline } from '../../utils/parseDate.js';
import { NUMBER_WORDS } from '../../config/siteRegistry.js';

/**
 * UPSC Advertisement Extractor
 * ────────────────────────────
 * UPSC publishes recruitment as advertisement *booklets*: the index lists two
 * or three PDFs, and each PDF contains many individually-numbered vacancies,
 * every one of which is a distinct job posting.
 *
 * This is a two-stage extraction — index → PDF → per-vacancy segments — and it
 * is the only way to get UPSC recruitment data at all. The listing page carries
 * nothing but an advertisement number and a link.
 *
 * The previous pipeline pointed at `/recruitment/recruitment-advertisements`
 * (plural) instead, which live probing showed to be a dead 2011-2017 archive of
 * answer keys, cut-off marks and question papers with no current vacancies and
 * no dates. See the registry entry for the full finding.
 *
 * Each vacancy yields a stable `Vacancy No.` (e.g. `26081001608`) used as the
 * identity key — better than a filename, which changes whenever the booklet is
 * re-uploaded with a new date suffix.
 */

/** Splits "<Ministry|Department|Administration> of …" off the end of a heading. */
const AUTHORITY = /,\s*((?:Ministry|Department|Deptt\.?|Administration|Government|Govt\.?)\s+of\s+.+)$/i;

/** Marks a post as permanent/temporary/deputation in the OTHER DETAILS text. */
const TENURE_PATTERNS = [
  [/\bpost\s+is\s+permanent\b/i, 'permanent'],
  [/\bpost\s+is\s+temporary\b/i, 'temporary'],
  [/\bon\s+deputation\b/i, 'deputation'],
  [/\b(?:contractual|on\s+contract)\b/i, 'contractual'],
];

/**
 * Converts UPSC's spelled-out vacancy counts to numbers.
 * Handles "Nine", "Eleven", "Twenty-five" and plain digits.
 */
export function wordsToNumber(raw) {
  if (!raw) return null;

  const text = String(raw).trim().toLowerCase();
  if (/^\d+$/.test(text)) return Number(text);

  const parts = text.split(/[-\s]+/).filter(Boolean);
  if (!parts.length) return null;

  let total = 0;
  let seen = false;

  for (const part of parts) {
    const value = NUMBER_WORDS[part];
    if (value === undefined) continue;
    seen = true;
    // "Hundred" multiplies what came before it ("Two hundred" → 200).
    if (value === 100) total = (total || 1) * 100;
    else total += value;
  }

  return seen ? total : null;
}

/**
 * Sums a reservation breakdown, e.g. "(UR-29, EWS-08, OBC-18, SC-15, ST-10)".
 * Used as the fallback when the spelled-out count cannot be read.
 */
export function sumReservation(raw) {
  if (!raw) return null;
  const matches = [...String(raw).matchAll(/\b(?:UR|EWS|OBC|SC|ST)\s*[-–]\s*(\d{1,4})\b/gi)];
  if (!matches.length) return null;
  return matches.reduce((sum, m) => sum + Number(m[1]), 0);
}

/**
 * Splits "Assistant Executive Engineer (Civil) in Directorate General of
 * Lighthouses and Lightships, Ministry of Ports, Shipping and Waterways" into
 * its post / organisation / controlling-authority parts.
 *
 * The authority suffix is removed first, then the *last* " in " separates post
 * from organisation. Taking the last one matters: a post name can itself
 * contain "in", as in "Specialist Grade III in Medicine in Central Health
 * Service", where splitting on the first would truncate the job title.
 */
export function splitHeading(heading, fallbackDepartment) {
  const clean = (heading || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  if (!clean) return { title: null, organization: null, department: fallbackDepartment };

  let remainder = clean;
  let department = null;

  const authority = clean.match(AUTHORITY);
  if (authority) {
    department = authority[1].trim();
    remainder = clean.slice(0, authority.index).trim();
  }

  let title = remainder;
  let organization = null;

  const lastIn = remainder.toLowerCase().lastIndexOf(' in ');
  if (lastIn > 0) {
    title = remainder.slice(0, lastIn).trim();
    organization = remainder.slice(lastIn + 4).trim();
  }

  return {
    title: title || null,
    organization: organization || department || null,
    department: department || organization || fallbackDepartment,
  };
}

/**
 * Reads the booklet's closing-date sentence into scoped date entries.
 *
 * A booklet can carry more than one deadline, qualified by which posts it
 * covers. Advt 10-2026 states 28-08-2026 "for posts other than those under the
 * Administration of UT of Ladakh" and 04-09-2026 for the Ladakh posts. Two of
 * its seven vacancies are Ladakh posts, so ignoring the qualifier would delete
 * them a week early.
 */
export function readScopedDeadlines(flat, config) {
  const sentence = (flat.match(config.deadline.sentence) || [''])[0];
  if (!sentence) return [];

  const entries = [];
  // The global flag makes this stateful, so re-create it per call.
  const pattern = new RegExp(config.deadline.scoped.source, config.deadline.scoped.flags);

  for (const match of sentence.matchAll(pattern)) {
    const raw = `${match[1] || ''}${match[2]}`.trim();
    const date = parseDeadline(raw);
    if (date) entries.push({ raw, date, scope: match[3] || null });
  }

  return entries;
}

/** Picks the deadline whose scope covers this vacancy. */
function deadlineFor(entries, vacancyText, config) {
  const scoped = entries.find((entry) => config.deadline.appliesTo(entry.scope, vacancyText));
  // An unqualified date is the safest fallback when no scope matches.
  return scoped || entries.find((entry) => !entry.scope) || entries[0] || null;
}

/** Trims a vacancy segment at the start of the booklet's shared sections. */
function boundSegment(segment, config) {
  if (!config.segmentEnd) return segment;
  const cut = segment.search(config.segmentEnd);
  return cut > 0 ? segment.slice(0, cut) : segment;
}

function detectTenure(text) {
  for (const [pattern, value] of TENURE_PATTERNS) {
    if (pattern.test(text || '')) return value;
  }
  return null;
}

/**
 * Extracts every vacancy from one advertisement booklet.
 *
 * @param {object} site      Registry entry
 * @param {object} advert    { advertNumber, notificationPdfUrl }
 * @returns {Promise<{rows: object[], error: string|null, pdfParsed: boolean}>}
 */
export async function extractBooklet(site, advert) {
  const config = site.pdfAdvert;
  const pdf = await extractPdfText(advert.notificationPdfUrl, {
    insecureTLS: site.insecureTLS,
  });

  if (!pdf.ok) {
    // A scanned or unreachable booklet must not lose the advertisement
    // entirely — emit one row from what the index gave us.
    return {
      rows: [
        {
          vacancyId: null,
          title: advert.advertNumber || 'UPSC Recruitment Advertisement',
          organization: site.department,
          department: site.department,
          applicationUrl: config.applicationUrl,
          notificationPdfUrl: advert.notificationPdfUrl,
          advertNumber: advert.advertNumber,
          rawText: advert.advertNumber || '',
          degraded: true,
        },
      ],
      error: pdf.error,
      pdfParsed: false,
    };
  }

  const deadlines = readScopedDeadlines(pdf.flat, config);
  const segments = pdf.flat
    .split(config.vacancySplit)
    .filter((segment) => config.vacancyId.test(segment))
    .map((segment) => boundSegment(segment, config));

  const labelOpts = { stopLabels: config.stopLabels };
  const rows = [];

  for (const segment of segments) {
    const idMatch = segment.match(config.vacancyId);
    if (!idMatch) continue;

    const heading = segment.match(config.heading);
    const parts = splitHeading(heading?.[2], site.department);

    const reservation = extractLabeledSection(segment, config.labels.reservation, labelOpts);
    const otherDetails = extractLabeledSection(segment, config.labels.otherDetails, labelOpts);
    const countRaw = heading?.[1] || null;
    const count = wordsToNumber(countRaw) ?? sumReservation(reservation);
    const deadline = deadlineFor(deadlines, segment, config);

    rows.push({
      vacancyId: idMatch[1],

      title: parts.title,
      organization: parts.organization,
      department: parts.department,

      vacanciesRaw: countRaw ? `${countRaw} ${count === 1 ? 'vacancy' : 'vacancies'}` : null,
      vacanciesCount: count,

      salaryRaw: extractLabeledSection(segment, config.labels.salary, labelOpts),
      qualifications: extractLabeledSection(segment, config.labels.qualifications, labelOpts),
      desirable: extractLabeledSection(segment, config.labels.desirable, labelOpts),
      experience: extractLabeledSection(segment, config.labels.experience, labelOpts),
      responsibilities: extractLabeledSection(segment, config.labels.responsibilities, labelOpts),
      locationRaw: extractLabeledSection(segment, config.labels.location, labelOpts),
      ageLimitRaw: extractLabeledSection(segment, config.labels.ageLimit, labelOpts),
      probation: extractLabeledSection(segment, config.labels.probation, labelOpts),
      reservationRaw: reservation,
      otherDetails,

      employmentTypeHint: detectTenure(otherDetails) || detectTenure(segment),

      applicationDeadline: deadline?.date || null,
      applicationDeadlineRaw: deadline?.raw || null,

      applicationUrl: config.applicationUrl,
      notificationPdfUrl: advert.notificationPdfUrl,
      advertNumber: advert.advertNumber,

      /** Kept for the AI stage, which reads only what regex could not fill. */
      rawText: segment,
    });
  }

  return { rows, error: null, pdfParsed: true };
}

/**
 * Walks the advertisement index, then every booklet it lists.
 *
 * @param {object} site  Registry entry
 * @param {object} [state] Stored `{ etag, lastModified }` for the index
 * @returns {Promise<object>} { ok, notModified, rows, adverts, etag, lastModified, errors }
 */
export async function extractUpscAdverts(site, state = {}) {
  const index = await fetchResource(site.url, {
    etag: state.etag,
    lastModified: state.lastModified,
    insecureTLS: site.insecureTLS,
  });

  if (index.notModified) {
    return { ok: true, notModified: true, rows: [], adverts: [], errors: [] };
  }

  if (!index.ok || !index.body) {
    return {
      ok: false,
      notModified: false,
      rows: [],
      adverts: [],
      errors: [index.error || `Could not fetch ${site.url}`],
    };
  }

  const $ = cheerio.load(index.body);
  const adverts = [];

  $(site.listing.blocks).each((_i, element) => {
    const block = $(element);
    const href = block.find('a[href]').first().attr('href');
    if (!href) return;

    const label = block
      .find(site.listing.fields.advertNumber.sel)
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    adverts.push({
      // Strip the "(1.49 MB)" size suffix the site appends to the label.
      advertNumber: label.replace(/\s*\([\d.]+\s*[KMG]B\)\s*$/i, '').trim() || null,
      notificationPdfUrl: resolveUrl(href, index.finalUrl || site.url),
    });
  });

  const rows = [];
  const errors = [];

  for (const advert of adverts) {
    const result = await extractBooklet(site, advert);
    rows.push(...result.rows);
    if (result.error) errors.push(`${advert.advertNumber}: ${result.error}`);
  }

  return {
    ok: true,
    notModified: false,
    rows,
    adverts,
    etag: index.etag,
    lastModified: index.lastModified,
    errors,
  };
}

export default { extractUpscAdverts, extractBooklet, splitHeading, wordsToNumber };
