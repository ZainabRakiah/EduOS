import { sha1, normalizeForHash } from '../utils/hash.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';

/**
 * Site Registry
 * ─────────────
 * One declarative entry per portal. Everything site-specific lives here so the
 * extraction, change-detection and normalization code stays generic.
 *
 * Each entry declares:
 *   id, name, department   Provenance written onto every job from this site.
 *   adapter               Which extractor drives it — see ADAPTERS below.
 *   url                   Listing index.
 *   engine                'cheerio' (static HTML) or 'none' (no HTML at all — a
 *                         JSON API). No entry needs a browser: every one of the
 *                         five sources serves its listing without JavaScript,
 *                         which is why Playwright was dropped entirely.
 *   insecureTLS           Skip cert verification for THIS host only.
 *   pagination            How to walk multiple index pages.
 *   listing               Row selector + declarative field map.
 *   identity              Resolves a row to a stable externalId.
 *   detail                Whether the row needs a follow-up page fetch.
 *   filters               Row-level accept/reject.
 *
 * ── Field map vocabulary ──────────────────────────────────────────────────
 *   { sel }            CSS selector, relative to the row; takes text
 *   { col }            Zero-based table-cell index (table adapters)
 *   { attr }           Read an attribute instead of text
 *   { as }             Coercion: 'date' | 'deadline' | 'text' | 'int'
 *   { map }            Value lookup table, applied after text extraction
 *   { const }          Fixed value, no extraction
 *
 * ── Why these five, and why these URLs ────────────────────────────────────
 * NCS was dropped: it is an Angular SPA where every route returns the same
 * shell and the underlying API returns AES-encrypted payloads.
 *
 * UPSC's recruitment source was repointed. The previous entry scraped
 * `/recruitment/recruitment-advertisements` (plural), which live probing showed
 * to be a dead 2011-2017 archive of answer keys, cut-off marks, results and
 * question papers — `Electronics_20112016_1.pdf`, `APFC_Cutoff_0.pdf`,
 * `AnsKey_12_StoresOfcr_0.pdf` — containing zero current vacancies and carrying
 * no date field at all. The live source is `/recruitment/recruitment-advertisement`
 * (singular), which lists the current advertisement booklets; the actual
 * vacancy details live inside those PDFs. See the `upsc-advertisements` entry.
 */

/** Adapter names, so a typo fails loudly instead of silently skipping a site. */
export const ADAPTERS = {
  /** Cheerio/Playwright over repeated row blocks. */
  HTML_ROWS: 'htmlRows',
  /** Cheerio over an HTML <table>, fields addressed by column index. */
  HTML_TABLE: 'htmlTable',
  /** JSON REST endpoints. */
  API: 'api',
  /** Listing of advertisement PDFs; each PDF contains many vacancies. */
  PDF_ADVERT: 'pdfAdvert',
};

/** Words UPSC writes vacancy counts in ("Eighty vacancies for the post of…"). */
export const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};

export const SITE_REGISTRY = [
  // ── 1. UPSC advertisements ────────────────────────────────────────────────
  // Two-stage: the index lists advertisement booklets, and each booklet PDF
  // contains many individually-numbered vacancies. Verified live against
  // AdvtNo-10-2026-Engl-070826.pdf — 52 pages, 7 vacancies, real extractable
  // text (not a scan), every field the UI needs present and labelled.
  {
    id: 'upsc-advertisements',
    name: 'UPSC Recruitment Advertisements',
    department: 'Union Public Service Commission (UPSC)',
    portalUrl: 'https://www.upsc.gov.in/',
    adapter: ADAPTERS.PDF_ADVERT,
    engine: 'cheerio',
    url: 'https://www.upsc.gov.in/recruitment/recruitment-advertisement',
    pagination: { mode: 'none' },

    listing: {
      blocks: '.view-content .views-row',
      fields: {
        advertNumber: { sel: '.views-field-field-advertisement-number' },
        notificationPdfUrl: { sel: 'a[href]', attr: 'href' },
      },
    },

    /**
     * Each vacancy inside a booklet carries its own stable UPSC vacancy
     * number, e.g. `(Vacancy No. 26081001608)`. That is a far better identity
     * than the PDF filename: it survives the booklet being re-uploaded with a
     * new date suffix, and it is unique per post rather than per document.
     */
    pdfAdvert: {
      /** Splits the booklet text into one segment per vacancy. */
      vacancySplit: /(?=\d{1,2}\.\s*\(Vacancy No\.\s*[0-9A-Za-z]+\))/,
      vacancyId: /\(Vacancy No\.\s*([0-9A-Za-z]+)\)/,

      /**
       * Where a vacancy segment stops.
       *
       * Splitting alone bounds every segment except the last, which runs on
       * into the booklet's shared sections — measured at 44,866 chars against a
       * typical 4,217. That tail contains an "EXPERIENCE" mention inside the
       * age-concessions boilerplate, which was being extracted as the final
       * post's experience requirement. Cutting here also keeps the AI prompt
       * from being handed 40 KB of instructions common to every post.
       */
      segmentEnd:
        /\b(?:INSTRUCTIONS AND INFORMATION TO CANDIDATES|HOW TO APPLY|LAST DATE FOR SUBMISSION OF APPLICATIONS|CONCESSIONS\s*&\s*RELAXATIONS)\b/,

      /**
       * "Nine vacancies for the post of Assistant Executive Engineer
       *  (Electronics) in Directorate General of Lighthouses and Lightships,
       *  Ministry of Ports, Shipping and Waterways."
       */
      heading:
        /\(Vacancy No\.\s*[0-9A-Za-z]+\)\s*([A-Za-z-]+)\s+vacanc(?:y|ies)\s+for\s+the\s+post\s+of\s+([^.]+)\./i,

      /**
       * Labels that open a field within a vacancy segment, tried in order.
       *
       * `qualifications` prefers the nested `(A) EDUCATIONAL:` heading over the
       * outer `ESSENTIAL QUALIFICATIONS:`, because the outer one wraps both the
       * educational and the experience requirement — reading it whole would put
       * the experience text into the qualifications field as well as its own.
       */
      labels: {
        salary: ['PAY SCALE'],
        qualifications: [
          'EDUCATIONAL',
          'ESSENTIAL QUALIFICATIONS',
          'MINIMUM ESSENTIAL QUALIFICATIONS',
        ],
        desirable: ['DESIRABLE QUALIFICATIONS'],
        experience: ['EXPERIENCE'],
        responsibilities: ['DUTIES'],
        location: ['HEADQUARTERS'],
        // Booklets use both spellings: "AGE LIMITS:" in Advt 52, bare "AGE:"
        // in Advt 10. Longest first so "AGE" cannot shadow "AGE LIMITS".
        ageLimit: ['AGE LIMITS', 'AGE LIMIT', 'AGE'],
        reservation: ['RESERVATION POSITION'],
        probation: ['PROBATION'],
        otherDetails: ['OTHER DETAILS', 'ANY OTHER CONDITIONS', 'ANY OTHER CONDITION'],
      },

      /**
       * The complete top-level heading vocabulary inside a vacancy segment.
       * Any value ends where the next of these begins. Deliberately explicit:
       * `PAY SCALE:` is immediately followed by `AGE:`, which a generic
       * "next long ALL-CAPS run" boundary is too short to catch, so pay scale
       * would otherwise absorb the entire age-relaxation paragraph.
       *
       * Nested sub-labels are intentionally absent, except `EXPERIENCE` — it is
       * both a field of its own and the boundary that ends the educational
       * qualification.
       */
      stopLabels: [
        'RESERVATION POSITION',
        'PAY SCALE',
        'AGE LIMITS',
        'AGE LIMIT',
        'AGE',
        'ESSENTIAL QUALIFICATIONS',
        'MINIMUM ESSENTIAL QUALIFICATIONS',
        'DESIRABLE QUALIFICATIONS',
        'EDUCATIONAL',
        'EXPERIENCE',
        'DUTIES',
        'OTHER DETAILS',
        'ANY OTHER CONDITIONS',
        'ANY OTHER CONDITION',
        'PROBATION',
        'HEADQUARTERS',
        'NOTE',
        'NOTE-I',
        'NOTE-II',
        'NOTE-III',
        'IMPORTANT',
      ],

      /**
       * A booklet can state more than one closing date, scoped by which posts
       * it applies to. Advt 10-2026 reads:
       *
       *   "CLOSING DATE ... IS 1800 HRS ON 28-08-2026 (FOR POSTS OTHER THAN
       *    THOSE UNDER THE ADMINISTRATION OF UT OF LADAKH) AND 04-09-2026
       *    (FOR POSTS UNDER THE ADMINISTRATION OF UT OF LADAKH)."
       *
       * Two of its seven vacancies are Ladakh posts. Applying the first date
       * to all seven would delete those two a week before they actually close,
       * so the scope qualifier has to be honoured rather than ignored.
       */
      deadline: {
        sentence: /CLOSING DATE FOR SUBMISSION[^.]*\./i,
        /** Each date in the sentence, with the parenthesised scope after it. */
        scoped: /(\d{3,4}\s*HRS\s*ON\s*)?(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s*(?:\(([^)]*)\))?/gi,
        /**
         * Given a scope string, decides whether it applies to a vacancy
         * segment. Returns true for the unqualified/default date.
         */
        appliesTo(scope, vacancyText) {
          if (!scope) return true;
          const s = scope.toLowerCase();
          const mentionsLadakh = /ladakh/i.test(vacancyText);
          if (/other than/.test(s)) return !mentionsLadakh;
          if (/ladakh/.test(s)) return mentionsLadakh;
          return true;
        },
      },

      /** Stated inside every booklet as the place applications are filed. */
      applicationUrl: 'https://upsconline.nic.in/ora/',
    },

    identity: (row) => row.vacancyId || null,
    detail: { enabled: false },
  },

  // ── 2. UPSC active examinations ───────────────────────────────────────────
  // Rows carry the exam name and a relative link only — no dates — so the
  // deadline has to come from the detail page.
  {
    id: 'upsc-active-exams',
    name: 'UPSC Active Examinations',
    department: 'Union Public Service Commission (UPSC)',
    portalUrl: 'https://www.upsc.gov.in/',
    adapter: ADAPTERS.HTML_ROWS,
    engine: 'cheerio',
    url: 'https://www.upsc.gov.in/examinations/active-exams',
    pagination: { mode: 'none' },

    listing: {
      blocks: '.view-content .views-row',
      fields: {
        title: { sel: '.views-field-field-exam-name' },
        applicationUrl: { sel: '.views-field-field-exam-name a[href]', attr: 'href' },
      },
    },

    /** Exam slug from the URL path — stable across re-listings. */
    identity: (row) => {
      if (!row.applicationUrl) return null;
      const path = row.applicationUrl.split('?')[0].replace(/\/+$/, '');
      const slug = path.split('/').pop() || '';
      try {
        return sha1(normalizeForHash(decodeURIComponent(slug))) || null;
      } catch {
        return sha1(normalizeForHash(slug)) || null;
      }
    },

    detail: {
      enabled: true,
      /**
       * Labels to search the detail page for, in preference order.
       *
       * The exam pages write "Last Date for Receipt of Applications", which the
       * previous list did not contain — so every deadline came back null even
       * though it was sitting in the page text.
       */
      deadlineLabels: [
        'Last Date for Receipt of Applications',
        'Last Date for Receipt of Application',
        'Last Date for Submission of Online Application',
        'Last Date of Application',
        'Last Date to Apply',
        'Closing Date',
        'Last Date',
      ],

      /**
       * Deliberately NOT including "Date of Commencement": on these pages that
       * reads "Date of Commencement of Examination", which is when the exam is
       * sat, not when applications open. Storing it as the application start
       * date would show users a window that has nothing to do with applying.
       */
      startLabels: [
        'Date of Notification',
        'Opening Date',
        'Application Start',
      ],

      /**
       * Matched against both the anchor text and the filename. Filename matters
       * more than label here: UPSC labels its notification link with the file
       * size — the CDS-II 2026 anchor text is literally "(1.64 MB)" — so label
       * matching alone cannot find it, while the filename is `Notif-CDS-II-...`.
       */
      pdfLabels: ['Notif', 'Advt', 'Advertisement', 'Notice'],

      /**
       * Exam pages link several PDFs and most are not the vacancy notice.
       * Observed live: `FR-` (final result), `TT-` (time table), `PressNote-`,
       * `WindowCAF-`, `QP-` (question paper), `AF-Notice` (additional
       * facility), plus answer keys and cut-offs. Without this the extractor
       * picked `FR-CDSE-II-2025-OTA-Engl-070826.pdf` — a results document — as
       * the notification for a job posting.
       */
      pdfReject:
        /(?:^|\/)(?:FR|TT|QP|AF|RESULT|WRITTENRESULT|ANSKEY|CUTOFF|PRESSNOTE|WINDOWCAF|MARKS|SCORE)[-_]|(?:result|answer[-_]?key|cut[-_]?off|time[-_]?table|press[-_]?note|marksheet|question[-_]?paper)/i,

      /**
       * A row must produce either a deadline or a notification PDF to count as
       * a job posting. UPSC's "active examinations" list includes exams whose
       * application window has long closed and which now link only a result
       * document — CDS-II 2025 (OTA) is one. Those are exam processes, not
       * openings, and inserting them would put uncloseable rows in the DB with
       * no deadline to ever expire them.
       */
      requireEvidence: true,
    },
  },

  // ── 3. SSC — Staff Selection Commission ───────────────────────────────────
  // A clean unauthenticated JSON API, so no browser is involved. This replaces
  // the previous Playwright entry, which spent ~30 s to return 27 nav-menu
  // links and zero jobs.
  //
  // The notice board answers with a weak ETag and honours conditional GET, so
  // this site gets Tier-0 change detection for free.
  {
    id: 'ssc',
    name: 'Staff Selection Commission',
    department: 'Staff Selection Commission (SSC)',
    portalUrl: 'https://ssc.gov.in/',
    adapter: ADAPTERS.API,
    engine: 'none',
    url: 'https://ssc.gov.in/api/general-website/portal/notice-boards',
    pagination: { mode: 'none' },

    api: {
      /**
       * Endpoint paths were re-derived from the site's own Angular bundle after
       * the previously-configured ones started returning 404. Two corrections:
       * the notice board is NOT under `/api/admin/5.1/` but under
       * `/api/general-website/portal/`, and it rejects a bare GET with
       * `{"error":"Query params are missing"}` — the full query below is
       * mandatory, copied from the bundle's own call site.
       *
       * `ssc-calendar` is deliberately absent. It exists and returns 200, but
       * probing showed it ignores `year` and replies with the same cached
       * notice-board payload (`isCache: true`, identical first item), so it
       * contributes nothing an extra request could justify.
       */
      endpoints: {
        notices: 'https://ssc.gov.in/api/general-website/portal/notice-boards',
        exams: 'https://ssc.gov.in/api/admin/5.1/allExams',
      },

      /**
       * The exact parameter set the site sends. `attributes` is a server-side
       * field allowlist — an unknown name is refused with
       * `{"error":"Invalid attributes in request","attribute":["heading"]}`, so
       * this list is not free to embellish.
       */
      noticeQuery: {
        page: '1',
        limit: '100',
        contentType: 'notice-boards',
        key: 'createdAt',
        order: 'DESC',
        isAttachment: 'true',
        language: 'english',
        attributes:
          'id,headline,examId,contentType,redirectUrl,startDate,endDate,language,createdAt',
      },

      /**
       * Attachment paths come back Windows-style and relative:
       *   "uploads\\masterData\\NoticeBoards\\foo.pdf"
       *     → /api/attachment/uploads/masterData/NoticeBoards/foo.pdf
       * Confirmed live: both current vacancy notices resolve and download.
       */
      attachmentBase: 'https://ssc.gov.in/api/attachment/',

      /**
       * The notice board is overwhelmingly post-exam administration: of 15 live
       * items, 12 were results, answer keys, allocation rounds and identity
       * verifications, and only 2 were vacancies. Without this filter
       * "Declaration of Final Result" is ingested as a job.
       *
       * `recommended candidates` and the allocation/verification terms were
       * added after a live false positive — "Notice for recommended candidates
       * of Combined Hindi Translators Examination … for appearing in Physical
       * Endurance Test" passed the accept pattern via the word "post".
       */
      rejectTitle:
        /\b(result|answer\s*key|cut[\s-]*off|marks|scorecard|score\s*card|recommended\s+candidates|identity\s+verification|tentative\s+(?:allocation|vacancy|answer)|allocation|frta|physical\s+endurance|pet\s*\/\s*pst|skill\s+test|document\s+verification|declaration|uploading|corrigendum|status\s*of|list\s*of\s*(?:candidates|qualified)|withdraw|schedule\s+of)\b/i,

      /**
       * Bare `post` was too loose — it is what let the false positive above
       * through. The accepted forms are the ones SSC actually uses to announce
       * a vacancy.
       */
      acceptTitle:
        /\b(?:filling\s+up|recruitment|vacanc|notice\s+of\s+examination|examination\s+notice|advertisement|ex[-\s]?cadre\s+post|post\s+of|applications?\s+(?:are\s+)?invited|deputation\s+basis)\b/i,

      /**
       * SSC states the whole posting in the headline:
       *   "Filling up 04 ex-cadre post of Accounts Officer in Regional Offices
       *    of SSC on deputation basis"
       * → 4 vacancies, Accounts Officer, Regional Offices of SSC, deputation.
       *
       * This matters more than usual here: the linked PDFs are scanned images
       * (2.4 MB / 9 pages → 116 characters of text), so the headline is the
       * only machine-readable description that exists for these postings.
       */
      headlinePattern:
        /^\s*filling\s+up\s+(?:of\s+)?(\d+)\s+(?:ex[-\s]?cadre\s+)?posts?\s+of\s+(.+?)(?:\s+in\s+(.+?))?(?:\s+on\s+(deputation|contract|absorption|direct\s+recruitment)\b.*)?$/i,
    },

    identity: (row) => row.externalId || null,
    detail: { enabled: false },
  },

  // ── 4. IBPS — Institute of Banking Personnel Selection ────────────────────
  // Previously configured as `dynamic` and driven through Playwright. The
  // `.detail-section` blocks are in fact present in the static HTML (13 blocks
  // in a 112 KB response), so Cheerio is sufficient and the browser launch was
  // pure overhead.
  //
  // IBPS is the ONE portal whose certificate chain does not verify ("unable to
  // verify the first certificate"), which is why `insecureTLS` is a per-site
  // flag: UPSC, SSC and Employment News all verify normally and keep real
  // verification, instead of the old global `rejectUnauthorized: false`.
  {
    id: 'ibps-recruitment',
    name: 'IBPS Bank Recruitment',
    department: 'Institute of Banking Personnel Selection (IBPS)',
    portalUrl: 'https://www.ibps.in/',
    adapter: ADAPTERS.HTML_ROWS,
    engine: 'cheerio',
    insecureTLS: true,
    url: 'https://www.ibps.in/index.php/recruitment/',
    pagination: { mode: 'none' },

    listing: {
      blocks: '.detail-section',
      fields: {
        organization: { sel: '.detail-first-heading' },
        title: { sel: '.detail-second-heading' },
      },
      /**
       * The two dates sit in unclassed children of `.detail-heading` with no
       * distinguishing selector, under a header row reading "Starts From
       * Ends On". They are therefore read positionally from the block text —
       * first date is the start, second is the deadline — which is more robust
       * than nth-child against a layout that carries no semantic markup.
       */
      orderedDates: {
        container: '.detail-heading',
        assign: ['applicationStartDate', 'applicationDeadline'],
      },
    },

    /**
     * IBPS blocks contain zero anchors, so there is no URL to key on and no
     * per-job link to offer. Identity is the org + post pair; the application
     * URL falls back to the listing page itself.
     */
    identity: (row) =>
      row.organization && row.title
        ? sha1(normalizeForHash(`${row.organization}|${row.title}`))
        : null,

    fallbackApplicationUrl: 'https://www.ibps.in/index.php/recruitment/',
    detail: { enabled: false },
  },

  // ── 5. Employment News ────────────────────────────────────────────────────
  // ASP.NET GridView with five clean columns, confirmed live:
  //   ["ISSUED DATE (MM/DD/YYYY)", "ORGANISATION", "POST",
  //    "METHOD OF APPOINTMENT", "LAST DATE (DD/MM/YYYY)"]
  //
  // The previous entry read `td:first-child` as the title — that is the DATE
  // column, which collapsed 11 distinct jobs into 4 duplicate fingerprints and
  // then lost most of them to a unique-index collision.
  //
  // The site's own header labels column 0 as MM/DD while its data is DD/MM.
  // parseDate is day-first with a month-first fallback only when day-first is
  // an impossible calendar date, so both readings land correctly.
  {
    id: 'employment-news',
    name: 'Employment News',
    department: 'Government of India — Employment News',
    portalUrl: 'https://employmentnews.gov.in/',
    adapter: ADAPTERS.HTML_TABLE,
    engine: 'cheerio',
    url: 'https://employmentnews.gov.in/NewEmp/AllJobs.aspx?k=All',
    pagination: { mode: 'none' },

    listing: {
      blocks: 'table tr',
      skipHeaderRow: true,
      /**
       * The header row is a plain `<tr>` of five `<td>`s — no `<th>`, no
       * `<thead>`, no class, distinguished only by inline `font-weight:bold`.
       * Structural detection cannot see it, so its wording is declared here.
       * Both phrases appear only in the header: the data rows carry a date, an
       * organisation name and "Recruitment"/"Contractual" in these columns.
       */
      headerPattern: /ISSUED\s*DATE|METHOD\s+OF\s+APPOINTMENT/i,
      minCells: 5,
      fields: {
        postedAt: { col: 0, as: 'date' },
        organization: { col: 1 },
        title: { col: 2 },
        employmentType: {
          col: 3,
          map: {
            recruitment: 'permanent',
            contractual: 'contractual',
            contract: 'contractual',
            deputation: 'deputation',
            'direct recruitment': 'permanent',
            internship: 'internship',
            temporary: 'temporary',
          },
        },
        applicationDeadline: { col: 4, as: 'deadline' },
      },
    },

    /** No per-row links exist, so identity is content-derived. */
    identity: (row) =>
      row.organization && row.title
        ? sha1(normalizeForHash(`${row.organization}|${row.title}|${row.postedAtRaw || ''}`))
        : null,

    fallbackApplicationUrl: 'https://employmentnews.gov.in/NewEmp/AllJobs.aspx?k=All',
    detail: { enabled: false },
  },
];

/**
 * Builds the globally-unique key for a listing.
 *
 * Falls back through: site resolver → normalized URL → title+department, so a
 * row missing its preferred identifier still gets a stable key rather than
 * being dropped or, worse, colliding with another row.
 */
export function buildIdentityKey(site, row) {
  let externalId = null;

  try {
    externalId = site.identity?.(row) || null;
  } catch {
    externalId = null;
  }

  if (!externalId && row.applicationUrl) {
    externalId = sha1(normalizeUrl(row.applicationUrl, site.url));
  }

  if (!externalId && row.title) {
    externalId = sha1(normalizeForHash(`${row.title}|${site.department}`));
  }

  return externalId ? `${site.id}:${externalId}` : null;
}

/** Lookup by id, used by the sync orchestrator and the ops sync route. */
export function getSite(siteId) {
  return SITE_REGISTRY.find((site) => site.id === siteId) || null;
}

export default SITE_REGISTRY;
