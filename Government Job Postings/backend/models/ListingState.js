import mongoose from 'mongoose';

/**
 * ListingState
 * ────────────
 * One document per job identity ever seen, holding hashes and sighting
 * bookkeeping — never posting content.
 *
 * This collection is load-bearing, not incidental. Expired jobs are hard-
 * deleted from the `jobs` collection so the database never becomes a
 * historical archive. Without a tombstone here, the very next sweep would
 * rediscover each deleted job as brand new, re-fetch its detail page,
 * re-run PDF parsing and Gemini on it, re-insert it, then expire and delete
 * it again — an unbounded churn loop burning API tokens every 30 minutes.
 *
 * Storing only identity + hashes keeps this small and keeps the promise that
 * the job data itself holds active postings only.
 *
 * Hash roles:
 *   listingHash — the listing row's visible fields. Cheap signal deciding
 *                 whether the detail page needs re-fetching at all.
 *   contentHash — the fully normalized record. Decides whether a DB write is
 *                 needed, so a salary change updates in place instead of
 *                 creating a duplicate document.
 */
const listingStateSchema = new mongoose.Schema(
  {
    identityKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    siteId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    listingHash: { type: String, default: null },
    contentHash: { type: String, default: null },

    // Mirrored from the job so expiry can be evaluated without a join.
    applicationDeadline: { type: Date, default: null },

    // Kept for diagnostics and for rebuilding a job document's stable URL.
    applicationUrl: { type: String, default: null },
    title: { type: String, default: null },

    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },

    /**
     * Consecutive SUCCESSFUL sweeps in which this identity was absent from
     * the source listing. Reaching 2 triggers deletion. Only incremented
     * when the sweep passed its plausibility check.
     */
    missCount: { type: Number, default: 0 },

    /**
     * active  — currently published, present in `jobs`
     * expired — deadline passed; removed from `jobs`, tombstone retained
     * removed — vanished from the source; removed from `jobs`
     */
    status: {
      type: String,
      enum: ['active', 'expired', 'removed'],
      default: 'active',
      index: true,
    },
    removedAt: { type: Date, default: null },
    removedReason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Drives the per-site diff: fetch every known key for one site at once.
listingStateSchema.index({ siteId: 1, status: 1 });

const ListingState = mongoose.model('ListingState', listingStateSchema);

export default ListingState;
