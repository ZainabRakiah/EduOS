import { fetchResource } from '../http.js';
import { extractPdfText } from '../pdfExtractor.js';
import { resolveUrl } from '../../utils/normalizeUrl.js';
import { parseDate, findLabeledDeadline } from '../../utils/parseDate.js';

/**
 * SSC Notice Board Extractor
 * ──────────────────────────
 * SSC publishes through a JSON API, so this is an HTTP client rather than a
 * scraper — roughly 200 ms and no browser, replacing a ~30 s Playwright run
 * that returned 27 navigation links and zero jobs.
 *
 * Two things about this source shape the design:
 *
 *  1. **The notice board is mostly not jobs.** Of 15 live notices, 12 were
 *     results, answer keys, allocation rounds and identity verifications. The
 *     registry's accept/reject patterns do the filtering; without them
 *     "Declaration of Final Result" becomes a job posting.
 *
 *  2. **The attached notification PDFs are scanned images.** Both current
 *     vacancy notices are ~2 MB over 8-9 pages and yield ~110 characters of
 *     text. So unlike UPSC, the PDF cannot be the source of detail here, and
 *     the headline is parsed instead — it carries the vacancy count, post name,
 *     office and appointment basis. A PDF parse is still attempted, because
 *     SSC's examination notices (CGL, CHSL) are digitally generated and do
 *     yield text; it simply must not be depended on.
 */

/** Labels SSC uses for an application closing date, in preference order. */
const DEADLINE_LABELS = [
  'last date for receipt of application',
  'last date of receipt of application',
  'last date for submission of application',
  'last date for submission',
  'closing date for receipt',
  'closing date',
  'last date',
];

/** Only worth opening a PDF this small if it might be text, not a scan. */
const MAX_DETAIL_PDF_BYTES = 25 * 1024 * 1024;

function clean(value) {
  return value === null || value === undefined
    ? null
    : String(value).replace(/\s+/g, ' ').trim() || null;
}

/**
 * Resolves an attachment record to a downloadable URL.
 *
 * Paths arrive Windows-style and relative:
 *   "uploads\\masterData\\NoticeBoards\\foo.pdf"
 *     → https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/foo.pdf
 */
export function attachmentUrl(attachment, attachmentBase) {
  const path = attachment?.path;
  if (!path) return null;
  const normalized = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
  return resolveUrl(normalized, attachmentBase) || attachmentBase + normalized;
}

/** Picks the notification PDF from an attachment list. */
function pickAttachment(attachments) {
  const list = Array.isArray(attachments) ? attachments : [];
  return (
    list.find((a) => /pdf/i.test(a?.type || '') || /\.pdf$/i.test(a?.fileName || '')) ||
    list[0] ||
    null
  );
}

/**
 * Reads the structured posting out of an SSC headline.
 *
 * "Filling up 04 ex-cadre post of Accounts Officer in Regional Offices of SSC
 *  on deputation basis" → 4 · Accounts Officer · Regional Offices of SSC ·
 *  deputation.
 *
 * Returns nulls for headlines that are not in this form (examination notices,
 * for instance), leaving the headline itself as the title.
 */
export function parseHeadline(headline, pattern) {
  const text = clean(headline);
  if (!text || !pattern) return { title: text, organization: null, count: null, employmentType: null };

  const match = text.match(pattern);
  if (!match) return { title: text, organization: null, count: null, employmentType: null };

  const basis = (match[4] || '').toLowerCase();
  const employmentType = basis.includes('deputation')
    ? 'deputation'
    : basis.includes('contract')
      ? 'contractual'
      : basis.includes('direct') || basis.includes('absorption')
        ? 'permanent'
        : null;

  return {
    title: clean(match[2]) || text,
    organization: clean(match[3]),
    count: match[1] ? Number(match[1]) : null,
    employmentType,
  };
}

/** Builds the notice-board request URL from the registry's mandatory query. */
function noticesUrl(api) {
  const query = new URLSearchParams(api.noticeQuery || {});
  return `${api.endpoints.notices}?${query}`;
}

/**
 * Fetches the exam lookup, used to name a notice that carries an `examId`.
 * Failure is non-fatal — it only costs a nicer title.
 */
async function loadExams(api) {
  const result = await fetchResource(api.endpoints.exams);
  if (!result.ok || !result.body) return new Map();

  try {
    const parsed = JSON.parse(result.body);
    const list = Array.isArray(parsed?.data) ? parsed.data : [];
    return new Map(list.filter((e) => e?.id).map((e) => [e.id, e]));
  } catch {
    return new Map();
  }
}

/**
 * Walks the SSC notice board and returns candidate job rows.
 *
 * @param {object} site   Registry entry
 * @param {object} [state] Stored `{ etag, lastModified }`
 * @returns {Promise<object>} { ok, notModified, rows, etag, lastModified, errors, stats }
 */
export async function extractSscNotices(site, state = {}) {
  const api = site.api;
  const url = noticesUrl(api);

  const response = await fetchResource(url, {
    etag: state.etag,
    lastModified: state.lastModified,
    insecureTLS: site.insecureTLS,
  });

  if (response.notModified) {
    return { ok: true, notModified: true, rows: [], errors: [], stats: null };
  }

  if (!response.ok || !response.body) {
    return {
      ok: false,
      notModified: false,
      rows: [],
      errors: [response.error || `Could not fetch ${api.endpoints.notices}`],
      stats: null,
    };
  }

  let payload;
  try {
    payload = JSON.parse(response.body);
  } catch (error) {
    return {
      ok: false,
      notModified: false,
      rows: [],
      errors: [`SSC notice board returned non-JSON: ${error.message}`],
      stats: null,
    };
  }

  // The API signals application-level failure in the body, not the status line.
  if (payload?.statusCode && String(payload.statusCode) !== '200') {
    return {
      ok: false,
      notModified: false,
      rows: [],
      errors: [`SSC notice board error ${payload.statusCode}: ${payload.error || payload.statusMessage}`],
      stats: null,
    };
  }

  const notices = Array.isArray(payload?.data) ? payload.data : [];
  const stats = { total: notices.length, rejected: 0, unmatched: 0, accepted: 0, pdfText: 0, pdfScanned: 0 };
  const errors = [];
  const rows = [];

  // Only loaded when something actually needs an exam name.
  let exams = null;

  for (const notice of notices) {
    const headline = clean(notice?.headline);
    if (!headline) continue;

    if (api.rejectTitle?.test(headline)) {
      stats.rejected += 1;
      continue;
    }
    if (api.acceptTitle && !api.acceptTitle.test(headline)) {
      stats.unmatched += 1;
      continue;
    }
    stats.accepted += 1;

    const parsed = parseHeadline(headline, api.headlinePattern);
    const attachment = pickAttachment(notice.attachments);
    const pdfUrl = attachmentUrl(attachment, api.attachmentBase);

    let organization = parsed.organization;
    if (notice.examId) {
      if (exams === null) exams = await loadExams(api);
      const exam = exams.get(notice.examId);
      if (exam?.examName && !organization) organization = clean(exam.examName);
    }

    let deadline = null;
    let deadlineRaw = null;
    let rawText = headline;
    let usedPdf = false;

    // Attempted, not relied upon — see the module header.
    if (pdfUrl && (attachment?.size ?? 0) <= MAX_DETAIL_PDF_BYTES) {
      const pdf = await extractPdfText(pdfUrl, { insecureTLS: site.insecureTLS });
      if (pdf.ok && pdf.flat) {
        stats.pdfText += 1;
        usedPdf = true;
        rawText = pdf.flat;
        deadline = findLabeledDeadline(pdf.flat, DEADLINE_LABELS);
        if (deadline) {
          const context = pdf.flat.match(
            new RegExp(`(?:${DEADLINE_LABELS.join('|')})[^A-Za-z0-9]{0,12}([^|\\n]{0,40})`, 'i')
          );
          deadlineRaw = clean(context?.[1]);
        }
      } else {
        // A scanned notification is expected here, not an error worth surfacing.
        stats.pdfScanned += 1;
      }
    }

    rows.push({
      externalId: notice.id || null,

      title: parsed.title,
      organization: organization || site.department,
      department: site.department,

      vacanciesCount: parsed.count,
      vacanciesRaw: parsed.count ? `${parsed.count} post${parsed.count === 1 ? '' : 's'}` : null,

      employmentTypeHint: parsed.employmentType,

      postedAt: parseDate(notice.createdAt),
      postedAtRaw: clean(notice.createdAt),
      applicationStartDate: parseDate(notice.startDate),
      applicationDeadline: deadline || parseDate(notice.endDate),
      applicationDeadlineRaw: deadlineRaw || clean(notice.endDate),

      applicationUrl:
        resolveUrl(notice.redirectUrl, site.portalUrl) || pdfUrl || site.portalUrl,
      notificationPdfUrl: pdfUrl,

      examId: notice.examId || null,
      usedPdf,
      rawText,
    });
  }

  return {
    ok: true,
    notModified: false,
    rows,
    etag: response.etag,
    lastModified: response.lastModified,
    errors,
    stats,
  };
}

export default { extractSscNotices, parseHeadline, attachmentUrl };
