import { useState } from "react";
import type { CreateProject, IntakeField, IntakeResult, NoticeIntakePanelProps, ProjectDetail, WorkType } from "../contracts.js";
import "./styles.css";

const fieldLabels: Record<IntakeField, string> = {
  title: "Title", description: "Description", workType: "Work type", departmentId: "Department",
  startDate: "Start date", endDate: "End date", impact: "Impact", segmentIds: "Road segment",
};

function sourceFor(result: IntakeResult | null, field: IntakeField): string[] {
  return result?.evidence.filter((item) => item.field === field).map((item) => item.quote) ?? [];
}

export function NoticeIntakePanel({ departments, segments, onExtract, onConfirm }: NoticeIntakePanelProps) {
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [departmentId, setDepartmentId] = useState("");
  const [impact, setImpact] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [earliestStartDate, setEarliestStartDate] = useState("");
  const [latestEndDate, setLatestEndDate] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Department notice, reviewed by officer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function extract() {
    setBusy(true); setError(null); setNotice(null);
    try {
      const extracted = await onExtract(rawText);
      setResult(extracted);
      if (!title.trim() && extracted.draft.title) setTitle(extracted.draft.title);
      if (!description.trim() && extracted.draft.description) setDescription(extracted.draft.description);
      if (!workType && extracted.draft.workType) setWorkType(extracted.draft.workType);
      if (!departmentId && extracted.draft.departmentId) setDepartmentId(extracted.draft.departmentId);
      if (!impact.trim() && extracted.draft.impact) setImpact(extracted.draft.impact);
      if (!startDate && extracted.draft.startDate) setStartDate(extracted.draft.startDate);
      if (!endDate && extracted.draft.endDate) setEndDate(extracted.draft.endDate);
      if (!segmentId && extracted.draft.segmentIdCandidates.length === 1) setSegmentId(extracted.draft.segmentIdCandidates[0]!);
      setNotice(`Draft ready in ${extracted.mode} mode. Review each field and source excerpt before confirmation.`);
    } catch {
      setError("Extraction failed. The notice and your field edits are still here; try again or continue manually.");
    } finally { setBusy(false); }
  }

  const windowValid = (!earliestStartDate && !latestEndDate) || Boolean(earliestStartDate && latestEndDate && earliestStartDate <= startDate && startDate <= endDate && endDate <= latestEndDate);
  const canConfirm = Boolean(
    title.trim() && description.trim() && workType && departmentId && impact.trim() &&
    startDate && endDate && startDate <= endDate && segmentId && sourceLabel.trim() && windowValid && !busy,
  );

  async function confirm() {
    if (!canConfirm) return;
    setBusy(true); setError(null); setNotice(null);
    const project: CreateProject = {
      title: title.trim(), description: description.trim(), workType: workType as WorkType,
      departmentId, impact: impact.trim(), status: "planned", startDate, endDate,
      earliestStartDate: earliestStartDate || null, latestEndDate: latestEndDate || null,
      segmentIds: [segmentId], sourceLabel: sourceLabel.trim(),
    };
    try {
      const created: ProjectDetail = await onConfirm(project);
      setNotice(`Operator confirmation received for “${created.title}”.`);
    } catch {
      setError("Confirmation failed. Your reviewed draft is still here; retry after checking the operator connection.");
    } finally { setBusy(false); }
  }

  const evidence = (field: IntakeField) => {
    const quotes = sourceFor(result, field);
    return quotes.length ? <div className="od-intake-evidence"><span>Source evidence</span>{quotes.map((quote, index) => <blockquote key={`${field}-${index}`}>{quote}</blockquote>)}</div> : null;
  };

  return <section className="od-intake" aria-labelledby="od-intake-title" aria-busy={busy}>
    <header className="od-studio__header">
      <div><p className="od-studio__eyebrow">Evidence-linked notice intake</p><h2 id="od-intake-title">Review a notice draft</h2></div>
      {result && <span className={`od-mode od-mode--${result.mode}`}>{result.mode} extraction</span>}
    </header>
    <p className="od-intake__privacy">Pasted text is sent only when you select Extract. The draft is not saved or turned into a project automatically.</p>
    {error && <p className="od-alert od-alert--error" role="alert">{error}</p>}
    {notice && <p className="od-alert od-alert--success" role="status">{notice}</p>}
    <label htmlFor="od-notice-source">Pasted notice text</label>
    <textarea id="od-notice-source" value={rawText} onChange={(event) => setRawText(event.currentTarget.value)} rows={5} maxLength={6000} />
    <div className="od-intake__actions"><span>{rawText.length}/6000 · minimum 50 characters</span><button className="od-button" type="button" disabled={busy || rawText.trim().length < 50} onClick={extract}>{busy ? "Working…" : "Extract draft"}</button></div>
    {result && <>
      {result.warnings.length > 0 && <ul className="od-intake-warnings">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      <div className="od-intake-fields">
        <label>Title<input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />{evidence("title")}</label>
        <label>Description<textarea value={description} rows={3} onChange={(event) => setDescription(event.currentTarget.value)} />{evidence("description")}</label>
        <label>Work type<select value={workType} onChange={(event) => setWorkType(event.currentTarget.value as WorkType | "")}><option value="">Choose work type</option><option value="excavation">Excavation</option><option value="resurfacing">Resurfacing</option><option value="other">Other</option></select>{evidence("workType")}</label>
        <label>Department<select value={departmentId} onChange={(event) => setDepartmentId(event.currentTarget.value)}><option value="">Choose department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{evidence("departmentId")}</label>
        <label>Impact<input value={impact} onChange={(event) => setImpact(event.currentTarget.value)} />{evidence("impact")}</label>
        <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.currentTarget.value)} />{evidence("startDate")}</label>
        <label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.currentTarget.value)} />{evidence("endDate")}</label>
        <label>Street segment<select value={segmentId} onChange={(event) => setSegmentId(event.currentTarget.value)}><option value="">Choose segment</option>{segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.roadName} · {segment.fromLabel} to {segment.toLabel}</option>)}</select>{evidence("segmentIds")}</label>
      </div>
      <fieldset className="od-flex-window"><legend>Officer-entered flexibility window (optional)</legend><p>Set this from your authority. It is never extracted from the notice.</p><div><label>Earliest start<input type="date" value={earliestStartDate} onChange={(event) => setEarliestStartDate(event.currentTarget.value)} /></label><label>Latest end<input type="date" value={latestEndDate} onChange={(event) => setLatestEndDate(event.currentTarget.value)} /></label></div>{!windowValid && <p className="od-alert od-alert--error" role="alert">The flexibility window must contain the scheduled dates.</p>}</fieldset>
      <label>Public source label<input value={sourceLabel} onChange={(event) => setSourceLabel(event.currentTarget.value)} /></label>
      <button className="od-button" type="button" disabled={!canConfirm} onClick={confirm}>{busy ? "Confirming…" : "Confirm reviewed project"}</button>
      {!canConfirm && <p className="od-field-help">Complete title, description, work type, department, impact, valid dates, and street segment before confirmation.</p>}
    </>}
  </section>;
}
