/**
 * Hashing Helpers
 * ───────────────
 * Stable, order-independent hashes used for change detection.
 *
 * Two distinct hashes drive the incremental pipeline:
 *   listingHash — hash of a listing row's visible fields. Cheap Tier-1
 *                 signal deciding whether a detail page needs re-fetching.
 *   contentHash — hash of the fully normalized job record. Decides whether
 *                 a DB write is actually needed.
 *
 * Both must be deterministic across process restarts, so object key order
 * is normalized before hashing.
 */

import crypto from 'crypto';

/**
 * Serializes a value to a canonical string: object keys sorted recursively,
 * so `{a:1,b:2}` and `{b:2,a:1}` produce identical output.
 */
export function canonicalize(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${k}:${canonicalize(value[k])}`).join(',')}}`;
  }
  return String(value);
}

export function sha1(value) {
  return crypto.createHash('sha1').update(canonicalize(value)).digest('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
}

/**
 * Short hash for identity keys — 16 hex chars is ample for per-site
 * uniqueness and keeps keys readable in logs.
 */
export function shortHash(value) {
  return sha1(value).slice(0, 16);
}

/**
 * Collapses whitespace and lowercases, so trivial formatting churn in the
 * source markup does not register as a content change.
 */
export function normalizeForHash(text) {
  return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Hashes a whole set of identity keys, order-independently. This is the
 * Tier-1 "did the listing index change at all?" signal.
 */
export function hashKeySet(keys) {
  return sha256([...keys].sort());
}

export default { canonicalize, sha1, sha256, shortHash, normalizeForHash, hashKeySet };
