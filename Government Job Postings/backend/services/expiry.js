import Job from '../models/Job.js';
import ListingState from '../models/ListingState.js';

/**
 * Expiry
 * ──────
 * Keeps the database to *current* postings only, per the requirement that it
 * must not become a historical archive. Three removal triggers:
 *
 *   1. the application deadline has passed;
 *   2. the source marks the posting closed/withdrawn;
 *   3. the posting has vanished from its source listing.
 *
 * Trigger 1 needs no network at all — it is a single indexed query on
 * `applicationDeadline`, which is only possible because the schema stores real
 * `Date` objects. The previous schema stored every date as free text, which is
 * the concrete reason nothing could ever be expired.
 *
 * ── Why jobs are hard-deleted but identities are kept ──
 * The `jobs` collection is the frontend's source of truth and must contain only
 * live postings, so an expired job is deleted outright. Its `identityKey` stays
 * behind in `ListingState` as a tombstone. Without that tombstone the next sweep
 * would see the still-published listing row, find no matching job, classify it
 * as new, and re-scrape and re-insert it — then expire it again 20 minutes
 * later, forever. The tombstone holds identity and hashes only, never posting
 * content, so this is not an archive.
 */

/** Consecutive successful sweeps a posting may be absent before removal. */
export const MISS_THRESHOLD = 2;

/**
 * Deletes jobs whose deadline has passed.
 *
 * Deadlines are stored at end-of-day IST, so a posting closing today survives
 * until that instant rather than being removed at 00:00.
 *
 * @param {Date} [now]
 * @returns {Promise<object>} { deleted, keys }
 */
export async function expireByDeadline(now = new Date()) {
  const due = await Job.find({ applicationDeadline: { $ne: null, $lt: now } })
    .select('identityKey applicationDeadline source.siteId')
    .lean();

  if (!due.length) return { deleted: 0, keys: [] };

  const keys = due.map((job) => job.identityKey);

  await Job.deleteMany({ identityKey: { $in: keys } });
  await ListingState.updateMany(
    { identityKey: { $in: keys } },
    {
      $set: {
        status: 'expired',
        removedAt: now,
        removedReason: 'deadline passed',
      },
    }
  );

  return { deleted: keys.length, keys };
}

/**
 * Records that identities were absent from a sweep, and removes the ones that
 * have now been absent long enough.
 *
 * `plausible` is the safety interlock. A source that errors, rate-limits, or
 * returns a truncated list would otherwise look like a mass withdrawal — an SSC
 * outage answering 200 with an empty array must never wipe SSC's jobs. When the
 * sweep is not trustworthy this function deliberately does nothing at all, not
 * even incrementing the counter, so a flaky source cannot accumulate misses
 * toward deletion across failures.
 *
 * @param {object} params
 * @param {string} params.siteId
 * @param {string[]} params.missingKeys
 * @param {boolean} params.plausible Sweep passed its row-count check
 * @param {string[]} params.presentKeys Identities seen this sweep — their miss
 *   counters are reset, so absence must be *consecutive* to count.
 * @returns {Promise<object>} { deleted, keys, skipped }
 */
export async function expireByAbsence({ siteId, missingKeys, plausible, presentKeys = [] }) {
  if (!plausible) {
    return { deleted: 0, keys: [], skipped: 'sweep not plausible' };
  }

  if (presentKeys.length) {
    await ListingState.updateMany(
      { siteId, identityKey: { $in: presentKeys }, missCount: { $gt: 0 } },
      { $set: { missCount: 0 } }
    );
  }

  if (!missingKeys.length) return { deleted: 0, keys: [], skipped: null };

  await ListingState.updateMany(
    { siteId, identityKey: { $in: missingKeys } },
    { $inc: { missCount: 1 } }
  );

  const doomed = await ListingState.find({
    siteId,
    identityKey: { $in: missingKeys },
    missCount: { $gte: MISS_THRESHOLD },
  })
    .select('identityKey')
    .lean();

  if (!doomed.length) return { deleted: 0, keys: [], skipped: null };

  const keys = doomed.map((d) => d.identityKey);
  const now = new Date();

  await Job.deleteMany({ identityKey: { $in: keys } });
  await ListingState.updateMany(
    { identityKey: { $in: keys } },
    {
      $set: {
        status: 'removed',
        removedAt: now,
        removedReason: `absent from ${MISS_THRESHOLD} consecutive successful sweeps`,
      },
    }
  );

  return { deleted: keys.length, keys, skipped: null };
}

/**
 * Prunes tombstones that no longer serve a purpose.
 *
 * A tombstone only needs to outlive the source's own listing of that posting.
 * Once the source has stopped publishing it, the tombstone can no longer prevent
 * a re-ingest, so keeping it forever would grow `ListingState` without bound.
 * 180 days is comfortably longer than any observed portal retention.
 */
export async function pruneTombstones(now = new Date(), maxAgeDays = 180) {
  const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
  const result = await ListingState.deleteMany({
    status: { $in: ['expired', 'removed'] },
    removedAt: { $ne: null, $lt: cutoff },
  });
  return { pruned: result.deletedCount || 0 };
}

export default { expireByDeadline, expireByAbsence, pruneTombstones, MISS_THRESHOLD };
