import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

/**
 * Dashboard
 * ─────────
 * The database is the single source of truth and the backend keeps it current on
 * its own schedule, so this component only ever *reads*. There is deliberately
 * no sync control: the previous "Sync Database" button made freshness the user's
 * responsibility, and a user who never pressed it saw stale data indefinitely.
 *
 * Freshness is instead handled two ways — a 60-second poll, and a revalidate on
 * window focus. The focus listener is the one that matters in practice: a
 * dashboard left open on a background tab for six hours should show current data
 * the moment it is looked at, not 60 seconds later.
 *
 * The API returns only active postings, so nothing here filters by deadline.
 */

const API_BASE = 'http://localhost:5000/api';

/** Poll interval. Sync runs every 30 min, so this is about promptness after one. */
const REFRESH_MS = 60_000;

const PORTAL_MAPPING = {
  'upsc-advertisements': 'UPSC',
  'upsc-active-exams': 'UPSC',
  ssc: 'SSC',
  'ibps-recruitment': 'IBPS',
  'employment-news': 'Employment News',
};

const PORTAL_FULL_NAMES = {
  UPSC: 'Union Public Service Commission',
  SSC: 'Staff Selection Commission',
  IBPS: 'Institute of Banking Personnel Selection',
  'Employment News': 'Employment News — Ministry of I&B',
};

const PORTAL_LOGOS = {
  UPSC: '🏛️',
  SSC: '📝',
  IBPS: '🏦',
  'Employment News': '📰',
};

const EMPLOYMENT_LABELS = {
  permanent: 'Permanent',
  contractual: 'Contractual',
  deputation: 'Deputation',
  internship: 'Internship',
  temporary: 'Temporary',
  unknown: null,
};

const WORK_MODE_LABELS = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
  unknown: null,
};

const NOT_SPECIFIED = 'Not specified';

/** True when a value is absent or the backend's explicit "unknown" sentinel. */
function isBlank(value) {
  return !value || value === NOT_SPECIFIED;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelative(value) {
  if (!value) return 'never';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'never';

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Days until a deadline, or null when no deadline is published. */
function daysLeft(value) {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function salaryLabel(salary) {
  if (!salary) return null;
  if (salary.min && salary.max) {
    return `₹${salary.min.toLocaleString('en-IN')} – ₹${salary.max.toLocaleString('en-IN')}`;
  }
  if (salary.payLevel) return salary.payLevel;
  if (salary.min) return `₹${salary.min.toLocaleString('en-IN')}`;
  return isBlank(salary.raw) ? null : salary.raw;
}

/**
 * Renders a location as one readable line.
 *
 * The containment check is not redundant with the equality check: UPSC writes
 * "Union Territory of Ladakh", which the backend splits into city="Union
 * Territory of Ladakh" and state="Ladakh". They are not equal, so a plain
 * inequality test printed "Union Territory of Ladakh, Ladakh".
 */
function locationLabel(location) {
  if (!location) return null;
  if (location.isPanIndia) return 'Across India';

  const city = location.city?.trim();
  const state = location.state?.trim();

  if (city && state) {
    const a = city.toLowerCase();
    const b = state.toLowerCase();
    if (a === b || a.includes(b)) return city;
    if (b.includes(a)) return state;
    return `${city}, ${state}`;
  }

  return city || state || (isBlank(location.raw) ? null : location.raw);
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState('Daily');

  /**
   * Loads jobs and freshness metadata.
   *
   * `quiet` suppresses the loading state for background refreshes — flashing a
   * spinner over a populated dashboard every 60 seconds reads as a fault.
   */
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [jobsRes, metaRes] = await Promise.all([
        fetch(`${API_BASE}/jobs?limit=100&sort=newest`),
        fetch(`${API_BASE}/meta`),
      ]);

      if (!jobsRes.ok) throw new Error(`Jobs request failed (${jobsRes.status})`);

      const jobsBody = await jobsRes.json();
      setJobs(jobsBody.data || []);
      if (metaRes.ok) setMeta(await metaRes.json());
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Automatic refresh: interval + focus revalidation. No user action required.
  useEffect(() => {
    const timer = setInterval(() => load(true), REFRESH_MS);
    const onFocus = () => load(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return jobs;

    return jobs.filter((job) => {
      const portal = PORTAL_MAPPING[job.source?.siteId] || '';
      const haystack = [
        job.title,
        job.organization,
        job.department,
        portal,
        job.location?.raw,
        job.qualifications?.join(' '),
        job.skills?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, searchQuery]);

  const groupedJobs = useMemo(
    () =>
      filteredJobs.reduce((acc, job) => {
        const portal = PORTAL_MAPPING[job.source?.siteId] || 'Others';
        (acc[portal] ||= []).push(job);
        return acc;
      }, {}),
    [filteredJobs]
  );

  const scrollRow = (id, direction) => {
    const container = document.getElementById(id);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  /** "New" means new to us within 24 h — driven by `firstSeenAt`, not hardcoded. */
  const isNew = (job) =>
    job.firstSeenAt && Date.now() - new Date(job.firstSeenAt).getTime() < 86_400_000;

  const newJobsCount = jobs.filter(isNew).length;
  const activePortalsCount = new Set(
    jobs.map((j) => PORTAL_MAPPING[j.source?.siteId]).filter(Boolean)
  ).size;

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo">💼</div>
          <div className="brand-info">
            <h2>GovtJob Radar</h2>
            <span>AI Job Intelligence</span>
          </div>
        </div>

        <div className="nav-group">
          <ul className="nav-list">
            <li className="nav-item active">
              <div className="nav-item-left">
                <span className="nav-item-icon">📊</span>
                <span>Dashboard</span>
              </div>
            </li>
            <li className="nav-item" onClick={() => setSearchQuery('')}>
              <div className="nav-item-left">
                <span className="nav-item-icon">💼</span>
                <span>All Jobs</span>
              </div>
              <span className="nav-badge">{meta?.totalJobs ?? jobs.length}</span>
            </li>
          </ul>
        </div>

        <div className="nav-group">
          <div className="nav-group-title">Job Portals</div>
          <ul className="nav-list">
            {Object.keys(PORTAL_FULL_NAMES).map((key) => {
              const count = jobs.filter((j) => PORTAL_MAPPING[j.source?.siteId] === key).length;
              return (
                <li key={key} className="nav-item" onClick={() => setSearchQuery(key)}>
                  <div className="nav-item-left">
                    <span className="nav-item-icon">{PORTAL_LOGOS[key] || '🏢'}</span>
                    <span>{key}</span>
                  </div>
                  <span className="nav-badge">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          className="nav-group"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}
        >
          <div className="nav-group-title">Preferences</div>
          <div className="pref-row">
            <span>Job Alerts</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={alertEnabled}
                onChange={(e) => setAlertEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="pref-row">
            <span>Email Digest</span>
            <span
              className="digest-badge"
              onClick={() => setEmailDigest((d) => (d === 'Daily' ? 'Weekly' : 'Daily'))}
            >
              {emailDigest} →
            </span>
          </div>
        </div>

        <div className="sidebar-promo-card">
          <h4>Stay Updated 🚀</h4>
          <p>Get instant email alerts for latest government openings.</p>
          <button className="btn-promo">Manage Alerts</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by job title, organisation, qualification…"
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-actions">
            <button className="btn-sort" onClick={() => setSearchQuery('')}>
              Reset Filters
            </button>
            <div className="user-avatar">AU</div>
          </div>
        </header>

        <div className="stats-header-row">
          <div className="stats-title">
            Latest Government Job Openings
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: error ? 'var(--color-danger)' : 'var(--color-secondary)',
              }}
            ></span>
          </div>
          <span className="stats-last-updated">
            {error
              ? `Backend unreachable — ${error}`
              : `Sources checked ${formatRelative(meta?.lastSyncAt)} · updates automatically`}
          </span>
        </div>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-box new-jobs">💼</div>
            <div className="stat-info">
              <span className="stat-value">{newJobsCount}</span>
              <span className="stat-label">Added in last 24 hours</span>
              <span className="stat-trend">
                {newJobsCount > 0 ? '↑ New postings found' : 'No new postings yet'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box active-jobs">🗂️</div>
            <div className="stat-info">
              <span className="stat-value">{filteredJobs.length}</span>
              <span className="stat-label">
                {searchQuery ? 'Matching openings' : 'Open positions'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box portals">🏛️</div>
            <div className="stat-info">
              <span className="stat-value">{activePortalsCount}</span>
              <span className="stat-label">Portals contributing jobs</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <span
              className="spinner"
              style={{
                width: '40px',
                height: '40px',
                borderColor: 'var(--color-primary)',
                borderTopColor: 'transparent',
              }}
            ></span>
            <p style={{ marginTop: '12px' }}>Loading job boards…</p>
          </div>
        ) : Object.keys(groupedJobs).length === 0 ? (
          <div className="empty-state">
            <h3>{searchQuery ? 'No job listings match your search' : 'No open positions right now'}</h3>
            <p>
              {searchQuery
                ? 'Try a different keyword, or clear the search to see everything currently open.'
                : 'Sources are checked automatically every 30 minutes — new openings appear here on their own.'}
            </p>
          </div>
        ) : (
          Object.entries(groupedJobs).map(([portalName, portalJobs]) => {
            const fullName = PORTAL_FULL_NAMES[portalName] || 'Other Government Portals';
            const logo = PORTAL_LOGOS[portalName] || '🏢';
            const rowId = `row-${portalName.replace(/\s+/g, '-')}`;

            return (
              <section key={portalName} className="portal-row-section">
                <div className="portal-row-header">
                  <div className="portal-title-area">
                    <div className="portal-row-logo">{logo}</div>
                    <div>
                      <h3>{portalName}</h3>
                      <span>{fullName}</span>
                    </div>
                  </div>
                  <div className="portal-header-actions">
                    <span className="portal-row-badge">
                      {portalJobs.length} {portalJobs.length === 1 ? 'Job' : 'Jobs'}
                    </span>
                    <button className="btn-view-portal" onClick={() => setSearchQuery(portalName)}>
                      View All {portalName} Jobs →
                    </button>
                  </div>
                </div>

                <div className="portal-cards-row-container">
                  {portalJobs.length > 3 && (
                    <button className="row-scroll-btn left" onClick={() => scrollRow(rowId, 'left')}>
                      ‹
                    </button>
                  )}

                  <div className="portal-cards-row" id={rowId}>
                    {portalJobs.map((job) => {
                      const remaining = daysLeft(job.applicationDeadline);
                      const pay = salaryLabel(job.salary);
                      const place = locationLabel(job.location);
                      const employment = EMPLOYMENT_LABELS[job.employmentType];

                      return (
                        <article
                          key={job._id}
                          className="gov-job-card"
                          onClick={() => setSelectedJob(job)}
                        >
                          <div>
                            <div className="card-top">
                              {isNew(job) ? (
                                <span className="card-badge-new">New</span>
                              ) : (
                                <span className="card-badge-new" style={{ visibility: 'hidden' }}>
                                  New
                                </span>
                              )}
                              <button className="btn-bookmark-card">🔖</button>
                            </div>
                            <h4>{job.title}</h4>
                            <div className="card-department">{job.organization}</div>
                          </div>

                          <div>
                            <div className="card-details-list">
                              <div className="card-detail-item">
                                <span className="card-detail-icon">💰</span>
                                <span>{pay || 'Pay scale in notification'}</span>
                              </div>
                              <div className="card-detail-item">
                                <span className="card-detail-icon">🎓</span>
                                <span>
                                  {job.qualifications?.length
                                    ? job.qualifications[0]
                                    : 'See notification'}
                                </span>
                              </div>
                              {(job.vacancies?.count || place) && (
                                <div className="card-detail-item">
                                  <span className="card-detail-icon">
                                    {job.vacancies?.count ? '🧾' : '📍'}
                                  </span>
                                  <span>
                                    {job.vacancies?.count
                                      ? `${job.vacancies.count} ${
                                          job.vacancies.count === 1 ? 'vacancy' : 'vacancies'
                                        }${place ? ` · ${place}` : ''}`
                                      : place}
                                  </span>
                                </div>
                              )}
                              <div className="card-detail-item deadline">
                                <span className="card-detail-icon">📅</span>
                                <span>
                                  {job.applicationDeadline
                                    ? `Last date: ${formatDate(job.applicationDeadline)}${
                                        remaining !== null && remaining <= 7
                                          ? ` · ${remaining <= 0 ? 'closes today' : `${remaining}d left`}`
                                          : ''
                                      }`
                                    : 'No closing date published'}
                                </span>
                              </div>
                              {employment && (
                                <div className="card-detail-item">
                                  <span className="card-detail-icon">🏷️</span>
                                  <span>{employment}</span>
                                </div>
                              )}
                            </div>

                            <div className="card-footer">
                              <button
                                className="btn-card-action secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJob(job);
                                }}
                              >
                                Details
                              </button>
                              <a
                                href={`${API_BASE}/jobs/${job._id}/apply`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-card-action primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Apply
                              </a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {portalJobs.length > 3 && (
                    <button
                      className="row-scroll-btn right"
                      onClick={() => scrollRow(rowId, 'right')}
                    >
                      ›
                    </button>
                  )}
                </div>
              </section>
            );
          })
        )}
      </main>

      {selectedJob && <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

/**
 * Detail modal.
 *
 * Only renders the fields a given posting actually has. Government sources vary
 * enormously in depth — IBPS publishes an organisation, a post and two dates,
 * while a UPSC booklet yields duties, reservation and probation — so a fixed grid
 * of labels would print "Not specified" a dozen times for the sparse ones.
 */
function JobModal({ job, onClose }) {
  const pay = salaryLabel(job.salary);
  const place = locationLabel(job.location);
  const employment = EMPLOYMENT_LABELS[job.employmentType];
  const workMode = WORK_MODE_LABELS[job.workMode];

  const facts = [
    ['Vacancies', job.vacancies?.count ? String(job.vacancies.count) : job.vacancies?.raw],
    ['Salary / Pay Scale', pay],
    [
      'Age Criteria',
      job.ageLimit?.min && job.ageLimit?.max
        ? `${job.ageLimit.min} – ${job.ageLimit.max} years`
        : job.ageLimit?.max
          ? `Up to ${job.ageLimit.max} years`
          : job.ageLimit?.raw,
    ],
    ['Location', place],
    ['Employment Type', employment],
    ['Work Mode', workMode],
    ['Experience', job.experience],
    ['Applications Open', formatDate(job.applicationStartDate)],
    [
      'Last Date',
      formatDate(job.applicationDeadline) ||
        (isBlank(job.applicationDeadlineRaw) ? null : job.applicationDeadlineRaw),
    ],
    ['Posted', formatDate(job.postedAt)],
  ].filter(([, value]) => !isBlank(value));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h3 className="modal-title">{job.title}</h3>
        <p className="modal-subtitle">
          {job.organization}
          {job.department && job.department !== job.organization ? ` · ${job.department}` : ''}
        </p>

        {job.description && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {job.description}
          </p>
        )}

        <div className="modal-details-grid">
          {facts.map(([label, value]) => (
            <div className="modal-detail-item" key={label}>
              <span className="modal-detail-label">{label}</span>
              <span className="modal-detail-value">{value}</span>
            </div>
          ))}
        </div>

        <ModalList title="Qualifications" items={job.qualifications} />
        <ModalList title="Responsibilities" items={job.responsibilities} />
        <ModalList title="Skills" items={job.skills} />

        {job.extras?.reservation && (
          <ModalNote title="Reservation" body={job.extras.reservation} />
        )}
        {job.extras?.probation && <ModalNote title="Probation" body={job.extras.probation} />}

        {job.notificationPdfUrl && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
              Official Document
            </h4>
            <p>
              <a
                href={job.notificationPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  textDecoration: 'underline',
                }}
              >
                View official PDF notification
              </a>
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={`${API_BASE}/jobs/${job._id}/apply`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-card-action primary"
            style={{
              flex: 1,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Go to Application Portal
          </a>
          <button className="btn-card-action secondary" onClick={onClose} style={{ width: '100px' }}>
            Close
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '14px' }}>
          Source: {job.source?.name}
          {job.lastSeenAt ? ` · confirmed ${formatRelative(job.lastSeenAt)}` : ''}
        </p>
      </div>
    </div>
  );
}

function ModalList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
        {title}
      </h4>
      <ul
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          paddingLeft: '18px',
          margin: 0,
        }}
      >
        {items.map((item, index) => (
          <li key={index} style={{ marginBottom: '2px' }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModalNote({ title, body }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{body}</p>
    </div>
  );
}

export default App;
