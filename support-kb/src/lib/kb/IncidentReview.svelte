<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { causeOf, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  const raw = reports as Report[];
  const merged = uniqueById(raw).filter((r) => r.mergedInto === 4471);
  const disagreements = merged.filter((r) => causeOf(r, tenantOf(r)) !== r.meta.intakeTag);
  const anomalies = merged.filter((r) => notes.oneDayMove.includes(r.id));
  const months = [...new Set(merged.flatMap((r) => [r.receivedAt.slice(0, 7), r.mergedAt?.slice(0, 7)]).filter(Boolean))].sort();
  const batch = merged.filter((r) => r.mergedAt?.startsWith('2026-07-02'));
</script>

<p>
  The export has <strong>{raw.length}</strong> rows and <strong>{merged.length}</strong> unique reports:
  <strong>{raw.length - merged.length}</strong> overlapping rows must not be counted again.
  <strong>{disagreements.length}</strong> intake tags disagree with the tenant-and-channel classifier.
</p>

<h3>Receipt is not merge time</h3>
<p>
  <strong>{batch.length}</strong> reports were merged on 2 July;
  <strong>{batch.filter((r) => r.receivedAt.slice(0, 10) < '2026-07-02').length}</strong>
  had arrived earlier. That batch is backlog processing, not the start of the incident.
  <strong>{merged.filter((r) => r.mergedAt && r.mergedAt.slice(0, 10) > '2026-07-02').length}</strong>
  more reports were merged after that day. The export does not show a successful fix.
</p>
<table>
  <thead><tr><th>month</th><th>received</th><th>merged</th></tr></thead>
  <tbody>
    {#each months as month (month)}
      <tr>
        <td>{month}</td>
        <td>{merged.filter((r) => r.receivedAt.startsWith(month!)).length}</td>
        <td>{merged.filter((r) => r.mergedAt?.startsWith(month!)).length}</td>
      </tr>
    {/each}
  </tbody>
</table>

<h3>Unexplained timing symptoms</h3>
<p>
  The desk notes identify <strong>{anomalies.length}</strong> reports with one-day or timing symptoms.
  The classifier files all of them under <code>parser</code> by tenant; that is a filing rule,
  not proof that a month/day parser explains their bodies. They remain included in the parser
  count, with no double counting. Investigate time zones, event timestamps, and delivery logs
  before deciding whether another ticket is needed. A separate root cause is not established here.
</p>
<table>
  <thead><tr><th>report</th><th>tenant / channel</th><th>reported symptom</th></tr></thead>
  <tbody>
    {#each anomalies as report (report.id)}
      <tr><td>{report.id}</td><td>{report.tenant}<br />{report.channel}</td><td>{report.body}</td></tr>
    {/each}
  </tbody>
</table>
