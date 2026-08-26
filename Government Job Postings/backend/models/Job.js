import mongoose from 'mongoose';

/**
 * Job Schema — normalized job posting
 * ───────────────────────────────────
 * One document per ACTIVE government job posting. Expired and withdrawn
 * postings are hard-deleted; identity/hash tombstones live in ListingState.
 * This collection is the single source of truth the frontend renders.
 *
 * Two deliberate departures from the previous schema:
 *
 *  1. Dates are real Dates, not free text. Deadline-based expiry is
 *     impossible when "11/06/2026 - 6:00pm" is stored as a String, which is
 *     why nothing could ever be expired before. The original display string
 *     is preserved alongside in `applicationDeadlineRaw`.
 *
 *  2. Uniqueness is on `identityKey`, not on the application URL. The old
 *     unique index on `officialApplicationUrl` silently destroyed data:
 *     Employment News lists many jobs that share one landing URL, so 6 of
 *     every 10 rows died on a duplicate-key error.
 */

const NOT_SPECIFIED = 'Not specified';

const jobSchema = new mongoose.Schema(
  {
    // ── Identity & change tracking ─────────────────────────────────────
    identityKey: {
      type: String,
      required: [true, 'identityKey is required'],
      unique: true,
      index: true,
      trim: true,
    },
    contentHash: { type: String, required: true, index: true },

    // ── What the job is ────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    organization: { type: String, default: NOT_SPECIFIED, trim: true },
    department: {
      type: String,
      required: [true, 'department is required'],
      trim: true,
    },

    description: { type: String, default: '', trim: true },
    responsibilities: { type: [String], default: [] },
    qualifications: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    experience: { type: String, default: NOT_SPECIFIED, trim: true },

    // ── Where and how ──────────────────────────────────────────────────
    location: {
      raw: { type: String, default: NOT_SPECIFIED, trim: true },
      city: { type: String, default: null, trim: true },
      state: { type: String, default: null, trim: true },
      isPanIndia: { type: Boolean, default: false },
    },
    employmentType: {
      type: String,
      enum: ['permanent', 'contractual', 'deputation', 'internship', 'temporary', 'unknown'],
      default: 'unknown',
      index: true,
    },
    workMode: {
      type: String,
      enum: ['onsite', 'hybrid', 'remote', 'unknown'],
      default: 'unknown',
    },

    // ── Compensation & scale ───────────────────────────────────────────
    salary: {
      raw: { type: String, default: NOT_SPECIFIED, trim: true },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'INR' },
      payLevel: { type: String, default: null, trim: true },
    },
    vacancies: {
      raw: { type: String, default: NOT_SPECIFIED, trim: true },
      count: { type: Number, default: null },
    },
    ageLimit: {
      raw: { type: String, default: NOT_SPECIFIED, trim: true },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },

    // ── Timeline (real Dates — these make expiry possible) ─────────────
    postedAt: { type: Date, default: null },
    applicationStartDate: { type: Date, default: null },
    applicationDeadline: { type: Date, default: null, index: true },
    applicationDeadlineRaw: { type: String, default: NOT_SPECIFIED, trim: true },

    // ── Links ──────────────────────────────────────────────────────────
    applicationUrl: {
      type: String,
      required: [true, 'applicationUrl is required'],
      trim: true,
    },
    notificationPdfUrl: { type: String, default: null, trim: true },

    // ── Provenance ─────────────────────────────────────────────────────
    source: {
      siteId: { type: String, required: true, index: true, trim: true },
      name: { type: String, default: '', trim: true },
      portalUrl: { type: String, default: '', trim: true },
    },

    /** Anything portal-specific worth keeping but not worth a column. */
    extras: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Lifecycle ──────────────────────────────────────────────────────
    firstSeenAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    fetchedAt: { type: Date, default: Date.now, index: true },

    /** How this record was built — used by the coverage report. */
    extraction: {
      engine: { type: String, default: null },
      usedAi: { type: Boolean, default: false },
      usedPdf: { type: Boolean, default: false },
      fieldsFilled: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

// Newest-first listing, the default API sort.
jobSchema.index({ firstSeenAt: -1 });
// Expiry sweep: find everything already past its deadline.
jobSchema.index({ applicationDeadline: 1, 'source.siteId': 1 });
// Keyword search across the fields the UI filters on.
jobSchema.index({ title: 'text', organization: 'text', department: 'text' });

const Job = mongoose.model('Job', jobSchema);

export { NOT_SPECIFIED };
export default Job;
