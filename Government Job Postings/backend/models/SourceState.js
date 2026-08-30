import mongoose from 'mongoose';

/**
 * SourceState
 * ───────────
 * One document per registry site. Holds everything needed to answer
 * "has this page changed?" without re-downloading and re-parsing it.
 *
 * `etag` / `lastModified` drive Tier 0 (conditional GET → 304).
 * `listingSetHash` drives Tier 1 (hash of the row identity-key set), which is
 * required because a 200 response does not prove the content changed — UPSC's
 * ETag is a Drupal cache-creation timestamp that rotates on cache rebuild.
 *
 * `lastSweepOk` and `lastListingCount` are the safety interlock for
 * disappearance-based deletion: jobs are only removed for going missing when
 * the sweep actually succeeded and returned a plausible number of rows. Without
 * this, a single 503 would wipe an entire portal's postings.
 */
const sourceStateSchema = new mongoose.Schema(
  {
    siteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // ── Tier 0: HTTP cache validators ──────────────────────────────────
    etag: { type: String, default: null },
    lastModified: { type: String, default: null },

    // ── Tier 1: content fingerprint of the listing index ───────────────
    listingSetHash: { type: String, default: null },

    // ── Sweep bookkeeping ──────────────────────────────────────────────
    lastCheckedAt: { type: Date, default: null },
    lastChangedAt: { type: Date, default: null },
    lastSweepAt: { type: Date, default: null },
    lastSweepOk: { type: Boolean, default: false },
    lastListingCount: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },

    // ── Observability ──────────────────────────────────────────────────
    lastEngine: { type: String, default: null },
    lastOutcome: { type: String, default: null },
    lastError: { type: String, default: null },
    stats: {
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      deleted: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      aiCalls: { type: Number, default: 0 },
      detailFetches: { type: Number, default: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

const SourceState = mongoose.model('SourceState', sourceStateSchema);

export default SourceState;
