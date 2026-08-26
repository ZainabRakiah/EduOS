import SourceState from '../models/SourceState.js';
import ListingState from '../models/ListingState.js';
import { ADAPTERS, buildIdentityKey } from '../config/siteRegistry.js';
import { extractHtmlListing } from './extractors/htmlListing.js';
import { extractSscNotices } from './extractors/sscApi.js';
import { extractUpscAdverts } from './extractors/upscAdvert.js';
import { computeListingHash } from './normalizeJob.js';
import { hashKeySet } from '../utils/hash.js';

/**
 * Change Detector
 * ───────────────
 * Answers one question as cheaply as possible: **has this source changed since
 * we last looked, and if so, which specific postings?**
 *
 * No portal offers a push signal. This was verified rather than assumed: UPSC's
 * `rss.xml` is a valid RSS 2.0 document containing zero `<item>` elements,
 * `sitemap.xml` returns 404, and `/recruitment-advertisements/feed` just serves
 * the ordinary HTML page. There are no webhooks and no last-modified API. So a
 * change cannot be *learned* — it has to be *asked for*. The whole design here
 * is about making the asking nearly free and gating every expensive operation
 * behind the answer.
 *
 *   Tier 0  Conditional GET. We replay the stored ETag/Last-Modified; a `304`
 *           comes back with no body at all. Cost: ~250 bytes, no parsing, no
 *           database write. Works on UPSC (both indexes) and the SSC API.
 *
 *   Tier 1  A `200` is NOT proof of change — UPSC's ETag is a Drupal
 *           cache-creation timestamp (`"1787675075-1"`), so a cache rebuild
 *           rotates it while the content is byte-identical. So after any 200 we
 *           hash the set of identity keys the index yields and compare. This
 *           tier also carries Employment News and IBPS entirely, because neither
 *           sends validators — EmpNews explicitly sends `Cache-Control:
 *           no-cache, no-store`, `Expires: -1` and a fresh session cookie per
 *           request, so conditional GET is impossible there.
 *
 *   Tier 2  Only the keys the diff actually named get a detail fetch, a PDF
 *           parse and an AI call. This is the part that satisfies "if 10,000
 *           jobs exist and 5 are new, process only those 5" — the other 9,995
 *           are never touched, because a per-key `listingHash` comparison
 *           decides membership before any network request for them is made.
 */

/** Below this fraction of the last known row count, a sweep is not trusted. */
const PLAUSIBLE_FRACTION = 0.5;

/** Dispatches to the adapter that knows how to read this source. */
async function sweepSource(site, state) {
  switch (site.adapter) {
    case ADAPTERS.API:
      return extractSscNotices(site, state);
    case ADAPTERS.PDF_ADVERT:
      return extractUpscAdverts(site, state);
    case ADAPTERS.HTML_ROWS:
    case ADAPTERS.HTML_TABLE:
      return extractHtmlListing(site, state);
    default:
      return {
        ok: false,
        notModified: false,
        rows: [],
        errors: [`${site.id}: unknown adapter ${site.adapter}`],
      };
  }
}

/**
 * Decides whether a sweep's row count is believable.
 *
 * An outage that answers 200 with an empty or truncated list must never be
 * allowed to look like "every job was withdrawn". Without this guard a single
 * bad response would wipe a portal's entire contribution from the database.
 */
export function isPlausible(rowCount, lastCount) {
  if (!lastCount) return true; // First ever sweep — nothing to compare against.
  if (rowCount === 0) return false;
  return rowCount >= Math.floor(lastCount * PLAUSIBLE_FRACTION);
}

/**
 * Checks one source and classifies what it found.
 *
 * @param {object} site Registry entry
 * @param {object} [options]
 * @param {boolean} [options.force] Ignore stored validators and the hash
 *   short-circuit — used by the nightly deep reconciliation.
 * @returns {Promise<object>} {
 *   siteId, ok, unchanged, tier, rows, newRows, changedRows, unchangedRows,
 *   missingKeys, plausible, listingCount, errors, etag, lastModified, stats
 * }
 */
export async function detectChanges(site, options = {}) {
  const { force = false } = options;

  const state =
    (await SourceState.findOne({ siteId: site.id }).lean()) || {
      siteId: site.id,
      etag: null,
      lastModified: null,
      listingSetHash: null,
      lastListingCount: 0,
    };

  const result = {
    siteId: site.id,
    ok: false,
    unchanged: false,
    tier: null,
    rows: [],
    newRows: [],
    changedRows: [],
    unchangedRows: [],
    missingKeys: [],
    plausible: false,
    listingCount: 0,
    errors: [],
    etag: state.etag,
    lastModified: state.lastModified,
    stats: null,
  };

  // ── Tier 0 ───────────────────────────────────────────────────────────────
  const sweep = await sweepSource(
    site,
    force ? {} : { etag: state.etag, lastModified: state.lastModified }
  );

  result.errors = sweep.errors || [];
  result.stats = sweep.stats || null;

  if (sweep.notModified) {
    result.ok = true;
    result.unchanged = true;
    result.tier = 0;
    return result;
  }

  if (!sweep.ok) {
    result.tier = 0;
    return result;
  }

  result.ok = true;
  result.etag = sweep.etag ?? state.etag;
  result.lastModified = sweep.lastModified ?? state.lastModified;

  // ── Attach identity + listing hash to every row ──────────────────────────
  const rows = [];
  const seen = new Set();

  for (const row of sweep.rows) {
    const identityKey = buildIdentityKey(site, row);
    if (!identityKey) {
      result.errors.push(`${site.id}: row without identity — ${row.title || '(untitled)'}`);
      continue;
    }
    // A source listing the same posting twice (UPSC re-uploads a booklet, and
    // the same vacancy appears in both) must not become two documents.
    if (seen.has(identityKey)) continue;
    seen.add(identityKey);

    row.identityKey = identityKey;
    row.listingHash = computeListingHash(row);
    rows.push(row);
  }

  result.rows = rows;
  result.listingCount = rows.length;
  result.plausible = isPlausible(rows.length, state.lastListingCount);

  // ── Tier 1 ───────────────────────────────────────────────────────────────
  const setHash = hashKeySet(rows.map((r) => `${r.identityKey}:${r.listingHash}`));
  result.listingSetHash = setHash;

  if (!force && state.listingSetHash && state.listingSetHash === setHash) {
    result.unchanged = true;
    result.tier = 1;
    result.unchangedRows = rows;
    return result;
  }

  result.tier = 2;

  // ── Tier 2 selection: which rows actually need work ──────────────────────
  const known = await ListingState.find({ siteId: site.id })
    .select('identityKey listingHash contentHash status')
    .lean();
  const knownByKey = new Map(known.map((k) => [k.identityKey, k]));

  for (const row of rows) {
    const prior = knownByKey.get(row.identityKey);

    if (!prior) {
      result.newRows.push(row);
      continue;
    }

    /**
     * A tombstoned identity is deliberately NOT resurrected. Expired jobs are
     * hard-deleted from `jobs` while their identity is retained here, so
     * without this check every expired posting still on the index would be
     * rediscovered as new, re-scraped, re-parsed by the AI, re-inserted and
     * re-deleted on every single sweep — an unbounded churn loop. UPSC's
     * active-exams list is exactly this case: 17 of its 19 rows have deadlines
     * that have already passed but remain published indefinitely.
     */
    if (prior.status !== 'active') {
      result.unchangedRows.push(row);
      continue;
    }

    if (prior.listingHash !== row.listingHash) {
      row.priorContentHash = prior.contentHash;
      result.changedRows.push(row);
    } else {
      row.priorContentHash = prior.contentHash;
      result.unchangedRows.push(row);
    }
  }

  // ── Disappearance ────────────────────────────────────────────────────────
  // Only meaningful when the sweep itself is trustworthy; the caller enforces
  // the miss-count threshold on top of this.
  if (result.plausible) {
    for (const prior of known) {
      if (prior.status === 'active' && !seen.has(prior.identityKey)) {
        result.missingKeys.push(prior.identityKey);
      }
    }
  }

  return result;
}

export default { detectChanges, isPlausible };
