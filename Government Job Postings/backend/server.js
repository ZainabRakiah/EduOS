/**
 * Express Server + Scheduler
 * ──────────────────────────
 * Backend entry point.
 *
 * The API's contract is "whatever is in the database is current". Expiry runs on
 * its own schedule, so `/api/jobs` does not need to filter out closed postings —
 * they have already been deleted. It still applies a deadline guard as a belt-
 * and-braces measure for the window between a deadline passing and the next
 * hourly sweep, because showing a job that closed 40 minutes ago is a worse
 * failure than omitting one.
 *
 * `POST /api/jobs/sync` survives deliberately, but is no longer advertised to the
 * frontend. The requirement is that a *user* never has to trigger a sync; having
 * no manual trigger at all would make verification and incident response
 * needlessly painful.
 */

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import Job from './models/Job.js';
import SourceState from './models/SourceState.js';
import { runIncrementalSync, runExpirySweep } from './services/incrementalSync.js';
import { startJobTicker } from './cron/jobTicker.js';
import { isAllowedOfficialUrl } from './utils/urlAllowlist.js';

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

let syncInProgress = false;
let lastSyncReport = null;

/**
 * Single-flight guard around the orchestrator.
 *
 * Retained from the previous server for a stronger reason than before: the cron
 * change-check, the daily deep reconcile and a manual ops trigger can now
 * coincide, and two concurrent sweeps of the same source would race on
 * `SourceState` — one could store a `listingSetHash` describing rows the other
 * has not yet written, marking a genuinely-changed source as unchanged.
 */
async function safeRunSync(trigger = 'unknown', options = {}) {
  if (syncInProgress) {
    return { ok: false, message: 'A sync is already in progress' };
  }

  syncInProgress = true;
  console.log(`[sync] triggered by ${trigger}`);

  try {
    const report = await runIncrementalSync(options);
    lastSyncReport = report;
    return { ok: true, report };
  } catch (error) {
    console.error('[sync] unhandled error:', error.message);
    return { ok: false, message: error.message };
  } finally {
    syncInProgress = false;
  }
}

/** Fields the list view needs. Excludes bulk prose to keep the payload small. */
const LIST_FIELDS =
  'identityKey title organization department location employmentType workMode ' +
  'salary vacancies ageLimit qualifications skills experience ' +
  'postedAt applicationStartDate applicationDeadline applicationDeadlineRaw ' +
  'applicationUrl notificationPdfUrl source firstSeenAt lastSeenAt extraction';

const SORTS = {
  deadline: { applicationDeadline: 1 },
  newest: { firstSeenAt: -1 },
  posted: { postedAt: -1 },
  vacancies: { 'vacancies.count': -1 },
};

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    syncInProgress,
    mongoState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/jobs
 * Query: page, limit, source, q, employmentType, sort, hasDeadline
 */
app.get('/api/jobs', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;

    const filter = {
      // Postings with no stated deadline are kept: several sources genuinely
      // never publish one, and dropping them would silently hide real jobs.
      $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
    };

    if (req.query.source) filter['source.siteId'] = String(req.query.source);
    if (req.query.employmentType) filter.employmentType = String(req.query.employmentType);
    if (req.query.q) {
      const term = String(req.query.q).trim().slice(0, 120);
      if (term) {
        const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$and = [{ $or: [{ title: rx }, { organization: rx }, { department: rx }] }];
      }
    }

    const sort = SORTS[String(req.query.sort)] || SORTS.newest;

    const [jobs, total] = await Promise.all([
      Job.find(filter).select(LIST_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      data: jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/jobs]', error.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/meta
 * Freshness and counts, so the UI can show a real "last updated" instead of a
 * hardcoded string, and can build its filter chips from live data.
 */
app.get('/api/meta', async (_req, res) => {
  try {
    const [states, total, bySource, newest] = await Promise.all([
      SourceState.find().select('-_id -createdAt -updatedAt').lean(),
      Job.countDocuments(),
      Job.aggregate([
        { $group: { _id: '$source.siteId', name: { $first: '$source.name' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Job.findOne().sort({ firstSeenAt: -1 }).select('firstSeenAt').lean(),
    ]);

    const checkedAt = states
      .map((s) => s.lastCheckedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null;

    res.json({
      lastSyncAt: checkedAt,
      lastJobAddedAt: newest?.firstSeenAt || null,
      syncInProgress,
      totalJobs: total,
      sources: bySource.map((s) => ({ siteId: s._id, name: s.name, count: s.count })),
      sourceStates: states.map((s) => ({
        siteId: s.siteId,
        lastCheckedAt: s.lastCheckedAt,
        lastSweepOk: s.lastSweepOk,
        lastOutcome: s.lastOutcome,
        listingCount: s.lastListingCount,
        consecutiveFailures: s.consecutiveFailures,
      })),
    });
  } catch (error) {
    console.error('[GET /api/meta]', error.message);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

/** Safe redirect to the official portal page. */
app.get('/api/jobs/:id/apply', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select('applicationUrl').lean();

    if (!job?.applicationUrl) {
      return res.status(404).json({ error: 'Job or application URL not found' });
    }
    if (!isAllowedOfficialUrl(job.applicationUrl)) {
      console.warn(`[redirect] blocked ${job.applicationUrl} for job ${req.params.id}`);
      return res.status(404).json({ error: 'Application URL is not on an allowed domain' });
    }

    res.redirect(302, job.applicationUrl);
  } catch (error) {
    console.error('[GET /api/jobs/:id/apply]', error.message);
    res.status(500).json({ error: 'Failed to redirect to application page' });
  }
});

/** Full record, including the prose the list view omits. */
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ data: job });
  } catch (error) {
    console.error('[GET /api/jobs/:id]', error.message);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/** Ops-only manual trigger. Not used by the frontend. `?force=1` deep-reconciles. */
app.post('/api/jobs/sync', async (req, res) => {
  if (syncInProgress) return res.status(409).json({ error: 'Sync already in progress' });

  const force = req.query.force === '1' || req.body?.force === true;

  res.status(202).json({ message: 'Sync started', force, startedAt: new Date().toISOString() });

  safeRunSync('POST /api/jobs/sync', { force }).then((outcome) => {
    if (!outcome.ok) console.error('[sync] background run failed:', outcome.message);
  });
});

app.get('/api/jobs/sync/status', (_req, res) => {
  res.json({ syncInProgress, totals: lastSyncReport?.totals || null });
});

app.use((err, _req, res, _next) => {
  console.error('[express] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error('[mongo] MONGODB_URI is not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[mongo] connected');
  } catch (error) {
    console.error('[mongo] connection failed:', error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log('[server] GET /api/health  GET /api/jobs  GET /api/jobs/:id  GET /api/meta');
  });

  startJobTicker({ runSync: safeRunSync, runExpiry: runExpirySweep });
}

function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down…`);
  mongoose.connection.close(false).then(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled rejection:', reason);
});

startServer();
