# Shared date parser reads month first for day-first tenants — 379 reports

## Problem and scope

The 2026-10-04 KB export contains 427 rows and 412 unique report IDs merged into #4471.
The supplied tenant-and-channel classifier assigns **379 unique reports** to `parser`,
across 11 tenants, received from 2026-04-01 through 2026-10-04.
This is one cause concealed by the merged ticket, separate from the booking-v3 hint issue.

The shared parser reads all dates month first. A day-first tenant's dates can therefore
have their month and day exchanged. Browser locale and intake tags are not tenant settings:
23 reports in this group were incorrectly tagged `hint` by intake.

## Evidence and expected behavior

- R-41205: `morrow.tax`, tenant locale `fr-FR`, `booking-v2`, channel `app`.
  The report says 3 October became 10 March. Browser locale `en-US` led intake to tag it `hint`.
- R-41203: `lantern.row`, `cs-CZ`, app: 2 December became 12 February.
- `src/lib/kb/causes.ts`: `dayFirst`, `causeOf`, `uniqueById`, and `groupByCause`.
- `src/lib/kb/locales.ts` and `src/lib/data/tenants/`: tenant settings used in classification.

Expected: the parser interprets date order according to the tenant's locale.
For a day-first tenant, `03/10/2026` should remain 3 October; day values above twelve
must also be accepted correctly. Verify both day-first and month-first locales.
These are proposed reproduction checks derived from the supplied KB, not a live-product test.

## Unresolved symptoms within the count

The 379 includes five reports listed in `desk-notes.json`: R-41202, R-41209, R-41236,
R-41344, R-41620. Their bodies describe one-day shifts or other timing anomalies, rather
than a clear month/day swap. The supplied classifier files them under parser by tenant.
Thus 374 reports are outside that exception list; the five are not added again elsewhere.
Inspect event timestamps, time zones, and delivery logs before claiming that the parser
fix explains them or opening a separate root-cause ticket. The current evidence does not
establish a time-zone defect.

## Queue context

Reports arrived in April, although the first large merge batch was on 2 July: 184 reports,
183 received earlier. Later merges continued through 4 October. A merge timestamp is not
the incident onset, and “known / fix queued” does not establish resolution.

## Proposed fix and verification

Correct tenant-specific parsing and test representative app/email and booking-v2 inputs.
Keep booking-v3's misleading form hint separate. Preserve the report-ID membership from
`evidence/report-assignments.json`, and reassess the five timing exceptions before closure.

## Engineering outcome

The [course's desk update](https://hq.mega.dev/challenges/what-it-shows) reports
`#4471 · closed 05 oct`: parser **fixed**, `fix(dates): parse dd/mm for eu locales`.
Closed as completed on that engineering evidence. This does not establish a separate
explanation for the five timing anomalies; no live-product validation was performed here.
