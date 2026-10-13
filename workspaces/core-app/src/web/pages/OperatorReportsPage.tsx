import { useCallback, useEffect, useState } from "react";
import type { OperatorReport, ReportStatus } from "../../shared/contracts";
import { ApiClientError, getOperatorReports, updateOperatorReport } from "../api/client";

export function OperatorReportsPage() {
  const [reports, setReports] = useState<OperatorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOperatorReports();
      setReports(result.items);
    } catch (loadError) {
      setError(loadError instanceof ApiClientError ? loadError.message : "Resident concerns could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function changeStatus(report: OperatorReport, status: ReportStatus) {
    const response = status === "resolved" ? responses[report.id]?.trim() ?? "" : null;
    setBusyId(report.id);
    setError(null);
    try {
      await updateOperatorReport(report.id, status, response);
      await refresh();
    } catch (updateError) {
      setError(updateError instanceof ApiClientError ? updateError.message : "The report could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="operator-reports-panel">
      <div className="section-heading"><div><p className="eyebrow">RESIDENT FEEDBACK</p><h2>Concern queue</h2></div><button className="text-link" onClick={() => void refresh()}>Refresh queue</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted-copy" role="status">Loading resident concerns…</p>}
      {!loading && !error && reports.length === 0 && <p className="muted-copy">No resident concerns have been submitted.</p>}
      {!loading && reports.length > 0 && <div className="operator-report-list">{reports.map((report) => (
        <article className="operator-report-card" key={report.id}>
          <div className="project-card-top"><span className={`status-chip status-${report.status}`}>{report.status.replaceAll("_", " ")}</span><span className="demo-mini">{report.category}</span></div>
          <p className="report-project-id">Project {report.projectId}</p>
          <p className="operator-report-description">{report.description}</p>
          {report.status === "new" && <button className="button button-secondary" disabled={busyId === report.id} onClick={() => void changeStatus(report, "in_review")}>{busyId === report.id ? "Saving…" : "Mark in review"}</button>}
          {report.status === "in_review" && <div className="report-response-form"><label>Response to resident<textarea required minLength={10} maxLength={500} rows={3} value={responses[report.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Share the action or finding with the resident" /></label><button className="button button-primary" disabled={busyId === report.id || (responses[report.id]?.trim().length ?? 0) < 10} onClick={() => void changeStatus(report, "resolved")}>{busyId === report.id ? "Saving…" : "Resolve and respond"}</button></div>}
          {report.status === "resolved" && report.operatorResponse && <div className="operator-response"><p className="eyebrow">RESPONSE SENT</p><p>{report.operatorResponse}</p></div>}
          <p className="receipt-updated">Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p>
        </article>
      ))}</div>}
    </section>
  );
}
