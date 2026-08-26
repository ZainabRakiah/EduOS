import { PDFParse } from 'pdf-parse';
import { fetchResource } from './http.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';

/**
 * PDF Text Extraction
 * ───────────────────
 * Government notifications put the real content — qualifications, pay scale,
 * age limits, duties, closing dates — inside PDFs. UPSC's recruitment payload
 * lives entirely in advertisement booklets; the previous pipeline never opened
 * a single one, so none of those fields could ever be populated.
 *
 * Caching is by URL plus HTTP validator. Repeat runs re-issue a conditional
 * GET, and a `304` means the cached text is reused with no download and no
 * re-parse. This matters because one UPSC booklet is 52 pages / 3.2 MB and
 * parsing it is the most expensive single step in the pipeline.
 *
 * Two failure modes are expected and handled by returning `ok: false` with a
 * reason rather than throwing, so the caller falls back to whatever the listing
 * row provided instead of losing the job entirely:
 *   • scanned/image-only PDFs, which yield no extractable text
 *   • password-protected or malformed PDFs
 */

/** Below this, a "successful" parse is really a scanned image. */
const MIN_USEFUL_CHARS = 200;

/** Cache is process-lifetime; the cron process is long-lived. */
const cache = new Map();

/** Guards against a pathological PDF exhausting memory during parse. */
const MAX_PDF_BYTES = Number(process.env.PDF_MAX_BYTES) || 40 * 1024 * 1024;

/**
 * Collapses PDF text to a single line.
 *
 * pdf-parse emits hard line breaks at the original layout's line ends, which
 * splits sentences — and therefore field values — mid-phrase. Every pattern in
 * the extractors runs against this flattened form.
 */
export function flattenPdfText(text) {
  return (text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Pulls the text following a label up to the next label-like boundary.
 *
 * UPSC booklets are a flat run of `LABEL: value` pairs with no markup, so the
 * end of a value has to be inferred from the start of the next label.
 *
 * A generic "next ALL-CAPS word" heuristic is not good enough here, in both
 * directions. It misses short labels — `PAY SCALE:` runs straight through
 * `AGE:` and swallows the age limit — and it fires on nested sub-labels, so
 * `ESSENTIAL QUALIFICATIONS: (A) EDUCATIONAL: …` truncates to just `(A)`.
 * Callers therefore pass the explicit label vocabulary for their source; the
 * heuristic remains only as the fallback when none is supplied.
 *
 * @param {string} flat            Flattened PDF text
 * @param {string[]} labels        Candidate start labels, tried in order
 * @param {object} [options]
 * @param {string[]} [options.stopLabels] Labels that terminate the value.
 *   Matched case-sensitively, since these are ALL-CAPS headings and a
 *   lowercase "age:" in prose must not cut a value short.
 * @param {number} [options.maxChars]     Hard cap, so a missed boundary cannot
 *   swallow the rest of the document
 * @returns {string|null}
 */
export function extractLabeledSection(flat, labels, options = {}) {
  if (!flat) return null;

  const {
    stopLabels = null,
    maxChars = 1200,
    // Off by default. A bare label without a colon is usually just the word
    // occurring in prose: searching for `EXPERIENCE` in a post that states no
    // experience requirement otherwise matches "The Qualifications and/or
    // experience is/are relaxable at the discretion of the Commission…" and
    // returns the tail of that sentence as the requirement.
    allowBareLabel = false,
  } = options;
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const attempts = labels.map((label) => ({ label, requireColon: true }));
  if (allowBareLabel) {
    attempts.push(...labels.map((label) => ({ label, requireColon: false })));
  }

  for (const { label, requireColon } of attempts) {
    const match = flat.match(
      new RegExp(`\\b${escape(label)}\\s*${requireColon ? ':' : ':?'}\\s*`, 'i')
    );
    if (!match) continue;

    const start = match.index + match[0].length;
    const rest = stripPageMarkers(flat.slice(start, start + maxChars));

    // The next numbered vacancy always ends a value, whichever vocabulary is
    // in play. Page markers are stripped above rather than treated as
    // boundaries — they are layout noise and can land mid-value.
    const structural = /\d{1,2}\.\s*\(Vacancy No\./;

    let boundary = -1;
    if (stopLabels?.length) {
      // Exclude the label we just consumed, or a repeated heading would make
      // the value collapse to nothing.
      const others = stopLabels.filter((s) => s.toUpperCase() !== label.toUpperCase());
      const pattern = new RegExp(
        `(?:\\b(?:${others.map(escape).join('|')})\\s*:)|${structural.source}`
      );
      boundary = rest.search(pattern);
    } else {
      boundary = rest.search(
        new RegExp(`(?:\\b[A-Z][A-Z &/'\\-]{4,40}\\s*:)|${structural.source}`)
      );
    }

    let value = (boundary > 0 ? rest.slice(0, boundary) : rest).trim();

    // Drop a leading enumerator like "(A)".
    value = value.replace(/^\([A-Za-z]\)\s*/, '').trim();

    // Drop a nested heading the outer label swallowed. `ESSENTIAL
    // QUALIFICATIONS: (A) EDUCATIONAL Degree of a recognised University…`
    // should yield the degree, not the word EDUCATIONAL in front of it.
    if (stopLabels?.length) {
      value = value
        .replace(new RegExp(`^(?:${stopLabels.map(escape).join('|')})\\s*:?\\s*`, 'i'), '')
        .trim();
    }

    value = value.replace(/\s*[.;,]\s*$/, '').trim();
    if (value) return value;
  }

  return null;
}

/**
 * Removes UPSC's page footers, which read "-- 4 of 52 -- 5" where the trailing
 * number is the *next* page's printed header. Both land mid-sentence in the
 * flattened text and would otherwise appear inside extracted values.
 *
 * The trailing number is only dropped when it is exactly one more than the page
 * the footer names. Stripping any following digits unconditionally would eat a
 * legitimate value that happens to begin with a number — "-- 4 of 52 -- 35
 * years for UR" would become "years for UR".
 */
function stripPageMarkers(text) {
  return (text || '')
    .replace(/--\s*(\d+)\s*of\s*\d+\s*--\s*(\d+)?/g, (_full, page, next) => {
      if (next !== undefined && Number(next) === Number(page) + 1) return ' ';
      return next === undefined ? ' ' : ` ${next}`;
    })
    .replace(/\s{2,}/g, ' ');
}

/**
 * Downloads and extracts text from a PDF.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {boolean} [options.insecureTLS]
 * @param {boolean} [options.force] - Bypass the cache entirely
 * @returns {Promise<object>} { ok, text, flat, pages, bytes, fromCache, error }
 */
export async function extractPdfText(url, options = {}) {
  const { insecureTLS = false, force = false } = options;
  const key = normalizeUrl(url);
  const cached = force ? null : cache.get(key);

  const result = await fetchResource(url, {
    asBuffer: true,
    insecureTLS,
    timeout: Number(process.env.PDF_TIMEOUT_MS) || 60_000,
    retries: 1,
    // Replaying validators lets an unchanged booklet come back as a bodyless
    // 304 instead of another 3 MB download and 52-page re-parse.
    etag: cached?.etag,
    lastModified: cached?.lastModified,
  });

  if (result.notModified && cached) {
    // A file already judged unusable is still unusable — being unparseable is a
    // property of the bytes, and the validators just told us the bytes are the
    // same. Re-downloading SSC's 2 MB scanned notices on every deep
    // reconciliation would cost ~10 s per run to learn nothing.
    if (cached.unusable) {
      return { ...cached, ok: false, fromCache: true };
    }
    return { ...cached, ok: true, fromCache: true, error: null };
  }

  if (!result.ok || !result.buffer) {
    // A failed re-check should not discard text we already hold.
    if (cached && !cached.unusable) {
      return { ...cached, ok: true, fromCache: true, stale: true, error: result.error };
    }
    if (cached?.unusable) {
      return { ...cached, ok: false, fromCache: true, stale: true };
    }
    return {
      ok: false,
      text: '',
      flat: '',
      pages: 0,
      bytes: 0,
      fromCache: false,
      error: result.error || `Could not fetch PDF: ${url}`,
    };
  }

  if (result.kind !== 'pdf') {
    return {
      ok: false,
      text: '',
      flat: '',
      pages: 0,
      bytes: result.bytes,
      fromCache: false,
      error: `Not a PDF (kind=${result.kind}, content-type=${result.contentType}): ${url}`,
    };
  }

  if (result.bytes > MAX_PDF_BYTES) {
    return {
      ok: false,
      text: '',
      flat: '',
      pages: 0,
      bytes: result.bytes,
      fromCache: false,
      error: `PDF exceeds ${MAX_PDF_BYTES} bytes (${result.bytes}): ${url}`,
    };
  }

  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(result.buffer) });
    const parsed = await parser.getText();
    const text = parsed?.text || '';
    const flat = flattenPdfText(text);

    if (flat.length < MIN_USEFUL_CHARS) {
      // Almost always a scanned notification. The caller falls back to the
      // listing fields rather than dropping the posting.
      //
      // Cached *with* its validators so the next run can settle this with a
      // conditional GET instead of another multi-megabyte download. Only this
      // verdict is cached, never a network or parse error — those can be
      // transient, whereas "this file contains no text layer" cannot.
      const verdict = {
        text,
        flat,
        pages: parsed?.pages?.length || 0,
        bytes: result.bytes,
        etag: result.etag,
        lastModified: result.lastModified,
        unusable: true,
        error: `PDF yielded only ${flat.length} chars — likely a scanned image: ${url}`,
      };
      if (result.etag || result.lastModified) cache.set(key, verdict);

      return { ...verdict, ok: false, fromCache: false };
    }

    const entry = {
      text,
      flat,
      pages: parsed?.pages?.length || 0,
      bytes: result.bytes,
      etag: result.etag,
      lastModified: result.lastModified,
    };
    cache.set(key, entry);

    return { ...entry, ok: true, fromCache: false, error: null };
  } catch (error) {
    return {
      ok: false,
      text: '',
      flat: '',
      pages: 0,
      bytes: result.bytes,
      fromCache: false,
      error: `PDF parse failed for ${url}: ${error.message}`,
    };
  } finally {
    // pdf-parse v2 holds a worker per instance; leaking these across a long
    // cron process would pile up handles until the run dies.
    try {
      await parser?.destroy?.();
    } catch {
      /* nothing useful to do if teardown itself fails */
    }
  }
}

/** Test/ops hook — the cache is otherwise process-lifetime. */
export function clearPdfCache() {
  cache.clear();
}

export function pdfCacheSize() {
  return cache.size;
}

export default { extractPdfText, extractLabeledSection, flattenPdfText, clearPdfCache };
