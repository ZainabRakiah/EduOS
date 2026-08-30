import * as cheerio from 'cheerio';
import { fetchResource } from '../http.js';
import { applyFieldMap, applyOrderedDates, readTableRow } from '../fieldMap.js';
import { resolveUrl, isPdfUrl } from '../../utils/normalizeUrl.js';
import { extractPdfText } from '../pdfExtractor.js';
import { findLabeledDeadline } from '../../utils/parseDate.js';
import { parseJobWithRegex } from '../regexParser.js';

/**
 * Generic HTML Listing Extractor
 * ──────────────────────────────
 * Drives the `htmlRows` and `htmlTable` adapters from the registry's declarative
 * `listing.fields` map. Nothing site-specific lives here — differences between
 * IBPS, Employment News and UPSC's exam list are expressed entirely in the
 * registry, which is what lets one code path serve all three.
 *
 * This replaces the old title+link-only contract in `scraper.js`, which
 * discarded IBPS's organisation and dates and read Employment News's *date*
 * column as the job title — collapsing 11 distinct jobs into 4 duplicate
 * fingerprints that then died on the unique index.
 *
 * ── Detail pages ──
 * Only fetched when the registry says the row needs one, and only for the rows
 * the caller passes in. `upsc-active-exams` is the sole current case: its rows
 * carry an exam name and a relative href and no dates whatsoever, so the
 * deadline exists only on the detail page.
 *
 * Detail text deliberately carries discovered `href`s appended to it. The old
 * `scrapeDetailPage` returned `.text()`, which destroys every link — and then
 * the parser searched that text for `https?://…\.pdf` and of course found
 * nothing. The notification PDF is the single most valuable artefact on a
 * government job page; it has to survive into the parser.
 */

/**
 * Containers to read detail text from, in **preference order**.
 *
 * Order matters and `.first()` cannot be used on a comma-joined selector: jQuery
 * returns matches in *document order*, and `<body>` is an ancestor of everything,
 * so `$('main, article, #content, body').first()` always returned `<body>`. That
 * is the bug that let breadcrumbs ("Home > … > Name of Post") into the parsed
 * text and produced `qualification: "me"`. Each candidate is tried separately.
 */
const DETAIL_CONTAINERS = [
  '.region-content',
  '#block-system-main',
  'main',
  'article',
  '[role="main"]',
  '#content',
  '.content',
  '.main-content',
  '#main',
  'body',
];

/** Chrome/nav elements that carry no posting information. */
const DETAIL_NOISE = 'script, style, noscript, nav, header, footer, form, .breadcrumb, .breadcrumbs, #breadcrumb, .menu, .region-header, .region-footer, .sidebar, .views-exposed-form';

/** A detail container must yield at least this much text to be believed. */
const MIN_DETAIL_CHARS = 200;

function clean(value) {
  return value === null || value === undefined
    ? null
    : String(value).replace(/\s+/g, ' ').trim() || null;
}

/**
 * Picks the narrowest container that still holds real content.
 *
 * Walks `DETAIL_CONTAINERS` in order and takes the first whose text clears
 * `MIN_DETAIL_CHARS`. Narrow-first means the semantic wrapper wins when it
 * exists and `<body>` is only reached when nothing better matched — the opposite
 * of the previous behaviour.
 */
export function pickDetailContainer($) {
  for (const selector of DETAIL_CONTAINERS) {
    const node = $(selector).first();
    if (!node.length) continue;
    const text = clean(node.text()) || '';
    if (text.length >= MIN_DETAIL_CHARS) return node;
  }
  return $('body').first();
}

/**
 * Renders a detail page to text **with its links preserved**.
 *
 * Anchors are emitted as `label <absolute-url>` inline, and every distinct
 * absolute href is also listed at the end. Both forms matter: the inline form
 * keeps a link next to the label that describes it (so "Notification
 * <…/Notif.pdf>" stays associated), and the trailing list guarantees a URL is
 * findable even if its anchor text was an icon.
 */
export function renderDetailText($, container, baseUrl) {
  const scope = container.clone();
  scope.find(DETAIL_NOISE).remove();

  const links = [];
  scope.find('a[href]').each((_i, el) => {
    const anchor = $(el);
    const href = resolveUrl(anchor.attr('href'), baseUrl);
    if (!href || /^(?:javascript:|mailto:|tel:|#)/i.test(anchor.attr('href') || '')) return;
    const label = clean(anchor.text()) || '';
    links.push({ href, label });
    anchor.replaceWith(` ${label} <${href}> `);
  });

  const text = clean(scope.text()) || '';
  const unique = [...new Set(links.map((l) => l.href))];

  return {
    text: unique.length ? `${text}\nLINKS: ${unique.join(' ')}` : text,
    links,
  };
}

/**
 * Chooses the notification PDF from a detail page's links.
 *
 * Government pages routinely link several PDFs — results, time tables, press
 * notes, syllabi — so this both rejects the known non-notification kinds and
 * prefers the registry's `pdfLabels`. Matching runs against the **filename as
 * well as** the anchor text, because UPSC labels its notification link with the
 * file size: the CDS-II 2026 anchor reads "(1.64 MB)" while the href is
 * `Notif-CDS-II-2026-Engl-200526.pdf`.
 */
export function pickNotificationPdf(links, pdfLabels = [], pdfReject = null) {
  let pdfs = links.filter((l) => isPdfUrl(l.href));
  if (!pdfs.length) return null;

  if (pdfReject) {
    const kept = pdfs.filter(
      (l) => !pdfReject.test(l.href.split('/').pop() || '') && !pdfReject.test(l.label)
    );
    // If rejection removes everything, the page genuinely has no notification —
    // returning a rejected PDF anyway would defeat the point of the filter.
    if (!kept.length) return null;
    pdfs = kept;
  }

  for (const label of pdfLabels) {
    const pattern = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const hit = pdfs.find((l) => pattern.test(l.label) || pattern.test(l.href));
    if (hit) return hit.href;
  }
  return pdfs[0].href;
}

/**
 * Rejects a sweep whose links have collapsed to something useless.
 *
 * The previous quality gate was `listings.length > 0`, which is why SSC and NCS
 * contributed 77 nav-menu entries as "jobs". Row count says nothing about row
 * quality; these checks describe the actual observed failure shapes.
 *
 * The URL checks apply **only when the site declares a per-row URL field**.
 * IBPS and Employment News contain zero anchors in their listing blocks, so
 * every row correctly falls back to `fallbackApplicationUrl` — one shared URL
 * there is the designed outcome, not a collapse. Judging them by it rejected
 * both sites' entire (correct) output on the first run of this extractor.
 */
export function assessRows(rows, indexUrl, options = {}) {
  if (!rows.length) return { ok: false, reason: 'no rows extracted' };

  const titled = rows.filter((r) => clean(r.title)).length;
  if (titled === 0) return { ok: false, reason: 'no row produced a title' };

  if (options.expectPerRowUrl) {
    const urls = rows.map((r) => r.applicationUrl).filter(Boolean);
    if (urls.length >= 3) {
      const distinct = new Set(urls);
      if (distinct.size === 1) {
        return { ok: false, reason: `all ${urls.length} rows share one URL` };
      }
      const selfLinks = urls.filter((u) => u === indexUrl || /#$/.test(u)).length;
      if (selfLinks === urls.length) {
        return { ok: false, reason: 'every row links back to the index' };
      }
    }
  }

  return { ok: true, reason: null };
}

/**
 * Extracts listing rows from one index page.
 *
 * @param {object} site   Registry entry
 * @param {object} [state] Stored `{ etag, lastModified }` for conditional GET
 * @returns {Promise<object>} { ok, notModified, rows, etag, lastModified, errors, stats }
 */
export async function extractHtmlListing(site, state = {}) {
  const response = await fetchResource(site.url, {
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
      errors: [response.error || `Could not fetch ${site.url}`],
      stats: null,
    };
  }

  // The post-redirect URL, not the configured one — relative hrefs must resolve
  // against where the document actually came from.
  const baseUrl = response.finalUrl || site.url;
  const $ = cheerio.load(response.body);
  const listing = site.listing || {};
  const blocks = $(listing.blocks).toArray();

  const stats = { blocks: blocks.length, skipped: 0, rows: 0 };
  const errors = [];
  const rows = [];
  const isTable = site.adapter === 'htmlTable';

  for (const element of blocks) {
    let cells = null;

    if (isTable) {
      cells = readTableRow($, element, listing);
      if (cells === null) {
        stats.skipped += 1;
        continue;
      }
    }

    const row = applyFieldMap({
      $,
      element,
      cells,
      fields: listing.fields,
      baseUrl,
    });

    if (listing.orderedDates) {
      applyOrderedDates({ $, element, config: listing.orderedDates, row });
    }

    if (!clean(row.title)) {
      stats.skipped += 1;
      continue;
    }

    if (site.filters?.rejectTitle?.test(row.title)) {
      stats.skipped += 1;
      continue;
    }
    if (site.filters?.acceptTitle && !site.filters.acceptTitle.test(row.title)) {
      stats.skipped += 1;
      continue;
    }

    row.organization = clean(row.organization) || site.department;
    row.department = site.department;
    row.applicationUrl =
      resolveUrl(row.applicationUrl, baseUrl) || site.fallbackApplicationUrl || site.url;
    row.rawText = [row.title, row.organization, row.employmentTypeRaw]
      .filter(Boolean)
      .join(' — ');

    rows.push(row);
    stats.rows += 1;
  }

  const quality = assessRows(rows, baseUrl, {
    expectPerRowUrl: Boolean(listing.fields?.applicationUrl),
  });
  if (!quality.ok) {
    errors.push(`${site.id}: listing rejected — ${quality.reason}`);
    return {
      ok: false,
      notModified: false,
      rows: [],
      etag: response.etag,
      lastModified: response.lastModified,
      errors,
      stats,
    };
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

/**
 * Enriches one row from its detail page.
 *
 * Called only for rows the change detector flagged as new or changed — this is
 * the Tier-2 step the whole incremental design exists to minimise. Mutates and
 * returns `row`; a failure leaves the listing fields intact rather than losing
 * the posting.
 */
export async function enrichFromDetail(site, row) {
  const detail = site.detail || {};
  if (!detail.enabled || !row.applicationUrl) return row;

  const response = await fetchResource(row.applicationUrl, {
    insecureTLS: site.insecureTLS,
  });

  if (!response.ok || !response.body) {
    row.detailError = response.error || `Could not fetch ${row.applicationUrl}`;
    return row;
  }

  // A listing link can point straight at a PDF; sniffing means it is parsed as
  // one instead of being handed to cheerio as if it were HTML.
  if (response.kind === 'pdf') {
    const pdf = await extractPdfText(row.applicationUrl, { insecureTLS: site.insecureTLS });
    if (pdf.ok) {
      row.rawText = pdf.flat;
      row.notificationPdfUrl = row.notificationPdfUrl || row.applicationUrl;
    } else {
      row.detailError = pdf.error;
    }
    return applyTextFields(row, detail);
  }

  const baseUrl = response.finalUrl || row.applicationUrl;
  const $ = cheerio.load(response.body);
  const container = pickDetailContainer($);
  const rendered = renderDetailText($, container, baseUrl);

  row.rawText = [row.rawText, rendered.text].filter(Boolean).join('\n');
  row.notificationPdfUrl =
    row.notificationPdfUrl ||
    pickNotificationPdf(rendered.links, detail.pdfLabels, detail.pdfReject);

  // The notification PDF is where the real detail lives on UPSC exam pages, so
  // its text is appended when it parses.
  if (row.notificationPdfUrl && detail.readPdf !== false) {
    const pdf = await extractPdfText(row.notificationPdfUrl, {
      insecureTLS: site.insecureTLS,
    });
    if (pdf.ok && pdf.flat) row.rawText = `${row.rawText}\n${pdf.flat}`;
  }

  return applyTextFields(row, detail);
}

/**
 * Fills still-empty fields from the accumulated text.
 *
 * Registry-declared labels are tried first because they are specific to the
 * site; the generic regex parser then fills whatever is left. Existing values
 * always win — a date read from a structured listing column is more trustworthy
 * than one recovered from prose.
 */
function applyTextFields(row, detail) {
  const text = row.rawText || '';
  if (!text) return row;

  if (!row.applicationDeadline && detail.deadlineLabels?.length) {
    row.applicationDeadline = findLabeledDeadline(text, detail.deadlineLabels);
  }
  if (!row.applicationStartDate && detail.startLabels?.length) {
    row.applicationStartDate = findLabeledDeadline(text, detail.startLabels);
  }

  const parsed = parseJobWithRegex(text);
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'isComplete' || key === 'fieldsFilled') continue;
    if (value === null || value === undefined) continue;

    /**
     * The parser finds PDF URLs by scanning the text, and the rendered detail
     * text contains every link on the page — including the ones `pdfReject`
     * just filtered out. Without this guard the rejected `FR-…` result document
     * came straight back in through the regex path after `pickNotificationPdf`
     * had correctly returned null.
     */
    if (key === 'notificationPdfUrl' && detail.pdfReject) {
      const filename = String(value).split('/').pop() || '';
      if (detail.pdfReject.test(filename)) continue;
    }

    if (row[key] === null || row[key] === undefined) row[key] = value;
  }

  row.extraction = {
    engine: 'regex',
    usedAi: false,
    fieldsFilled: parsed.fieldsFilled,
    regexComplete: parsed.isComplete,
  };

  /**
   * Marks a row that produced no evidence of being an open posting. The caller
   * drops these rather than the extractor doing it silently, so the count still
   * shows up in the sweep stats.
   */
  if (detail.requireEvidence && !row.applicationDeadline && !row.notificationPdfUrl) {
    row.noEvidence = true;
  }

  return row;
}

export default { extractHtmlListing, enrichFromDetail };
