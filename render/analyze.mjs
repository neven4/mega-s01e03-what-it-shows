import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../support-kb');
const data = path.join(root, 'src/lib/data');
const evidence = path.join(root, 'evidence');
const json = async (name) => JSON.parse(await readFile(name, 'utf8'));
await build({ stdin: { contents: `export * from ${JSON.stringify(path.join(root, 'src/lib/kb/causes.ts'))}; export * from ${JSON.stringify(path.join(root, 'src/lib/kb/desk-ref.ts'))};`, resolveDir: here }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(here, 'causes.mjs') });
const { uniqueById, groupByCause, causeOf, sameCause, deskRef } = await import(pathToFileURL(path.join(here, 'causes.mjs')));
const raw = await json(path.join(data, 'reports-4471.json'));
const reports = uniqueById(raw).filter((report) => report.mergedInto === 4471);
const tenants = new Map(await Promise.all((await readdir(path.join(data, 'tenants'))).map(async (name) => {
  const tenant = await json(path.join(data, 'tenants', name));
  return [tenant.handle, tenant];
})));
const tenantOf = (report) => tenants.get(report.tenant);
const groups = groupByCause(reports, tenantOf);
const notes = await json(path.join(data, 'desk-notes.json'));
const assignments = reports.map((report) => ({ id: report.id, cause: causeOf(report, tenantOf(report)), timingException: notes.oneDayMove.includes(report.id) }));
assert.equal(raw.length, 427);
assert.equal(reports.length, 412);
assert.deepEqual(groups.map((group) => [group.cause, group.reports.length]), [['parser', 379], ['hint', 33]]);
assert.equal(assignments.filter((row) => row.timingException).length, 5);
assert.ok(assignments.every((row) => !row.timingException || row.cause === 'parser'));
assert.equal(sameCause({ channel: 'email' }, tenants.get('kettle.books'), { channel: 'app' }, tenants.get('kettle.books')), true);
assert.equal(sameCause({ channel: 'form' }, tenants.get('alder.physio'), { channel: 'app' }, tenants.get('alder.physio')), false);
assert.equal(sameCause({ channel: 'form' }, tenants.get('copper.studio'), { channel: 'form' }, tenants.get('morrow.tax')), false);
assert.equal(sameCause({ channel: 'email' }, undefined, { channel: 'email' }, undefined), false);
const overlaps = raw.filter((report, i) => raw.findIndex((other) => other.id === report.id) !== i);
for (const duplicate of overlaps) assert.deepEqual(duplicate, reports.find((report) => report.id === duplicate.id));
const summary = {
  sourceDate: '2026-10-04',
  analyzedOn: '2026-10-28',
  rawRows: raw.length,
  uniqueReports: reports.length,
  overlappingRows: overlaps.length,
  intakeDisagreements: reports.filter((report) => causeOf(report, tenantOf(report)) !== report.meta.intakeTag).length,
  groups: groups.map(({ cause, reports: rows, ...group }) => ({ ...group, cause, count: rows.length })),
  timingExceptions: notes.oneDayMove,
};
await mkdir(evidence, { recursive: true });
await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(path.join(evidence, 'report-assignments.json'), JSON.stringify(assignments, null, 2) + '\n');
const html = await readFile(path.join(root, 'rendered/kb/decisions/0002-triage-by-cause/index.html'), 'utf8');
assert.match(html, /desk ref/);
const source = await readFile(path.join(root, 'src/routes/kb/decisions/0002-triage-by-cause/+page.svx'), 'utf8');
const signature = source.match(/^signature: '([^']+)'/m)[1];
assert.ok(html.includes(deskRef(signature)));
assert.doesNotMatch(html, /no desk ref/);
assert.match(html, /379/);
assert.match(html, /33/);
assert.match(html, /Receipt is not merge time/);
console.log('Verified: 412 unique IDs, 379/33 classification, duplicate consistency, timing exceptions, dedupe counterexamples, and rendered signature.');
