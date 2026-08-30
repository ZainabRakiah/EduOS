import { extractHtmlListing, enrichFromDetail } from '../services/extractors/htmlListing.js';
import { getSite, buildIdentityKey } from '../config/siteRegistry.js';

const ids = process.argv[2] ? [process.argv[2]] : ['employment-news', 'ibps-recruitment', 'upsc-active-exams'];

for (const id of ids) {
  const site = getSite(id);
  const t = Date.now();
  const r = await extractHtmlListing(site);
  const secs = ((Date.now() - t) / 1000).toFixed(2);

  console.log(`\n${'═'.repeat(70)}\n${id}  ${secs}s  ok=${r.ok} notModified=${r.notModified} rows=${r.rows.length}`);
  console.log('stats:', JSON.stringify(r.stats), '| etag:', r.etag || '—');
  if (r.errors.length) console.log('errors:', r.errors);

  const keys = new Set();
  for (const row of r.rows) keys.add(buildIdentityKey(site, row));
  console.log(`distinct identityKeys = ${keys.size} / ${r.rows.length}`);

  for (const row of r.rows.slice(0, 3)) {
    console.log(`  · ${JSON.stringify({
      title: row.title?.slice(0, 55),
      org: row.organization?.slice(0, 40),
      type: row.employmentType,
      posted: row.postedAt?.toISOString().slice(0, 10),
      start: row.applicationStartDate?.toISOString().slice(0, 10),
      dead: row.applicationDeadline?.toISOString().slice(0, 10),
      url: row.applicationUrl?.slice(-40),
    })}`);
  }

  // Field fill rate across every row.
  const FIELDS = ['title', 'organization', 'employmentType', 'postedAt', 'applicationStartDate', 'applicationDeadline', 'applicationUrl'];
  const fill = FIELDS.map((f) => `${f}=${r.rows.filter((x) => x[f] != null).length}/${r.rows.length}`);
  console.log('  fill:', fill.join('  '));

  // Detail enrichment on the first row only, if the site declares it.
  if (site.detail?.enabled && r.rows.length) {
    const d = Date.now();
    const row = await enrichFromDetail(site, { ...r.rows[0] });
    console.log(`  detail(${((Date.now() - d) / 1000).toFixed(2)}s): pdf=${row.notificationPdfUrl?.slice(-45) || '—'}`);
    console.log(`    deadline=${row.applicationDeadline?.toISOString() || '—'} start=${row.applicationStartDate?.toISOString() || '—'}`);
    console.log(`    qual=${JSON.stringify(row.qualifications?.slice(0, 70)) || '—'}`);
    console.log(`    salary=${JSON.stringify(row.salary?.slice(0, 50)) || '—'} vac=${row.vacanciesCount ?? '—'} age=${JSON.stringify(row.ageLimit?.slice(0, 40)) || '—'}`);
    console.log(`    rawText=${row.rawText?.length || 0} chars  extraction=${JSON.stringify(row.extraction)}`);
    if (row.detailError) console.log(`    detailError: ${row.detailError}`);
  }
}
