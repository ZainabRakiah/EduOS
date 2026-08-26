import Job from '../models/Job.js';
import SourceState from '../models/SourceState.js';
import ListingState from '../models/ListingState.js';
import SITE_REGISTRY, { ADAPTERS, getSite } from '../config/siteRegistry.js';
import { detectChanges } from './changeDetector.js';
import { enrichFromDetail } from './extractors/htmlListing.js';
import { enrichNarrative, resetAiBudget, isAiConfigured } from './geminiParser.js';
import { normalizeJob } from './normalizeJob.js';
import { expireByDeadline, expireByAbsence, pruneTombstones } from './expiry.js';

/**
 * Incremental Sync
 * ────────────────
 * The orchestrator. Replaces `runFullSync`, which re-scraped every listing on
 * every invocation, re-ran the AI on all of them, and had no way to update or
 * remove anything — a new run could only insert, and duplicate inserts died on
 * the unique index.
 *
 * The control flow here is the requirement, stated as code:
 *
 *   1. ask whether the source changed at all      → `detectChanges`
 *   2. if not, stop                                (no fetch, no parse, no write)
 *   3. if so, work ONLY on the rows it named      → `newRows` / `changedRows`
 *   4. write only when the content hash moved      → update in place, never dupe
 *   5. remove what is no longer current            → `expiry.js`
 *
 * Step 3 is where "if 10,000 jobs exist and 5 are new, process only those 5"
 * lives: `unchangedRows` get their `lastSeenAt` bumped in one bulk write and are
 * otherwise never touched — no detail fetch, no PDF read, no AI call.
 *
 * Concurrency is per-site, deliberately. Five sites run in parallel because they
 * are unrelated hosts, but rows within a site run sequentially so one portal
 * never receives five simultaneous requests from us.
 */

/** Rows enriched per site per run. Bounds a first-run backlog. */
const MAX_ENRICH_PER_SITE = Number(process.env.SYNC_MAX_ENRICH_PER_SITE) || 25;

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(...args) {
  console.log(`[sync ${nowIso()}]`, ...args);
}

/**
 * Brings one row up to full detail.
 *
 * Only called for rows the detector classified as new or changed. Adapter
 * dictates the work: `htmlRows`/`htmlTable` may need a detail page, while
 * `pdfAdvert` and `api` rows already carry everything their source exposes —
 * the booklet PDF was read during the sweep because that *is* the listing.
 *
 * The deadline is re-checked between the two enrichment steps. A source can
 * publish a posting whose window has already closed — UPSC's "active
 * examinations" list is entirely this, since "active" there means the exam
 * process is running, not that applications are open — and the deadline is often
 * only discoverable from the detail page. Asking the AI to describe a posting
 * that the expiry sweep will delete minutes later is pure waste: on the first
 * cold run this cost 18 of 26 total calls.
 */
async function enrichRow(site, row) {
  const counters = { detailFetches: 0, aiCalls: 0 };

  if (
    (site.adapter === ADAPTERS.HTML_ROWS || site.adapter === ADAPTERS.HTML_TABLE) &&
    site.detail?.enabled
  ) {
    await enrichFromDetail(site, row);
    counters.detailFetches = 1;
  }

  if (row.applicationDeadline instanceof Date && row.applicationDeadline < new Date()) {
    row.alreadyExpired = true;
    return counters;
  }

  const before = Boolean(row.extraction?.usedAi);
  await enrichNarrative(row, {
    title: row.title,
    organization: row.organization,
    department: site.department,
  });
  if (!before && row.extraction?.usedAi) counters.aiCalls = 1;

  return counters;
}

/**
 * Writes one normalized job, inserting or updating as appropriate.
 *
 * The update path is an `updateOne` keyed on `identityKey`, so the requirement's
 * own example — a salary moving from ₹8–10 LPA to ₹10–12 LPA — mutates the
 * existing document. `firstSeenAt` is set only on insert (`$setOnInsert`), which
 * is what lets the frontend's "New" badge mean "new to us" rather than "written
 * most recently".
 */
async function writeJob(job, { isNew, priorContentHash }) {
  const now = new Date();

  if (!isNew && priorContentHash && priorContentHash === job.contentHash) {
    await Job.updateOne({ identityKey: job.identityKey }, { $set: { lastSeenAt: now } });
    return 'unchanged';
  }

  const { identityKey, ...rest } = job;

  await Job.updateOne(
    { identityKey },
    {
      $set: { ...rest, lastSeenAt: now, fetchedAt: now },
      $setOnInsert: { identityKey, firstSeenAt: now },
    },
    { upsert: true }
  );

  return isNew ? 'inserted' : 'updated';
}

/** Mirrors identity, hashes and sighting time into the tombstone collection. */
async function recordListingState(site, row, job) {
  const now = new Date();
  await ListingState.updateOne(
    { identityKey: row.identityKey },
    {
      $set: {
        siteId: site.id,
        listingHash: row.listingHash,
        contentHash: job ? job.contentHash : undefined,
        applicationDeadline: job ? job.applicationDeadline : undefined,
        applicationUrl: job ? job.applicationUrl : row.applicationUrl,
        title: row.title,
        lastSeenAt: now,
        missCount: 0,
        status: 'active',
        removedAt: null,
        removedReason: null,
      },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true }
  );
}

/**
 * Syncs one source.
 *
 * @param {object} site Registry entry
 * @param {object} [options]
 * @param {boolean} [options.force] Ignore validators and the hash short-circuit
 * @param {boolean} [options.dryRun] Do everything except write
 */
export async function syncSite(site, options = {}) {
  const { force = false, dryRun = false } = options;
  const started = Date.now();

  const outcome = {
    siteId: site.id,
    ok: false,
    tier: null,
    unchanged: false,
    listingCount: 0,
    inserted: 0,
    updated: 0,
    unchangedJobs: 0,
    deleted: 0,
    skipped: 0,
    detailFetches: 0,
    aiCalls: 0,
    errors: [],
    ms: 0,
  };

  let diff;
  try {
    diff = await detectChanges(site, { force });
  } catch (error) {
    outcome.errors.push(`${site.id}: ${error.message}`);
    await SourceState.updateOne(
      { siteId: site.id },
      {
        $set: {
          lastCheckedAt: new Date(),
          lastSweepAt: new Date(),
          lastSweepOk: false,
          lastOutcome: 'error',
          lastError: error.message,
        },
        $inc: { consecutiveFailures: 1 },
      },
      { upsert: true }
    );
    outcome.ms = Date.now() - started;
    return outcome;
  }

  outcome.tier = diff.tier;
  outcome.listingCount = diff.listingCount;
  outcome.errors = diff.errors;

  // ── Sweep failed: record it and change nothing ────────────────────────────
  // Explicitly no deletions here. A 503 or a markup change must never be able
  // to empty a portal's postings out of the database.
  if (!diff.ok) {
    await SourceState.updateOne(
      { siteId: site.id },
      {
        $set: {
          lastCheckedAt: new Date(),
          lastSweepAt: new Date(),
          lastSweepOk: false,
          lastOutcome: 'failed',
          lastError: diff.errors[0] || 'sweep failed',
        },
        $inc: { consecutiveFailures: 1 },
      },
      { upsert: true }
    );
    log(`${site.id}: sweep failed — ${diff.errors[0] || 'unknown'}`);
    outcome.ms = Date.now() - started;
    return outcome;
  }

  outcome.ok = true;

  // ── Unchanged: the cheap path this whole design exists to reach ───────────
  if (diff.unchanged) {
    outcome.unchanged = true;
    outcome.tier = diff.tier;

    if (!dryRun) {
      const now = new Date();
      await SourceState.updateOne(
        { siteId: site.id },
        {
          $set: {
            lastCheckedAt: now,
            lastSweepAt: now,
            lastSweepOk: true,
            lastOutcome: `unchanged (tier ${diff.tier})`,
            lastError: null,
            consecutiveFailures: 0,
            ...(diff.etag ? { etag: diff.etag } : {}),
            ...(diff.lastModified ? { lastModified: diff.lastModified } : {}),
          },
        },
        { upsert: true }
      );
      // Tier 0 returned no rows at all, so there is nothing to touch. Tier 1
      // knows the identities and bumps them, which keeps `missCount` honest.
      if (diff.tier === 1 && diff.unchangedRows.length) {
        await ListingState.updateMany(
          { identityKey: { $in: diff.unchangedRows.map((r) => r.identityKey) } },
          { $set: { lastSeenAt: now, missCount: 0 } }
        );
      }
    }

    log(`${site.id}: unchanged (tier ${diff.tier}) — no fetches, no writes`);
    outcome.ms = Date.now() - started;
    return outcome;
  }

  // ── Tier 2: work the diff, and only the diff ──────────────────────────────
  const todo = [...diff.newRows, ...diff.changedRows];
  const budgeted = todo.slice(0, MAX_ENRICH_PER_SITE);
  const deferred = todo.length - budgeted.length;

  log(
    `${site.id}: ${diff.listingCount} rows — ${diff.newRows.length} new, ` +
      `${diff.changedRows.length} changed, ${diff.unchangedRows.length} untouched` +
      (deferred ? `, ${deferred} deferred to next run` : '')
  );

  const newKeys = new Set(diff.newRows.map((r) => r.identityKey));

  for (const row of budgeted) {
    try {
      const counters = await enrichRow(site, row);
      outcome.detailFetches += counters.detailFetches;
      outcome.aiCalls += counters.aiCalls;

      /**
       * `requireEvidence` sites can only be judged after enrichment: UPSC's
       * active-exams rows carry nothing but a name and a link until the detail
       * page is read, and a row that then yields neither a deadline nor a
       * notification PDF is an exam process, not an open vacancy.
       *
       * `alreadyExpired` is the same shape of decision: the posting is real but
       * its window has closed, so it is tombstoned instead of being inserted and
       * deleted again by the expiry sweep in the same run.
       */
      if (row.noEvidence || row.alreadyExpired) {
        outcome.skipped += 1;
        // Tombstoned so the next sweep does not re-fetch it to reach the same
        // conclusion, which would make this check cost a request every 30 min.
        if (!dryRun) {
          const expired = Boolean(row.alreadyExpired);
          await ListingState.updateOne(
            { identityKey: row.identityKey },
            {
              $set: {
                siteId: site.id,
                listingHash: row.listingHash,
                title: row.title,
                applicationUrl: row.applicationUrl,
                applicationDeadline: row.applicationDeadline || null,
                lastSeenAt: new Date(),
                status: expired ? 'expired' : 'removed',
                removedAt: new Date(),
                removedReason: expired
                  ? 'application deadline already passed when first seen'
                  : 'no application deadline or notification found',
              },
              $setOnInsert: { firstSeenAt: new Date() },
            },
            { upsert: true }
          );
        }
        continue;
      }

      const job = normalizeJob(row, site, { identityKey: row.identityKey });

      if (dryRun) {
        outcome.inserted += newKeys.has(row.identityKey) ? 1 : 0;
        outcome.updated += newKeys.has(row.identityKey) ? 0 : 1;
        continue;
      }

      const result = await writeJob(job, {
        isNew: newKeys.has(row.identityKey),
        priorContentHash: row.priorContentHash,
      });

      if (result === 'inserted') outcome.inserted += 1;
      else if (result === 'updated') outcome.updated += 1;
      else outcome.unchangedJobs += 1;

      await recordListingState(site, row, job);
    } catch (error) {
      outcome.errors.push(`${site.id}: ${row.title || row.identityKey} — ${error.message}`);
    }
  }

  // Untouched rows: one bulk sighting update, no per-row work whatsoever.
  if (!dryRun && diff.unchangedRows.length) {
    await ListingState.updateMany(
      { identityKey: { $in: diff.unchangedRows.map((r) => r.identityKey) } },
      { $set: { lastSeenAt: new Date(), missCount: 0 } }
    );
    await Job.updateMany(
      { identityKey: { $in: diff.unchangedRows.map((r) => r.identityKey) } },
      { $set: { lastSeenAt: new Date() } }
    );
    outcome.unchangedJobs += diff.unchangedRows.length;
  }

  // ── Disappearance ─────────────────────────────────────────────────────────
  if (!dryRun) {
    const absence = await expireByAbsence({
      siteId: site.id,
      missingKeys: diff.missingKeys,
      plausible: diff.plausible,
      presentKeys: diff.rows.map((r) => r.identityKey),
    });
    outcome.deleted += absence.deleted;
    if (absence.skipped) {
      log(`${site.id}: absence check skipped — ${absence.skipped}`);
    } else if (absence.deleted) {
      log(`${site.id}: removed ${absence.deleted} vanished posting(s)`);
    }
  }

  // ── Persist source state ──────────────────────────────────────────────────
  // `listingSetHash` is written only when the sweep was **deferred-free**. If
  // rows were left for the next run, storing the hash would make Tier 1 report
  // "unchanged" next time and the deferred rows would never be processed.
  if (!dryRun) {
    const now = new Date();
    await SourceState.updateOne(
      { siteId: site.id },
      {
        $set: {
          lastCheckedAt: now,
          lastSweepAt: now,
          lastChangedAt: now,
          lastSweepOk: true,
          lastListingCount: diff.listingCount,
          lastEngine: site.adapter,
          lastOutcome: `tier ${diff.tier}: +${outcome.inserted} ~${outcome.updated} -${outcome.deleted}`,
          lastError: outcome.errors[0] || null,
          consecutiveFailures: 0,
          ...(deferred ? {} : { listingSetHash: diff.listingSetHash }),
          ...(diff.etag ? { etag: diff.etag } : {}),
          ...(diff.lastModified ? { lastModified: diff.lastModified } : {}),
          stats: {
            inserted: outcome.inserted,
            updated: outcome.updated,
            deleted: outcome.deleted,
            unchanged: outcome.unchangedJobs,
            aiCalls: outcome.aiCalls,
            detailFetches: outcome.detailFetches,
          },
        },
      },
      { upsert: true }
    );
  }

  outcome.ms = Date.now() - started;
  return outcome;
}

/**
 * Runs a change-check across every enabled source.
 *
 * @param {object} [options]
 * @param {boolean} [options.force] Deep reconciliation: ignore validators and hashes
 * @param {boolean} [options.dryRun]
 * @param {string[]} [options.siteIds] Restrict to specific sources
 * @returns {Promise<object>} Aggregated report
 */
export async function runIncrementalSync(options = {}) {
  const { force = false, dryRun = false, siteIds = null } = options;
  const started = Date.now();

  resetAiBudget();

  const sites = SITE_REGISTRY.filter(
    (site) => site.enabled !== false && (!siteIds || siteIds.includes(site.id))
  );

  log(
    `starting ${force ? 'deep reconciliation' : 'change-check'} across ${sites.length} source(s)` +
      (isAiConfigured() ? '' : ' — AI disabled (no GEMINI_API_KEY)')
  );

  // Sites run in parallel; rows within a site are sequential (see module note).
  const results = await Promise.all(
    sites.map((site) =>
      syncSite(site, { force, dryRun }).catch((error) => ({
        siteId: site.id,
        ok: false,
        errors: [`${site.id}: ${error.message}`],
        inserted: 0,
        updated: 0,
        deleted: 0,
        unchangedJobs: 0,
        skipped: 0,
        detailFetches: 0,
        aiCalls: 0,
        unchanged: false,
        listingCount: 0,
        tier: null,
        ms: 0,
      }))
    )
  );

  // Deadline expiry is global and needs no network, so it runs once per sync
  // rather than per site.
  const expired = dryRun ? { deleted: 0 } : await expireByDeadline();
  if (expired.deleted) log(`expired ${expired.deleted} posting(s) past their deadline`);

  const report = {
    startedAt: new Date(started),
    finishedAt: new Date(),
    ms: Date.now() - started,
    force,
    dryRun,
    sites: results,
    totals: {
      sources: results.length,
      sourcesOk: results.filter((r) => r.ok).length,
      sourcesUnchanged: results.filter((r) => r.unchanged).length,
      inserted: sum(results, 'inserted'),
      updated: sum(results, 'updated'),
      unchanged: sum(results, 'unchangedJobs'),
      skipped: sum(results, 'skipped'),
      deleted: sum(results, 'deleted') + expired.deleted,
      expiredByDeadline: expired.deleted,
      detailFetches: sum(results, 'detailFetches'),
      aiCalls: sum(results, 'aiCalls'),
    },
    errors: results.flatMap((r) => r.errors || []),
  };

  const t = report.totals;
  log(
    `done in ${(report.ms / 1000).toFixed(1)}s — ` +
      `${t.sourcesUnchanged}/${t.sources} unchanged, ` +
      `+${t.inserted} new, ~${t.updated} updated, -${t.deleted} removed, ` +
      `${t.detailFetches} detail fetches, ${t.aiCalls} AI calls`
  );
  if (report.errors.length) log(`${report.errors.length} error(s):`, report.errors.slice(0, 5));

  return report;
}

function sum(results, key) {
  return results.reduce((total, r) => total + (r[key] || 0), 0);
}

/**
 * DB-only expiry sweep. No network at all — this is why it can run hourly.
 */
export async function runExpirySweep() {
  const expired = await expireByDeadline();
  const pruned = await pruneTombstones();
  if (expired.deleted || pruned.pruned) {
    log(`expiry sweep: ${expired.deleted} expired, ${pruned.pruned} tombstone(s) pruned`);
  }
  return { ...expired, ...pruned };
}

/** Entry point for `npm run sync`. */
async function main() {
  const mongoose = (await import('mongoose')).default;
  const dotenv = (await import('dotenv')).default;
  dotenv.config();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('--deep');
  const dryRun = args.includes('--dry-run');
  const siteArg = args.find((a) => a.startsWith('--site='));
  const siteIds = siteArg ? [siteArg.slice('--site='.length)] : null;

  if (siteIds && !getSite(siteIds[0])) {
    console.error(`Unknown site "${siteIds[0]}"`);
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    await runIncrementalSync({ force, dryRun, siteIds });
  } finally {
    await mongoose.disconnect();
  }
}

// Only self-execute when invoked directly, never when imported by the server.
const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('services/incrementalSync.js');
if (invokedDirectly) {
  main().catch((error) => {
    console.error('[sync] fatal:', error);
    process.exit(1);
  });
}

export default { runIncrementalSync, syncSite, runExpirySweep };
