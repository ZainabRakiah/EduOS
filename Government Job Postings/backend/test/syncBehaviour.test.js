/**
 * Acceptance checks for the incremental sync.
 *
 * These are the plan's verification items 4 and 5, run against the live database
 * rather than fixtures — the behaviour under test is *database* behaviour
 * (update-in-place vs. duplicate insert, delete vs. don't-delete), and a mock
 * would only prove the mock works.
 *
 * Every check restores what it changed, so this is safe to run repeatedly.
 *
 *   node test/syncBehaviour.test.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import ListingState from '../models/ListingState.js';
import SourceState from '../models/SourceState.js';
import { expireByDeadline, expireByAbsence, MISS_THRESHOLD } from '../services/expiry.js';
import { syncSite } from '../services/incrementalSync.js';
import { getSite } from '../config/siteRegistry.js';

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Update proof.
 *
 * Corrupts the stored hashes for one posting so the next sweep believes it
 * changed, then asserts the sweep mutates that document instead of inserting a
 * second one. This is the requirement's "₹8–10 LPA → ₹10–12 LPA" case with the
 * network taken out of the loop.
 *
 * Both hashes have to move, because they answer different questions and a real
 * edit moves both: `listingHash` is what the detector compares to decide the row
 * is worth re-reading at all, and `contentHash` is what the writer compares to
 * decide the document is worth rewriting. Corrupting only `contentHash` leaves
 * the row classified untouched and it is never even considered; corrupting only
 * `listingHash` gets it re-read and then correctly written off as unchanged.
 */
async function updateProof() {
  console.log('\nUpdate proof — changed posting updates in place');

  const victim = await Job.findOne().select('identityKey contentHash source').lean();
  if (!victim) {
    console.log('  – skipped: no jobs in database');
    return;
  }

  const site = getSite(victim.source.siteId);
  const beforeCount = await Job.countDocuments({ 'source.siteId': site.id });
  const beforeDoc = await Job.findOne({ identityKey: victim.identityKey }).select('_id').lean();

  await ListingState.updateOne(
    { identityKey: victim.identityKey },
    { $set: { listingHash: 'forced-mismatch', contentHash: 'forced-mismatch' } }
  );
  // Clear the source-level hash too, or Tier 1 short-circuits before any row is
  // compared and the test would prove nothing.
  const savedState = await SourceState.findOne({ siteId: site.id }).lean();
  await SourceState.updateOne({ siteId: site.id }, { $set: { listingSetHash: null } });

  const outcome = await syncSite(site);

  const afterCount = await Job.countDocuments({ 'source.siteId': site.id });
  const afterDoc = await Job.findOne({ identityKey: victim.identityKey }).select('_id').lean();

  check(`${site.id}: no duplicate document created`, afterCount === beforeCount,
    `${beforeCount} → ${afterCount}`);
  check('same _id retained (updated, not replaced)',
    Boolean(afterDoc) && String(afterDoc._id) === String(beforeDoc._id));
  check('sweep reported exactly one update', outcome.updated === 1,
    `updated=${outcome.updated}, inserted=${outcome.inserted}`);
  check('sweep inserted nothing', outcome.inserted === 0, `inserted=${outcome.inserted}`);
  check('content hash restored to the real value',
    (await Job.findOne({ identityKey: victim.identityKey }).select('contentHash').lean())
      ?.contentHash === victim.contentHash);

  if (savedState?.listingSetHash) {
    await SourceState.updateOne(
      { siteId: site.id },
      { $set: { listingSetHash: savedState.listingSetHash } }
    );
  }
}

/**
 * Expiry proof.
 *
 * A synthetic posting with a deadline in the past must be deleted, and its
 * identity must survive as a tombstone — without the tombstone the next sweep
 * would rediscover it as new and the churn loop starts.
 */
async function expiryProof() {
  console.log('\nExpiry proof — past deadline is deleted, identity is tombstoned');

  const key = 'test-harness:expiry-probe';
  const past = new Date(Date.now() - 86_400_000);

  await Job.deleteOne({ identityKey: key });
  await ListingState.deleteOne({ identityKey: key });

  await Job.create({
    identityKey: key,
    title: 'Expiry probe',
    organization: 'Test Harness',
    department: 'Test Harness',
    applicationDeadline: past,
    applicationUrl: 'https://upsc.gov.in/',
    contentHash: 'probe',
    source: { siteId: 'test-harness', name: 'Test Harness', portalUrl: 'https://upsc.gov.in/' },
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });
  await ListingState.create({
    identityKey: key,
    siteId: 'test-harness',
    listingHash: 'probe',
    status: 'active',
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });

  const result = await expireByDeadline();

  const job = await Job.findOne({ identityKey: key }).lean();
  const state = await ListingState.findOne({ identityKey: key }).lean();

  check('expired job deleted from jobs', job === null);
  check('expiry reported the deletion', result.keys.includes(key));
  check('identity kept as tombstone', state !== null);
  check('tombstone marked expired', state?.status === 'expired', `status=${state?.status}`);
  check('removal reason recorded', Boolean(state?.removedReason));

  await ListingState.deleteOne({ identityKey: key });
}

/**
 * Deletion-safety proof.
 *
 * The scenario that must never happen: a source returns an implausibly small
 * listing (an outage, a markup change, a WAF block) and the sweep concludes every
 * posting has been withdrawn. `expireByAbsence` must do nothing at all here —
 * not even increment `missCount`, or a flaky source would accumulate misses
 * across failures and eventually delete real jobs.
 */
async function deletionSafetyProof() {
  console.log('\nDeletion-safety proof — an implausible sweep deletes nothing');

  const key = 'test-harness:absence-probe';

  await Job.deleteOne({ identityKey: key });
  await ListingState.deleteOne({ identityKey: key });

  await Job.create({
    identityKey: key,
    title: 'Absence probe',
    organization: 'Test Harness',
    department: 'Test Harness',
    applicationDeadline: new Date(Date.now() + 30 * 86_400_000),
    applicationUrl: 'https://upsc.gov.in/',
    contentHash: 'probe',
    source: { siteId: 'test-harness', name: 'Test Harness', portalUrl: 'https://upsc.gov.in/' },
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });
  await ListingState.create({
    identityKey: key,
    siteId: 'test-harness',
    listingHash: 'probe',
    status: 'active',
    missCount: 0,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });

  // Implausible sweep: the safety interlock should refuse outright.
  const blocked = await expireByAbsence({
    siteId: 'test-harness',
    missingKeys: [key],
    plausible: false,
  });

  let state = await ListingState.findOne({ identityKey: key }).lean();
  check('implausible sweep deleted nothing', blocked.deleted === 0);
  check('implausible sweep was explicitly skipped', Boolean(blocked.skipped), blocked.skipped || '');
  check('missCount not incremented by a failed sweep', state?.missCount === 0,
    `missCount=${state?.missCount}`);
  check('job still present', (await Job.countDocuments({ identityKey: key })) === 1);

  // First plausible miss: counted, but below threshold, so still not deleted.
  const first = await expireByAbsence({
    siteId: 'test-harness',
    missingKeys: [key],
    plausible: true,
  });
  state = await ListingState.findOne({ identityKey: key }).lean();
  check(`one miss does not delete (threshold ${MISS_THRESHOLD})`, first.deleted === 0);
  check('missCount incremented to 1', state?.missCount === 1, `missCount=${state?.missCount}`);
  check('job still present after one miss',
    (await Job.countDocuments({ identityKey: key })) === 1);

  // Second consecutive plausible miss: now it goes.
  const second = await expireByAbsence({
    siteId: 'test-harness',
    missingKeys: [key],
    plausible: true,
  });
  state = await ListingState.findOne({ identityKey: key }).lean();
  check(`${MISS_THRESHOLD} consecutive misses deletes`, second.deleted === 1,
    `deleted=${second.deleted}`);
  check('job removed', (await Job.countDocuments({ identityKey: key })) === 0);
  check('tombstone marked removed', state?.status === 'removed', `status=${state?.status}`);

  await ListingState.deleteOne({ identityKey: key });
}

/**
 * Sighting proof — a posting seen again after a miss has its counter cleared, so
 * a single flaky sweep can never combine with a later one to reach the threshold.
 */
async function sightingResetProof() {
  console.log('\nSighting proof — reappearance clears the miss counter');

  const key = 'test-harness:reset-probe';
  await ListingState.deleteOne({ identityKey: key });
  await ListingState.create({
    identityKey: key,
    siteId: 'test-harness',
    listingHash: 'probe',
    status: 'active',
    missCount: 1,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });

  await expireByAbsence({
    siteId: 'test-harness',
    missingKeys: [],
    presentKeys: [key],
    plausible: true,
  });

  const state = await ListingState.findOne({ identityKey: key }).lean();
  check('missCount reset to 0 on reappearance', state?.missCount === 0,
    `missCount=${state?.missCount}`);

  await ListingState.deleteOne({ identityKey: key });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Sync behaviour acceptance checks');

  try {
    await expiryProof();
    await deletionSafetyProof();
    await sightingResetProof();
    await updateProof();
  } finally {
    // Belt and braces: never leave harness rows behind, even on a throw.
    await Job.deleteMany({ 'source.siteId': 'test-harness' });
    await ListingState.deleteMany({ siteId: 'test-harness' });
    await mongoose.disconnect();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('fatal:', error);
  process.exit(1);
});
