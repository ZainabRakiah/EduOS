/**
 * Date Parsing
 * ────────────
 * Turns the free-text dates Indian government portals publish into real
 * Date objects, which is what makes deadline-based expiry possible.
 *
 * Formats observed live across the five portals:
 *   24/08/2026              DD/MM/YYYY          (Employment News)
 *   25-Aug-2026             DD-MMM-YYYY         (IBPS)
 *   2026-08-25T12:18:21Z    ISO-8601            (SSC API)
 *   11/06/2026 - 6:00pm     DD/MM/YYYY - h:mma  (UPSC active exams)
 *   1800 HRS ON 28-08-2026  HHMM hrs on DD-MM-YYYY (UPSC advertisement PDFs)
 *   15 March 2026           D Month YYYY        (prose / PDFs)
 *
 * Note the UPSC PDF form writes the time BEFORE the date, so the time search
 * cannot be suffix-only — see `applyTime`.
 *
 * Deliberately hand-rolled rather than using a date library: these sources
 * are unambiguously DD/MM (never MM/DD), and a locale-guessing parser would
 * silently read 11/06 as 6 November. Getting this backwards would delete
 * live jobs, so the ordering is pinned explicitly.
 *
 * All dates are interpreted in IST (UTC+05:30, no DST) because that is the
 * timezone every one of these portals publishes in.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const MONTH_NAMES = Object.keys(MONTHS).join('|');

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

/**
 * Builds a Date from IST calendar components, validating that the
 * components describe a real day (rejects 31/02, 32/01, month 13, …).
 */
function istDate(year, monthIndex, day, hour = 0, minute = 0, second = 0, ms = 0) {
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  const utcMs = Date.UTC(year, monthIndex, day, hour, minute, second, ms) - IST_OFFSET_MS;
  const candidate = new Date(utcMs);
  if (Number.isNaN(candidate.getTime())) return null;

  // Round-trip the calendar day to reject overflow like 31 February,
  // which Date.UTC would silently roll forward into March.
  const check = new Date(utcMs + IST_OFFSET_MS);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== monthIndex ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
}

function expandTwoDigitYear(raw) {
  const n = Number(raw);
  if (raw.length === 4) return n;
  // Job deadlines are near-present; 00-79 → 2000s, 80-99 → 1900s.
  return n < 80 ? 2000 + n : 1900 + n;
}

/** "1800 HRS", "0900 hrs" — the only time format UPSC advertisements use. */
const MILITARY_TIME = /\b(\d{1,2})(\d{2})\s*(?:hrs?|hours)\b/i;

/**
 * A time written BEFORE the date, as UPSC does: "1800 HRS ON 28-08-2026".
 * Anchored to the end of the preceding text and required to be joined by
 * "on"/"by", so an unrelated time elsewhere in the block is not picked up.
 */
const PRECEDING_MILITARY = /\b(\d{1,2})(\d{2})\s*(?:hrs?|hours)\.?\s*(?:on|by)\s*$/i;
const PRECEDING_CLOCK = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\.?\s*(?:on|by)\s*$/i;

function parseTimeSuffix(text) {
  // Military time first: "HRS" is explicit and cannot be confused with a
  // date separator, unlike the bare-digit forms below.
  const military = text.match(MILITARY_TIME);
  if (military) {
    const hour = Number(military[1]);
    const minute = Number(military[2]);
    if (hour <= 23 && minute <= 59) return { hour, minute };
  }

  // "6:00pm", "6 pm", "17:30", "11.59 PM"
  //
  // A dot separator is only accepted alongside an explicit meridiem: without
  // that guard "01.01.2027" yields a phantom 01:01 from the date's own dots.
  const match = text.match(
    /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\.(\d{2})\s*(am|pm)\b|\b(\d{1,2})\s*(am|pm)\b/i
  );
  if (!match) return null;

  let hour;
  let minute = 0;
  let meridiem;

  if (match[1] !== undefined) {
    hour = Number(match[1]);
    minute = Number(match[2]);
    meridiem = match[3];
  } else if (match[4] !== undefined) {
    hour = Number(match[4]);
    minute = Number(match[5]);
    meridiem = match[6];
  } else {
    hour = Number(match[7]);
    meridiem = match[8];
  }

  if (meridiem) {
    const lower = meridiem.toLowerCase();
    if (lower === 'pm' && hour < 12) hour += 12;
    if (lower === 'am' && hour === 12) hour = 0;
  }

  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Extracts the first parseable date from a block of text.
 *
 * @param {string} input
 * @returns {{ date: Date, hasTime: boolean }|null}
 */
function parseFirst(input) {
  const text = (input || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // ── ISO-8601 (SSC API) ────────────────────────────────────────────────
  // Already carries an explicit offset or Z, so hand it to Date directly.
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})/);
  if (iso) {
    const parsed = new Date(iso[0]);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      if (year >= MIN_YEAR && year <= MAX_YEAR) {
        return { date: parsed, hasTime: true };
      }
    }
  }

  // ── Bare ISO date: YYYY-MM-DD ─────────────────────────────────────────
  const isoDate = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) {
    const date = istDate(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    if (date) return { date, hasTime: false };
  }

  // ── DD-MMM-YYYY / DD Month YYYY (IBPS, prose) ─────────────────────────
  const named = text.match(
    new RegExp(`\\b(\\d{1,2})\\s*[-/\\s.]\\s*(${MONTH_NAMES})\\s*[-/\\s.,]\\s*(\\d{2,4})\\b`, 'i')
  );
  if (named) {
    const date = istDate(
      expandTwoDigitYear(named[3]),
      MONTHS[named[2].toLowerCase()],
      Number(named[1])
    );
    if (date) return applyTime(date, text, named);
  }

  // ── Month DD, YYYY ────────────────────────────────────────────────────
  const monthFirst = text.match(
    new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{2,4})\\b`, 'i')
  );
  if (monthFirst) {
    const date = istDate(
      expandTwoDigitYear(monthFirst[3]),
      MONTHS[monthFirst[1].toLowerCase()],
      Number(monthFirst[2])
    );
    if (date) return applyTime(date, text, monthFirst);
  }

  // ── DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ────────────────────────────────
  // Day-first is pinned deliberately — see the module header.
  const numeric = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = expandTwoDigitYear(numeric[3]);

    let date = istDate(year, month - 1, day);

    // If day-first is impossible the source broke its own convention
    // (e.g. 08/24/2026). Accept the only valid reading rather than
    // discarding the date entirely.
    if (!date) {
      date = istDate(year, day - 1, month);
    }

    if (date) return applyTime(date, text, numeric);
  }

  return null;
}

/**
 * Attaches a clock time to a parsed date.
 *
 * Looks first at the text FOLLOWING the date match, so the date's own
 * separators cannot be misread as a time. If nothing is found there, it
 * checks whether a time immediately PRECEDES the date joined by "on"/"by" —
 * UPSC writes "1800 HRS ON 28-08-2026", where a suffix-only search finds
 * nothing and the deadline would silently default to end-of-day.
 *
 * @param {Date} date
 * @param {string} text  - The full text the date was found in
 * @param {RegExpMatchArray} match - The date match, for its position
 */
function applyTime(date, text, match) {
  const start = match.index ?? 0;
  const end = start + match[0].length;

  let time = parseTimeSuffix(text.slice(end));

  if (!time) {
    const before = text.slice(0, start);
    const military = before.match(PRECEDING_MILITARY);
    const clock = !military ? before.match(PRECEDING_CLOCK) : null;

    if (military) {
      const hour = Number(military[1]);
      const minute = Number(military[2]);
      if (hour <= 23 && minute <= 59) time = { hour, minute };
    } else if (clock) {
      let hour = Number(clock[1]);
      const minute = clock[2] ? Number(clock[2]) : 0;
      const meridiem = clock[3].toLowerCase();
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      if (hour <= 23 && minute <= 59) time = { hour, minute };
    }
  }

  if (!time) return { date, hasTime: false };

  const istMs = date.getTime() + IST_OFFSET_MS;
  const dayStart = new Date(istMs);
  const withTime = istDate(
    dayStart.getUTCFullYear(),
    dayStart.getUTCMonth(),
    dayStart.getUTCDate(),
    time.hour,
    time.minute
  );

  return withTime ? { date: withTime, hasTime: true } : { date, hasTime: false };
}

/**
 * Parses any date out of free text.
 *
 * @param {string} text
 * @returns {Date|null}
 */
export function parseDate(text) {
  const result = parseFirst(text);
  return result ? result.date : null;
}

/**
 * Parses an application deadline.
 *
 * When the source gives only a calendar day, the deadline is taken as the
 * END of that day in IST — a job closing "24/08/2026" is still open all of
 * the 24th. Treating it as midnight would delete live jobs a day early.
 *
 * @param {string} text
 * @returns {Date|null}
 */
export function parseDeadline(text) {
  const result = parseFirst(text);
  if (!result) return null;
  if (result.hasTime) return result.date;

  const istMs = result.date.getTime() + IST_OFFSET_MS;
  const day = new Date(istMs);
  return istDate(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    23,
    59,
    59,
    999
  );
}

/**
 * Finds a date that follows one of the given labels, so "Last Date: 24/08/2026"
 * is preferred over an unrelated date elsewhere in the same block.
 *
 * @param {string} text
 * @param {string[]} labels - Label fragments, matched case-insensitively
 * @returns {Date|null}
 */
export function findLabeledDeadline(text, labels) {
  const source = (text || '').replace(/\s+/g, ' ');
  if (!source) return null;

  for (const label of labels) {
    const pattern = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^A-Za-z0-9]{0,12}([^|\\n]{0,40})`,
      'i'
    );
    const match = source.match(pattern);
    if (match?.[1]) {
      const parsed = parseDeadline(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

/** True when the deadline has passed. Absent deadlines are never expired. */
export function isExpired(deadline, now = new Date()) {
  if (!deadline) return false;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < now.getTime();
}

export default { parseDate, parseDeadline, findLabeledDeadline, isExpired };
