import { useEffect, useState } from "react";
import type { CoordinationStudioProps, ScenarioAnalysis, ScenarioCandidate } from "../contracts.js";
import "./styles.css";

function shiftedStart(candidate: ScenarioCandidate): string {
  const date = new Date(`${candidate.startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - candidate.daysShifted);
  return date.toISOString().slice(0, 10);
}

function inclusiveDuration(candidate: ScenarioCandidate): number {
  const start = new Date(`${candidate.startDate}T00:00:00Z`).getTime();
  const end = new Date(`${candidate.endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

function currentRange(candidate: ScenarioCandidate): { start: string; end: string } {
  const start = shiftedStart(candidate);
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + inclusiveDuration(candidate) - 1);
  return { start, end: date.toISOString().slice(0, 10) };
}

function formatWindow(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function CoordinationStudio({ analysis, busy, onRefresh, onApply }: CoordinationStudioProps) {
  const [shownAnalysis, setShownAnalysis] = useState<ScenarioAnalysis>(analysis);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setShownAnalysis(analysis), [analysis]);

  const candidate = shownAnalysis.candidate;
  const disabled = busy || working;
  const canApply = Boolean(candidate && reason.trim().length >= 10 && reason.trim().length <= 500 && !disabled);

  async function refresh() {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      setShownAnalysis(await onRefresh());
    } catch {
      setError("Could not refresh the schedule analysis. Your reason is still here; try again.");
    } finally {
      setWorking(false);
    }
  }

  async function apply() {
    if (!candidate || !canApply) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      await onApply(candidate, reason.trim());
      try {
        setShownAnalysis(await onRefresh());
        setNotice("Schedule update saved. Analysis refreshed from the returned schedule.");
        setReason("");
      } catch {
        setNotice("Schedule update was saved, but fresh analysis is unavailable. Refresh before deciding again.");
      }
    } catch {
      setError("Schedule update failed. Your reason is still here; refresh and review the current schedule.");
    } finally {
      setWorking(false);
    }
  }

  const previous = candidate ? currentRange(candidate) : null;

  return <section className="od-studio" aria-labelledby="od-studio-title" aria-busy={disabled}>
    <header className="od-studio__header">
      <div>
        <p className="od-studio__eyebrow">Dig Once Studio · computed schedule review</p>
        <h2 id="od-studio-title">Coordinate work on the same street</h2>
      </div>
      <button className="od-button od-button--secondary" type="button" onClick={refresh} disabled={disabled}>
        {working ? "Refreshing…" : "Refresh analysis"}
      </button>
    </header>

    <p className="od-studio__basis">Computed for {shownAnalysis.asOfDate}. Schedule signals are advisory and do not establish contractor or utility feasibility.</p>
    {error && <p className="od-alert od-alert--error" role="alert">{error}</p>}
    {notice && <p className="od-alert od-alert--success" role="status">{notice}</p>}

    {shownAnalysis.currentWarnings.length > 0 ? <div className="od-warning-list" aria-label="Current schedule warnings">
      {shownAnalysis.currentWarnings.map((warning) => <article className="od-warning" key={warning.id}>
        <div className="od-warning__heading"><span className="od-pill">{warning.kind === "date_overlap" ? "Date overlap" : "Recent resurfacing"}</span><span>{warning.segmentId}</span></div>
        <p>{warning.explanation}</p>
        <dl className="od-evidence">
          {warning.evidence.overlapStart && <div><dt>Overlap</dt><dd>{formatWindow(warning.evidence.overlapStart, warning.evidence.overlapEnd!)}</dd></div>}
          {warning.evidence.resurfacingEnd && <div><dt>Resurfacing ended</dt><dd>{warning.evidence.resurfacingEnd}</dd></div>}
          {warning.evidence.excavationStart && <div><dt>Excavation starts</dt><dd>{warning.evidence.excavationStart}</dd></div>}
          {warning.evidence.daysAfterResurfacing !== null && <div><dt>Gap</dt><dd>{warning.evidence.daysAfterResurfacing} days</dd></div>}
        </dl>
      </article>)}
    </div> : <p className="od-empty" role="status">No current schedule warnings involve this project.</p>}

    {candidate && previous ? <div className="od-comparison" aria-label="Before and proposed schedule">
      <article className="od-schedule od-schedule--before">
        <h3>Current schedule</h3><p className="od-schedule__dates">{formatWindow(previous.start, previous.end)}</p>
        <p>Current dates inferred from the computed shift and preserved duration.</p>
        <div className="od-calendar" aria-label={`Current schedule ${previous.start} through ${previous.end}`}><span style={{ width: "100%" }} /></div>
      </article>
      <article className="od-schedule od-schedule--after">
        <h3>Proposed schedule</h3><p className="od-schedule__dates">{formatWindow(candidate.startDate, candidate.endDate)}</p>
        <p>{Math.abs(candidate.daysShifted)} calendar days {candidate.daysShifted < 0 ? "earlier" : candidate.daysShifted > 0 ? "later" : "from current dates"}; {candidate.warningCountAfter} warnings after.</p>
        <div className="od-calendar od-calendar--proposed" aria-label={`Proposed schedule ${candidate.startDate} through ${candidate.endDate}`}><span style={{ width: "100%" }} /></div>
      </article>
      <p className="od-rationale">{candidate.rationale}</p>
    </div> : <div className="od-no-option" role="status">
      <h3>{shownAnalysis.status === "no_change_needed" ? "No change needed" : shownAnalysis.status === "window_required" ? "Narrow the allowable window" : "No safe date option found"}</h3>
      <p>{shownAnalysis.status === "no_change_needed"
        ? "The current schedule has no warnings involving the focus project."
        : shownAnalysis.status === "window_required"
          ? "This search has more than 31 possible start dates. Narrow the officer-supplied window and refresh."
          : "The current warning remains unresolved. Review the evidence or adjust the flexibility window before trying again."}</p>
    </div>}

    <ul className="od-limitations">{shownAnalysis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
    {candidate && <div className="od-apply">
      <label htmlFor="od-public-reason">Public reason for the schedule change</label>
      <textarea id="od-public-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.currentTarget.value)} rows={3} aria-describedby="od-reason-help" />
      <div id="od-reason-help" className="od-field-help">Enter 10–500 characters. This reason will be published with the schedule update.</div>
      <div className="od-apply__actions">
        <span>{reason.trim().length}/500</span>
        <button className="od-button" type="button" disabled={!canApply} onClick={apply}>{working ? "Applying…" : "Apply proposed dates"}</button>
      </div>
    </div>}
  </section>;
}
