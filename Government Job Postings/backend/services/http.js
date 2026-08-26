/**
 * Shared HTTP Fetcher
 * ───────────────────
 * Every network read in the pipeline goes through here. It exists to make
 * the cheap change-check possible and to fix a set of specific defects in
 * the old scraper's ad-hoc axios calls:
 *
 *   • Conditional GET — replays stored ETag / Last-Modified so unchanged
 *     pages come back as a bodyless 304. This is Tier 0 of change detection.
 *   • Real status handling — the old `validateStatus: (s) => s < 500` treated
 *     403 and 404 as success and fed error pages to the parser.
 *   • Final post-redirect URL — the old code resolved relative hrefs against
 *     the *requested* URL, so a 301 (as NCS served) produced broken links.
 *   • Content-Type sniffing — a PDF served without a .pdf extension used to
 *     be handed to Cheerio as if it were HTML.
 *   • Per-host rate limiting and exponential backoff, neither of which the
 *     old retry path had.
 *
 * TLS verification is ON by default. Sites with genuinely broken certificate
 * chains opt out individually via the registry's `insecureTLS` flag — the old
 * scraper disabled verification globally for every request.
 */

import https from 'https';
import axios from 'axios';

const DEFAULT_TIMEOUT = Number(process.env.SCRAPE_TIMEOUT_MS) || 20_000;
const DEFAULT_RETRIES = 2;
const MAX_BYTES = Number(process.env.SCRAPE_MAX_BYTES) || 12 * 1024 * 1024;
const MIN_HOST_INTERVAL_MS = Number(process.env.SCRAPE_HOST_INTERVAL_MS) || 1200;

const USER_AGENT =
  process.env.SCRAPE_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Reused so Node keeps connections alive instead of renegotiating TLS per request.
const secureAgent = new https.Agent({ keepAlive: true, maxSockets: 8 });
const insecureAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 8,
  rejectUnauthorized: false,
});

// ── Per-host politeness ────────────────────────────────────────────────────
// Serializes requests per hostname with a minimum gap between them, so a
// parallel fan-out cannot hammer a single government server.
const hostQueues = new Map();

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withHostThrottle(url, task) {
  const host = hostOf(url);
  const previous = hostQueues.get(host) || Promise.resolve(0);

  const current = previous.then(async (lastFinishedAt) => {
    const elapsed = Date.now() - lastFinishedAt;
    if (lastFinishedAt && elapsed < MIN_HOST_INTERVAL_MS) {
      await sleep(MIN_HOST_INTERVAL_MS - elapsed);
    }
    return Date.now();
  });

  // The queue chain must advance even when the task throws, otherwise one
  // failure would deadlock every later request to that host.
  hostQueues.set(
    host,
    current.then(() => Date.now()).catch(() => Date.now())
  );

  await current;
  return task();
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error) {
  if (error.response) return isRetryableStatus(error.response.status);
  const code = error.code || '';
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'EPIPE' ||
    error.message?.includes('timeout')
  );
}

function detectKind(contentType, finalUrl) {
  const type = (contentType || '').toLowerCase();
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('json')) return 'json';
  if (type.includes('html') || type.includes('xml')) return 'html';
  if (type.startsWith('image/')) return 'image';

  // Fall back to the extension when the server sends no useful type.
  if (/\.pdf(?:$|[?#])/i.test(finalUrl || '')) return 'pdf';
  if (/\.json(?:$|[?#])/i.test(finalUrl || '')) return 'json';
  return type ? 'other' : 'html';
}

/**
 * Fetches a URL with conditional-GET support.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {string} [options.etag]          - Stored ETag → sent as If-None-Match
 * @param {string} [options.lastModified]  - Stored Last-Modified → If-Modified-Since
 * @param {boolean} [options.asBuffer]     - Return raw bytes (for PDFs)
 * @param {boolean} [options.insecureTLS]  - Skip cert verification for this host only
 * @param {number} [options.timeout]
 * @param {number} [options.retries]
 * @param {object} [options.headers]       - Extra request headers
 * @returns {Promise<object>} Result descriptor — never throws for HTTP status;
 *   throws only when the request could not be completed at all.
 */
export async function fetchResource(url, options = {}) {
  const {
    etag,
    lastModified,
    asBuffer = false,
    insecureTLS = false,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    headers: extraHeaders = {},
    accept,
  } = options;

  const headers = {
    'User-Agent': USER_AGENT,
    Accept:
      accept ||
      (asBuffer
        ? 'application/pdf,*/*'
        : 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'),
    'Accept-Language': 'en-IN,en;q=0.9',
    'Cache-Control': 'no-transform',
    ...extraHeaders,
  };

  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // 1s, 2s, 4s … with a little jitter to avoid lockstep retries.
      const backoff = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      console.warn(`[http] retry ${attempt}/${retries} in ${backoff}ms → ${url}`);
      await sleep(backoff);
    }

    try {
      const response = await withHostThrottle(url, () =>
        axios.get(url, {
          timeout,
          headers,
          httpsAgent: insecureTLS ? insecureAgent : secureAgent,
          maxRedirects: 5,
          maxContentLength: MAX_BYTES,
          maxBodyLength: MAX_BYTES,
          decompress: true,
          responseType: asBuffer ? 'arraybuffer' : 'text',
          // Handle every status explicitly below rather than letting axios
          // decide — 304 must not be an error, and 4xx must not be a success.
          validateStatus: () => true,
        })
      );

      const status = response.status;
      const responseHeaders = response.headers || {};
      const finalUrl =
        response.request?.res?.responseUrl ||
        response.request?.responseURL ||
        url;

      if (status === 304) {
        return {
          ok: true,
          notModified: true,
          status,
          finalUrl,
          etag: responseHeaders.etag || etag || null,
          lastModified: responseHeaders['last-modified'] || lastModified || null,
          kind: null,
          body: null,
          buffer: null,
          bytes: 0,
        };
      }

      if (status >= 400) {
        lastError = new Error(`HTTP ${status} for ${url}`);
        lastError.status = status;
        if (attempt < retries && isRetryableStatus(status)) continue;
        return {
          ok: false,
          notModified: false,
          status,
          finalUrl,
          error: lastError.message,
          kind: null,
          body: null,
          buffer: null,
          bytes: 0,
        };
      }

      const contentType = responseHeaders['content-type'] || '';
      const kind = detectKind(contentType, finalUrl);
      const buffer = asBuffer ? Buffer.from(response.data) : null;
      const body = asBuffer ? null : typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      return {
        ok: true,
        notModified: false,
        status,
        finalUrl,
        contentType,
        kind,
        body,
        buffer,
        bytes: buffer ? buffer.length : Buffer.byteLength(body || '', 'utf8'),
        etag: responseHeaders.etag || null,
        lastModified: responseHeaders['last-modified'] || null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) continue;

      // A broken certificate chain is worth naming explicitly — the fix is
      // an `insecureTLS: true` flag on that registry entry, not a global one.
      const isTlsError = /certificate|CERT_|SSL|self.signed/i.test(error.message || '');
      return {
        ok: false,
        notModified: false,
        status: error.response?.status || 0,
        finalUrl: url,
        error: isTlsError ? `TLS verification failed: ${error.message}` : error.message,
        tlsError: isTlsError,
        kind: null,
        body: null,
        buffer: null,
        bytes: 0,
      };
    }
  }

  return {
    ok: false,
    notModified: false,
    status: 0,
    finalUrl: url,
    error: lastError?.message || 'Unknown fetch failure',
    kind: null,
    body: null,
    buffer: null,
    bytes: 0,
  };
}

/** Convenience wrapper for JSON endpoints (the SSC API). */
export async function fetchJson(url, options = {}) {
  const result = await fetchResource(url, {
    ...options,
    accept: 'application/json, text/plain, */*',
  });

  if (!result.ok || result.notModified || !result.body) return result;

  try {
    return { ...result, json: JSON.parse(result.body) };
  } catch (error) {
    return { ...result, ok: false, error: `Invalid JSON from ${url}: ${error.message}` };
  }
}

export { USER_AGENT, MAX_BYTES };
export default { fetchResource, fetchJson };
