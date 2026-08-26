/**
 * Job Ticker — Automation Heart
 * ─────────────────────────────
 * Registers the schedules that make synchronisation automatic. This is what
 * replaces the frontend's "Sync Database" button: the user never triggers work,
 * and the database is current whether or not anyone has the app open.
 *
 * Three schedules, because the three jobs have genuinely different costs:
 *
 *   change-check   every 30 min   Tier 0 → Tier 1; Tier 2 only on a real diff.
 *                                 A steady-state tick is ~120 KB of HTTP, zero
 *                                 parsing, zero AI calls and zero writes, which
 *                                 is the only reason 30 minutes is affordable.
 *
 *   expiry         hourly, :07    Pure database work — one indexed query on
 *                                 `applicationDeadline`. No network at all, so
 *                                 it can run often and cheaply, and a posting
 *                                 never lingers more than an hour past closing.
 *
 *   deep reconcile daily, 03:20   Full walk ignoring stored validators and the
 *                                 listing-set hash. Catches the case a hash
 *                                 comparison structurally cannot: a source that
 *                                 edited a posting's *detail page* while leaving
 *                                 its index row byte-identical. Also ages
 *                                 `missCount` for anything quietly withdrawn.
 *
 * Off-the-hour minutes are deliberate. Every scheduled task in the world fires
 * at :00, and government portals are not generously provisioned.
 */

import cron from 'node-cron';

const DEFAULTS = {
  change: process.env.CRON_SCHEDULE || '*/30 * * * *',
  expiry: process.env.CRON_EXPIRY_SCHEDULE || '7 * * * *',
  deep: process.env.CRON_DEEP_SCHEDULE || '20 3 * * *',
};

/**
 * Starts the background schedulers.
 *
 * @param {object} options
 * @param {Function} options.runSync   Async `(trigger, {force}) => outcome`
 * @param {Function} options.runExpiry Async `() => result`
 * @param {boolean}  [options.runAtStartup=true] Check once on boot, so a freshly
 *   deployed server populates immediately instead of waiting for the first tick.
 * @param {string}   [options.timezone]
 */
export function startJobTicker({
  runSync,
  runExpiry,
  runAtStartup = process.env.SYNC_ON_STARTUP !== 'false',
  timezone = process.env.CRON_TIMEZONE || 'Asia/Kolkata',
}) {
  const tasks = [];

  const register = (label, expression, handler) => {
    if (!expression) return;
    if (!cron.validate(expression)) {
      console.warn(`[cron] Invalid ${label} schedule "${expression}" — that schedule is disabled`);
      return;
    }
    tasks.push(cron.schedule(expression, handler, { timezone }));
    console.log(`[cron] ${label} → "${expression}" (${timezone})`);
  };

  register('change-check', DEFAULTS.change, () => {
    runSync('cron:change-check').then((outcome) => {
      if (!outcome.ok) console.error('[cron] change-check failed:', outcome.message);
    });
  });

  register('expiry', DEFAULTS.expiry, () => {
    Promise.resolve(runExpiry())
      .catch((error) => console.error('[cron] expiry failed:', error.message));
  });

  register('deep reconcile', DEFAULTS.deep, () => {
    runSync('cron:deep-reconcile', { force: true }).then((outcome) => {
      if (!outcome.ok) console.error('[cron] deep reconcile failed:', outcome.message);
    });
  });

  if (runAtStartup) {
    // Deferred a few seconds so the HTTP listener is already accepting requests
    // — a boot-time sweep must not delay readiness.
    setTimeout(() => {
      runSync('startup').then((outcome) => {
        if (!outcome.ok) console.error('[cron] startup sync failed:', outcome.message);
      });
    }, 3_000);
  }

  return tasks;
}

export default { startJobTicker };
