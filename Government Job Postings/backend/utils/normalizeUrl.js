/**
 * URL Normalization
 * ─────────────────
 * Produces a stable canonical form for a URL so the same job discovered
 * twice — once with a tracking param, once without — resolves to one
 * identity instead of two documents.
 *
 * Replaces the `listing_ref=` duplicate-URL workaround the old pipeline
 * used to dodge the unique index.
 */

// Params that never identify a resource — stripped before comparison.
const VOLATILE_PARAMS = [
  /^utm_/i,
  /^ga_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^sessionid$/i,
  /^jsessionid$/i,
  /^phpsessid$/i,
  /^aspxautodetectcookiesupport$/i,
  /^listing_ref$/i,
  /^_$/,
  /^t$/i,
  /^ts$/i,
  /^timestamp$/i,
  /^rnd$/i,
  /^random$/i,
  /^cachebuster$/i,
];

function isVolatileParam(name) {
  return VOLATILE_PARAMS.some((pattern) => pattern.test(name));
}

/**
 * Normalizes a URL for identity comparison.
 *
 * - lowercases scheme + host, drops `www.`
 * - forces https (gov portals flip between http/https for the same page)
 * - removes the fragment
 * - strips volatile query params, sorts the rest
 * - removes a trailing slash (except for a bare root path)
 *
 * @param {string} url
 * @param {string} [base] - Base URL for resolving relative hrefs
 * @returns {string|null} Normalized absolute URL, or null if unparseable
 */
export function normalizeUrl(url, base) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || /^(javascript|mailto|tel):/i.test(trimmed)) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(trimmed, base);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  parsed.protocol = 'https:';
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

  const kept = [...parsed.searchParams.entries()]
    .filter(([name]) => !isVolatileParam(name))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  parsed.search = '';
  for (const [name, value] of kept) {
    parsed.searchParams.append(name, value);
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }

  return parsed.href;
}

/**
 * Resolves a possibly-relative href against a base URL, returning an
 * absolute URL with its original query/casing intact. Use this for links
 * that will actually be fetched or shown to a user; use normalizeUrl only
 * for identity comparison.
 */
export function resolveUrl(href, base) {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#' || /^(javascript|mailto|tel):/i.test(trimmed)) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.href;
  } catch {
    return null;
  }
}

/** Extracts the last path segment — used as an externalId for PDF-backed listings. */
export function urlFilename(url) {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    return segments.length ? decodeURIComponent(segments[segments.length - 1]) : null;
  } catch {
    return null;
  }
}

/** Returns the hostname without `www.`, or null. */
export function urlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isPdfUrl(url) {
  return typeof url === 'string' && /\.pdf(?:$|[?#])/i.test(url);
}

export default { normalizeUrl, resolveUrl, urlFilename, urlHost, isPdfUrl };
