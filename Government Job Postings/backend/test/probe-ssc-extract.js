import { extractSscNotices } from '../services/extractors/sscApi.js';
import { getSite, buildIdentityKey } from '../config/siteRegistry.js';

const site = getSite('ssc');
const t = Date.now();
const r = await extractSscNotices(site);

console.log(`elapsed ${((Date.now() - t) / 1000).toFixed(3)}s | ok=${r.ok} notModified=${r.notModified} rows=${r.rows.length}`);
console.log('stats:', JSON.stringify(r.stats));
if (r.errors.length) console.log('errors:', r.errors);
console.log('etag:', r.etag || '—');

const keys = new Set();
for (const row of r.rows) {
  keys.add(buildIdentityKey(site, row));
  console.log('\n──', row.externalId, '─'.repeat(45));
  console.log('  title    :', row.title);
  console.log('  org      :', row.organization);
  console.log('  vacancies:', row.vacanciesCount, '|', row.vacanciesRaw);
  console.log('  empType  :', row.employmentTypeHint || '—');
  console.log('  postedAt :', row.postedAt?.toISOString() || '—');
  console.log('  deadline :', row.applicationDeadline?.toISOString() || '—', '|', row.applicationDeadlineRaw || '—');
  console.log('  applyUrl :', row.applicationUrl);
  console.log('  pdf      :', row.notificationPdfUrl || '—', '| usedPdf=' + row.usedPdf);
  console.log('  identity :', buildIdentityKey(site, row));
}
console.log(`\ndistinct identityKeys = ${keys.size} / ${r.rows.length}`, keys.has(null) ? '(includes null!)' : '');

// Tier 0: replay the validators and confirm a bodyless 304.
if (r.etag || r.lastModified) {
  const again = await extractSscNotices(site, { etag: r.etag, lastModified: r.lastModified });
  console.log(`\nTier-0 recheck → notModified=${again.notModified} rows=${again.rows.length}`);
}
