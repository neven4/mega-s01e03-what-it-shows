# Booking-v3 shows a month-first hint to day-first tenants — 33 reports

## Problem and scope

**33 unique reports** merged into #4471 belong to a different problem from the shared parser:
booking-v3 displays `MM/DD/YYYY`, while the form interprets dates using the tenant's day-first
locale. Users who follow the hint enter dates in the wrong order for that form.
These reports were received from 2026-04-17 through 2026-09-22.

Affected tenants: `alder.physio` (12), `copper.studio` (11), and `pale.harbour` (10).
All 33 came through `form`. These counts use report IDs, not raw export rows or subjects.
15 were tagged `parser` by intake; 18 were tagged `hint`. Intake tags are not the classification.

## Evidence and expected behavior

- R-41230: `copper.studio`, `es-ES`, `booking-v3`, channel `form`: the report describes
  6 January becoming 1 June, although intake guessed `parser` from browser locale `en-GB`.
- R-41584: same tenant and channel: 7 November became 11 July, with browser locale `en-US`.
- `src/lib/kb/causes.ts`: `DATE_HINT['booking-v3']` is `MM/DD/YYYY`; `causeOf` assigns
  day-first booking-v3 form reports to `hint`.
- `src/lib/data/tenants/`: the three tenants' locales and form versions.

Expected: the displayed date-format hint agrees with the tenant-specific format the form reads.
For example, an `es-ES` form must not tell a user to enter month first and then interpret day first.
This is a proposed reproduction check derived from the KB, not a live-product test.

## Separate fix and verification

Make the hint and form interpretation agree for each tenant. Verify booking-v3 in day-first
and month-first locales with an ambiguous date and a day above twelve. Confirm that app/email
paths and booking-v2 are classified separately. A shared-parser patch alone does not repair
this hint mismatch.

Keep these reports in their own ticket. Membership is recorded in
`evidence/report-assignments.json`; 379 parser-assigned reports plus these 33 reconcile to
the 412 unique reports in the export, with no overlap.

## Engineering outcome

The [course's desk update](https://hq.mega.dev/challenges/what-it-shows) reports
`#4471 · closed 05 oct`: hint **won't fix**, `booking-v3 form retired`.
Closed as not planned because the affected form was retired. This is not a claim that
the form hint was corrected or that a hint fix shipped.
