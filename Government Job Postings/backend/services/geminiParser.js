/**
 * Gemini Narrative Enrichment
 * ───────────────────────────
 * Asks the model for **only what deterministic extraction cannot produce**.
 *
 * Previously this file asked Gemini for everything — title, department,
 * qualification, vacancies, salary, age limit, PDF URL, location, deadline —
 * for every listing on every sync. That was the wrong division of labour twice
 * over. Those fields are *stated* on the page in labelled form, so a selector or
 * a regex reads them exactly, for free, deterministically and identically on
 * every run; handing them to a language model instead introduced variance into
 * values that feed a content hash, which means the same unchanged posting could
 * hash differently between runs and trigger a pointless write.
 *
 * What genuinely needs a model is the prose: a 52-page UPSC booklet states duties
 * and required experience in paragraphs with no label to anchor on. So this file
 * now returns five narrative fields and nothing else. Everything structured is
 * already resolved by the time this is called, and is never overwritten by it.
 *
 * ── Rate limiting ──
 * The old pipeline slept 4 s before *every* listing, whether or not it was going
 * to call the API — roughly 8.6 minutes of `setTimeout` per sync, on the main
 * path, blocking scraping too. Here the limiter guards the API call alone: work
 * for other sites proceeds while a call waits its turn, and calls are only made
 * for new or changed postings, so a steady-state sweep makes zero of them.
 */

import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45_000;

/** Requests per minute. The free tier for flash-lite allows 15. */
const GEMINI_RPM = Number(process.env.GEMINI_RPM) || 15;

/**
 * Hard ceiling on calls per sync run.
 *
 * A first run against an empty database has every posting to enrich at once.
 * Without a cap that is one long serialized queue; with it, the run finishes and
 * the remainder is picked up by the next sweep, which will still see those
 * postings as needing enrichment. Progress is incremental either way.
 */
const GEMINI_MAX_CALLS_PER_RUN = Number(process.env.GEMINI_MAX_CALLS_PER_RUN) || 40;

/** Text below this length cannot contain a usable description. */
const MIN_TEXT_CHARS = 400;

/** Prompt input cap. Enough for a full detail page or a booklet segment. */
const MAX_PROMPT_CHARS = 14_000;

const NARRATIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description:
        'Two to four sentences describing the role in plain English, written for a job seeker. Empty string if the text does not describe the role.',
    },
    responsibilities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Duties or job functions, one per item, as stated. Empty array if not stated.',
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Specific skills, technologies or competencies named in the text. Empty array if none are named. Do not restate educational degrees here.',
    },
    experience: {
      type: Type.STRING,
      description:
        'Required work experience exactly as stated (e.g. "5 years in a supervisory capacity"). Empty string if not stated.',
    },
    workMode: {
      type: Type.STRING,
      description:
        'One of: onsite, hybrid, remote, unknown. Use "unknown" unless the text explicitly states the arrangement. An office address is NOT a statement of work mode.',
    },
  },
  required: ['description', 'responsibilities', 'skills', 'experience', 'workMode'],
};

const WORK_MODES = new Set(['onsite', 'hybrid', 'remote', 'unknown']);

let client;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Serializes calls at no more than `GEMINI_RPM` per minute.
 *
 * A promise chain rather than a sleep: awaiting a turn suspends only this call,
 * so a site whose rows need no enrichment is never delayed by one that does.
 */
const limiter = {
  interval: Math.ceil(60_000 / Math.max(1, GEMINI_RPM)),
  next: 0,
  callsThisRun: 0,

  reset() {
    this.callsThisRun = 0;
  },

  budgetLeft() {
    return Math.max(0, GEMINI_MAX_CALLS_PER_RUN - this.callsThisRun);
  },

  async take() {
    const now = Date.now();
    const at = Math.max(now, this.next);
    this.next = at + this.interval;
    this.callsThisRun += 1;
    const wait = at - now;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  },
};

export function resetAiBudget() {
  limiter.reset();
}

export function aiBudgetLeft() {
  return limiter.budgetLeft();
}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function buildPrompt(rawText, context) {
  return `You extract narrative detail from Indian government job and examination notifications.

Return ONLY these five things, taken from the text below. Never invent anything.
Leave a field empty ("" or []) when the text does not state it — an empty field is
correct and useful; a guessed one is not.

- description: 2-4 plain sentences about the role, for a job seeker.
- responsibilities: duties/functions as stated, one per item.
- skills: named skills, technologies or competencies. Not degrees.
- experience: required work experience, as stated.
- workMode: onsite | hybrid | remote | unknown. Default to "unknown" — these
  notifications almost never state a work arrangement, and an office address is
  not a statement of one.

Do NOT return the job title, organisation, qualification, salary, vacancy count,
age limit, dates or URLs. Those are already extracted from structured fields and
your answer would be discarded.

Post: ${context.title || 'unknown'}
Organisation: ${context.organization || context.department || 'unknown'}

Text:
---
${rawText.slice(0, MAX_PROMPT_CHARS)}
---`;
}

function sanitize(data) {
  const list = (value, max) =>
    Array.isArray(value)
      ? value
          .map((v) => String(v).replace(/\s+/g, ' ').trim())
          .filter((v) => v.length >= 3)
          .slice(0, max)
      : [];

  const mode = String(data.workMode || '').toLowerCase().trim();

  return {
    description: String(data.description || '').replace(/\s+/g, ' ').trim(),
    responsibilities: list(data.responsibilities, 12),
    skills: list(data.skills, 15),
    experience: String(data.experience || '').replace(/\s+/g, ' ').trim(),
    workMode: WORK_MODES.has(mode) ? mode : 'unknown',
  };
}

/**
 * Fills narrative fields on a row from its accumulated text.
 *
 * Mutates and returns `row`. Structured values already present are never
 * touched. A failure is recorded on the row and swallowed — a posting with a
 * real title, deadline and URL but no prose description is still worth showing,
 * and losing it to an API hiccup would be strictly worse.
 *
 * @param {object} row Extractor row carrying `rawText`
 * @param {object} context { title, organization, department }
 * @returns {Promise<object>} row
 */
export async function enrichNarrative(row, context = {}) {
  const text = row.rawText || '';

  // Already complete from deterministic extraction — nothing to ask for.
  const needs =
    !row.description ||
    !row.responsibilities?.length ||
    !row.skills?.length ||
    !row.experience;

  if (!needs) return row;

  if (text.length < MIN_TEXT_CHARS) {
    row.aiSkipped = 'insufficient text';
    return row;
  }
  if (!isAiConfigured()) {
    row.aiSkipped = 'GEMINI_API_KEY not set';
    return row;
  }
  if (limiter.budgetLeft() <= 0) {
    row.aiSkipped = 'per-run AI budget exhausted';
    return row;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    await limiter.take();

    const response = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(text, { ...context, title: context.title || row.title }),
      config: {
        responseMimeType: 'application/json',
        responseSchema: NARRATIVE_SCHEMA,
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });

    if (!response.text) throw new Error('empty response');

    const parsed = sanitize(JSON.parse(response.text));

    if (!row.description && parsed.description) row.description = parsed.description;
    if (!row.responsibilities?.length && parsed.responsibilities.length) {
      row.responsibilities = parsed.responsibilities;
    }
    if (!row.skills?.length && parsed.skills.length) row.skills = parsed.skills;
    if (!row.experience && parsed.experience) row.experience = parsed.experience;
    if (!row.workMode && parsed.workMode !== 'unknown') row.workMode = parsed.workMode;

    row.extraction = { ...(row.extraction || {}), usedAi: true };
  } catch (error) {
    row.aiError =
      error.name === 'AbortError' ? `timed out after ${GEMINI_TIMEOUT_MS}ms` : error.message;
  } finally {
    clearTimeout(timeoutId);
  }

  return row;
}

export default { enrichNarrative, resetAiBudget, aiBudgetLeft, isAiConfigured };
