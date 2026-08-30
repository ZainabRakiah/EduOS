import { parseDate, parseDeadline } from '../utils/parseDate.js';
import { resolveUrl } from '../utils/normalizeUrl.js';

/**
 * Declarative Field Mapping
 * ─────────────────────────
 * Turns a registry `fields` map into a flat record of canonical field values,
 * for both selector-addressed blocks (`{ sel }`) and table cells (`{ col }`).
 *
 * The point is that no site-specific extraction logic lives in code. The old
 * contract only ever carried a title and a link, which is why IBPS's
 * organisation and its two dates were thrown away, and why Employment News's
 * five columns collapsed into one wrong field. A site is now described, not
 * programmed.
 *
 * Every coerced field keeps its source string alongside as `<field>Raw`. The
 * parsed Date drives expiry; the raw string is what the UI shows, because
 * "11/06/2026 - 6:00pm" is more informative to a candidate than a reformatted
 * timestamp.
 */

/** Attributes holding a URL, which must be resolved against the page base. */
const URL_ATTRS = new Set(['href', 'src', 'data-href', 'data-url', 'action']);

/** Fields whose parsed value is a Date, so `<field>Raw` is worth keeping. */
const COERCIONS = new Set(['date', 'deadline', 'int', 'text']);

/** Collapses whitespace; PDF-ish and HTML-ish text both arrive ragged. */
function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

/**
 * Applies a `{ map }` lookup table.
 *
 * Exact match first, then substring containment: Employment News writes
 * "Direct Recruitment" and "Contract Basis" rather than the bare keys, so an
 * exact-only lookup would leave employmentType unknown on every row.
 */
function applyLookup(raw, table) {
  if (!raw || !table) return null;
  const key = raw.toLowerCase().trim();

  if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];

  // Longest key first, so "direct recruitment" wins over "recruitment".
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const candidate of keys) {
    if (key.includes(candidate.toLowerCase())) return table[candidate];
  }

  return null;
}

function coerce(raw, spec, baseUrl) {
  switch (spec.as) {
    case 'date':
      return parseDate(raw);
    case 'deadline':
      return parseDeadline(raw);
    case 'int': {
      const match = raw.match(/\d[\d,]*/);
      return match ? Number(match[0].replace(/,/g, '')) : null;
    }
    case 'url':
      return resolveUrl(raw, baseUrl);
    default:
      return raw;
  }
}

/**
 * Reads one field's source string, before coercion.
 *
 * @param {object} args
 * @param {import('cheerio').CheerioAPI} [args.$]
 * @param {any} [args.element]   Row/block node for `{ sel }` lookups
 * @param {string[]} [args.cells] Pre-extracted cell text for `{ col }` lookups
 * @param {object} args.spec
 * @param {string} [args.baseUrl]
 */
function readRaw({ $, element, cells, spec, baseUrl }) {
  if (spec.const !== undefined) return spec.const;

  // Table column.
  if (spec.col !== undefined) {
    if (!cells || spec.col >= cells.length) return null;
    return clean(cells[spec.col]);
  }

  if (!$ || !element) return null;

  // A selector may be omitted to read the row itself.
  const target = spec.sel ? $(element).find(spec.sel).first() : $(element);
  if (!target.length) return null;

  if (spec.attr) {
    const value = target.attr(spec.attr);
    if (!value) return null;
    return URL_ATTRS.has(spec.attr.toLowerCase())
      ? resolveUrl(value, baseUrl) || clean(value)
      : clean(value);
  }

  return clean(target.text());
}

/**
 * Applies a registry `fields` map to one listing row.
 *
 * @param {object} args
 * @param {import('cheerio').CheerioAPI} [args.$]
 * @param {any} [args.element]
 * @param {string[]} [args.cells]
 * @param {object} args.fields   The registry field map
 * @param {string} [args.baseUrl] Post-redirect page URL, for relative hrefs
 * @returns {object} Canonical field values plus `<field>Raw` source strings
 */
export function applyFieldMap({ $, element, cells, fields, baseUrl }) {
  const row = {};
  if (!fields) return row;

  for (const [field, spec] of Object.entries(fields)) {
    const raw = readRaw({ $, element, cells, spec, baseUrl });
    if (raw === null || raw === undefined || raw === '') {
      row[field] = null;
      continue;
    }

    if (spec.map) {
      // Keep the source wording even when the lookup fails, so an unmapped
      // value shows up in the coverage report instead of vanishing.
      row[`${field}Raw`] = raw;
      row[field] = applyLookup(raw, spec.map);
      continue;
    }

    const value = coerce(raw, spec, baseUrl);
    row[field] = value ?? null;

    // Preserve the display string whenever coercion changed the type, and
    // whenever it failed — a deadline we could not parse is still worth
    // showing, and it is what a coverage report needs to see.
    if (spec.as && COERCIONS.has(spec.as) && (value === null || typeof value !== 'string')) {
      row[`${field}Raw`] = raw;
    }
  }

  return row;
}

/**
 * Assigns dates found in a container to named fields, in document order.
 *
 * IBPS holds its application window in two unclassed children of
 * `.detail-heading` under a header reading "Starts From / Ends On" — there is
 * no selector that distinguishes them and no semantic markup at all. Reading
 * positionally from the text is more durable here than `nth-child`, which
 * breaks the moment a whitespace text node shifts.
 *
 * Only fields still empty are filled, so an explicit `fields` entry always wins.
 */
export function applyOrderedDates({ $, element, config, row }) {
  if (!config || !$ || !element) return row;

  const container = config.container ? $(element).find(config.container).first() : $(element);
  const text = clean(container.length ? container.text() : '');
  if (!text) return row;

  const found = [];
  // Same shapes parseDate accepts, in the order they appear on the page.
  const pattern =
    /\b\d{1,2}\s*[-/.]\s*(?:\d{1,2}|[A-Za-z]{3,9})\s*[-/.,]?\s*\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/g;

  for (const match of text.matchAll(pattern)) {
    const raw = match[0].trim();
    const isDeadline = config.assign[found.length] === 'applicationDeadline';
    const date = isDeadline ? parseDeadline(raw) : parseDate(raw);
    if (date) found.push({ raw, date });
    if (found.length >= config.assign.length) break;
  }

  config.assign.forEach((field, index) => {
    const entry = found[index];
    if (!entry) return;
    if (row[field]) return;
    row[field] = entry.date;
    row[`${field}Raw`] = entry.raw;
  });

  return row;
}

/**
 * Extracts a table row's cell text.
 *
 * Header detection is structural first (`<thead>` / `<th>`), then falls back to
 * the registry's `headerPattern`. Employment News needs the pattern: its
 * GridView emits the header as a plain `<tr>` of five `<td>`s with no `<th>`,
 * no `<thead>` and no class — the only markup difference is inline
 * `font-weight:bold`. Matching declared header wording is far more durable than
 * matching a style attribute, and a row index check is wrong because ASP.NET
 * GridViews can repeat the header mid-table.
 *
 * @returns {string[]|null} Cell texts, or null if the row should be skipped
 */
export function readTableRow($, element, listing) {
  const rowEl = $(element);

  if (listing?.skipHeaderRow) {
    if (rowEl.find('th').length > 0) return null;
    if (rowEl.closest('thead').length > 0) return null;
  }

  const cells = rowEl
    .find('td')
    .toArray()
    .map((cell) => clean($(cell).text()) || '');

  if (listing?.minCells && cells.length < listing.minCells) return null;
  if (!cells.some((cell) => cell.length > 0)) return null;
  if (listing?.headerPattern && listing.headerPattern.test(cells.join(' '))) return null;

  return cells;
}

export default { applyFieldMap, applyOrderedDates, readTableRow };
