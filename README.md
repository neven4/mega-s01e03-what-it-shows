# S01E03 — what it shows

Review of the support desk's 2026-10-04 KB export for merged ticket #4471.

The export's 427 rows represent 412 unique report IDs. Running its own tenant-and-channel
classifier gives 379 parser-assigned reports and 33 booking-v3 hint reports. These need
separate tickets and fixes. Five timing anomalies remain within the parser assignment,
explicitly flagged for investigation rather than asserted to have a proven parser cause.

## Deliverables

- [Parser ticket draft](issues/01-parser.md): 379 unique reports, with the five unexplained timing symptoms called out.
- [Form-hint ticket draft](issues/02-form-hint.md): 33 unique reports across three booking-v3 tenants.
- [Signed KB page](support-kb/src/routes/kb/decisions/0002-triage-by-cause/+page.svx).
- [Rendered KB page](support-kb/rendered/kb/decisions/0002-triage-by-cause/index.html): download and open locally to view the HTML.
- [Computed summary](support-kb/evidence/summary.json) and [per-report assignments](support-kb/evidence/report-assignments.json).

The KB page proposes replacing subject-only deduplication. It leaves accepted decision 0001
unchanged and records desk acceptance as pending. It distinguishes report receipt from merge
time and the export date from the date of this review.

## Reproduce the rendered evidence

Requires Node 20.19.4 or later. From this repository:

```sh
cd render
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

The local build executes the exported Svelte components and Markdown pages without starting
a server. The renderer supplies the export's missing `#lib` alias, tenant/page glob imports,
and mdsvex layout mapping. All original export files are preserved byte for byte; the added
KB files are the signed decision page and `IncidentReview.svelte`.

The generated HTML is a server-rendered snapshot, not a live desk connection. Its static
tables and charts are complete. The original interactive demo controls require the full
Svelte app to respond; they are not hydrated in this snapshot. The `.svx` and component
source remain suitable for that app.

## Verification

- All five KB pages compile, with zero Svelte compiler warnings.
- Exact report-ID deduplication reconciles the issue counts to the export total; repeated rows are identical.
- The exported classifier is run directly, including platform-derived locale date order.
- Same-subject/different-cause and different-subject/same-cause counterexamples are checked.
- The new page renders its signature-derived desk reference, `DR-B6PD-DFNJ`.
- No live product fix or live-product reproduction is claimed.

The export hash is recorded in `support-kb/evidence/export-sha256.txt`.
