/**
 * Renormalize stored jobs
 * ───────────────────────
 * Re-derives the parsed sub-objects — `salary`, `ageLimit`, `location` — from the
 * raw strings already stored on each job, then recomputes `contentHash`.
 *
 * This exists because of a structural gap in incremental sync: a row is only
 * re-normalized when its `listingHash` moves, i.e. when the *source* changes. So
 * when a parser bug is fixed on our side, every already-stored posting keeps its
 * wrong value until the portal happens to edit that listing — which for a closed
 * recruitment is never. `--force` does not help: it bypasses the source-level
 * hash, not the per-row one.
 *
 * Safe and cheap by construction: no network, no AI, no deletes, no inserts. It
 * only rewrites fields that are pure functions of `*.raw`, which is why it can be
 * re-run after any extraction change without re-scraping anything.
 *
 *   node scripts/renormalize.js --dry-run
 *   node scripts/renormalize.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import ListingState from '../models/ListingState.js';
import {
  parseSalary,
  parseAgeLimit,
  parseLocation,
  computeContentHash,
} from '../services/normalizeJob.js';

const NOT_SPECIFIED = 'Not specified';

/**
 * Applies the `Not specified` sentinel exactly where `normalizeJob` does.
 *
 * Only `salary` and `ageLimit` get it there; `location.raw` is deliberately left
 * null. Applying it uniformly here would rewrite every location in the database
 * and report each one as a change.
 */
function withRaw(parsed, originalRaw) {
  return { ...parsed, raw: parsed.raw || originalRaw || NOT_SPECIFIED };
}

/**
 * Compares only the keys the parsers actually produce.
 *
 * A raw `JSON.stringify` comparison reports every nested object as different,
 * because Mongoose gives each nested subdocument its own `_id` that a freshly
 * parsed object has no reason to carry.
 */
function differs(stored, next) {
  return Object.keys(next).some((key) => (stored?.[key] ?? null) !== (next[key] ?? null));
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI);

  const jobs = await Job.find().lean();
  console.log(`${jobs.length} job(s) loaded${dryRun ? ' (dry run)' : ''}`);

  let changed = 0;

  for (const job of jobs) {
    const next = {
      salary: withRaw(parseSalary(job.salary?.raw), job.salary?.raw),
      ageLimit: withRaw(parseAgeLimit(job.ageLimit?.raw), job.ageLimit?.raw),
      location: parseLocation(job.location?.raw),
    };

    const diffs = Object.keys(next).filter((key) => differs(job[key], next[key]));
    if (!diffs.length) continue;

    changed += 1;
    for (const key of diffs) {
      console.log(
        `  ${job.title?.slice(0, 44).padEnd(44)} ${key}: ` +
          `${JSON.stringify(strip(job[key]))} → ${JSON.stringify(strip(next[key]))}`
      );
    }

    if (dryRun) continue;

    // The rewritten fields are hashed, so `contentHash` has to move with them or
    // the next sweep would compare against a hash that no longer describes the
    // document and report a spurious change.
    const contentHash = computeContentHash({ ...job, ...next });
    await Job.updateOne({ _id: job._id }, { $set: { ...next, contentHash } });
    await ListingState.updateOne({ identityKey: job.identityKey }, { $set: { contentHash } });
  }

  console.log(`\n${changed} job(s) ${dryRun ? 'would be updated' : 'updated'}`);
  await mongoose.disconnect();
}

/** Drops `raw` from log output — it is unchanged and often 100 chars long. */
function strip(value) {
  if (!value) return value;
  const { raw, ...rest } = value;
  return rest;
}

main().catch((error) => {
  console.error('fatal:', error);
  process.exit(1);
});
