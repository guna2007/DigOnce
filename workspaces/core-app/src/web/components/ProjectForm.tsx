import { useEffect, useState } from "react";
import type { CreateProject, Department, ProjectSummary, Segment } from "../../shared/contracts";
import { ApiClientError } from "../api/client";

interface ProjectFormProps {
  departments: Department[];
  segments: Segment[];
  project?: ProjectSummary;
  onCreate(project: CreateProject): Promise<void>;
  onEdit(project: ProjectSummary, reason: string, changes: Record<string, unknown>): Promise<void>;
  onCancelEdit(): void;
}

interface FormValues {
  title: string; description: string; workType: CreateProject["workType"]; departmentId: string;
  status: CreateProject["status"]; impact: string; startDate: string; endDate: string;
  earliestStartDate: string; latestEndDate: string; segmentIds: string[]; sourceLabel: string; reason: string;
}

function blankValues(departments: Department[], segments: Segment[]): FormValues {
  const day = new Date().toISOString().slice(0, 10);
  return {
    title: "", description: "", workType: "excavation", departmentId: departments[0]?.id ?? "",
    status: "planned", impact: "", startDate: day, endDate: day, earliestStartDate: "", latestEndDate: "",
    segmentIds: segments[0] ? [segments[0].id] : [], sourceLabel: "Manual operator entry", reason: "",
  };
}

export function ProjectForm({ departments, segments, project, onCreate, onEdit, onCancelEdit }: ProjectFormProps) {
  const [values, setValues] = useState<FormValues>(() => blankValues(departments, segments));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      setValues(blankValues(departments, segments));
      return;
    }
    setValues({
      title: project.title, description: project.description, workType: project.workType,
      departmentId: project.department.id, status: project.status === "completed" ? "active" : project.status === "cancelled" ? "planned" : project.status as CreateProject["status"],
      impact: project.impact, startDate: project.startDate, endDate: project.endDate,
      earliestStartDate: project.earliestStartDate ?? "", latestEndDate: project.latestEndDate ?? "",
      segmentIds: project.segments.map(({ id }) => id), sourceLabel: project.sourceLabel,
      reason: "",
    });
    setError(null);
  }, [departments, project, segments]);

  function change<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const bounds = values.earliestStartDate.trim() || values.latestEndDate.trim()
      ? { earliestStartDate: values.earliestStartDate, latestEndDate: values.latestEndDate }
      : { earliestStartDate: null, latestEndDate: null };
    try {
      if (project) {
        if (values.status !== "planned" && (values.earliestStartDate || values.latestEndDate)) {
          throw new Error("Clear both flexibility dates before changing a project from planned status.");
        }
        if (!values.reason.trim()) throw new Error("Add a reason for this project edit.");
        const changes = {
          title: values.title, description: values.description, workType: values.workType,
          departmentId: values.departmentId, status: values.status, impact: values.impact,
          sourceLabel: values.sourceLabel, segmentIds: values.segmentIds,
          ...(values.earliestStartDate.trim() || values.latestEndDate.trim() ? bounds : { earliestStartDate: null, latestEndDate: null }),
        };
        await onEdit(project, values.reason, changes);
      } else {
        const input: CreateProject = {
          title: values.title, description: values.description, workType: values.workType,
          departmentId: values.departmentId, status: values.status, impact: values.impact,
          startDate: values.startDate, endDate: values.endDate, ...bounds,
          segmentIds: values.segmentIds, sourceLabel: values.sourceLabel,
        };
        await onCreate(input);
        setValues(blankValues(departments, segments));
      }
    } catch (submitError) {
      setError(submitError instanceof ApiClientError ? submitError.message : submitError instanceof Error ? submitError.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSegment(id: string) {
    const next = values.segmentIds.includes(id) ? values.segmentIds.filter((segmentId) => segmentId !== id) : [...values.segmentIds, id];
    change("segmentIds", next);
  }

  return (
    <form className="operator-form" onSubmit={(event) => void submit(event)}>
      <div className="form-title-row"><div><p className="eyebrow">{project ? "EDIT RECORD" : "NEW RECORD"}</p><h3>{project ? "Project details" : "Create a project"}</h3></div>{project && <button type="button" className="text-link" onClick={onCancelEdit}>Cancel edit</button>}</div>
      <label>Project title<input required maxLength={160} value={values.title} onChange={(event) => change("title", event.target.value)} /></label>
      <label>Description<textarea required rows={3} maxLength={2000} value={values.description} onChange={(event) => change("description", event.target.value)} /></label>
      <div className="form-grid">
        <label>Work type<select value={values.workType} onChange={(event) => change("workType", event.target.value as CreateProject["workType"])}><option value="excavation">Excavation</option><option value="resurfacing">Resurfacing</option><option value="other">Other</option></select></label>
        <label>Department<select required value={values.departmentId} onChange={(event) => change("departmentId", event.target.value)}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <label>Status<select value={values.status} onChange={(event) => change("status", event.target.value as CreateProject["status"])}><option value="planned">Planned</option><option value="active">Active</option>{project && <><option value="paused">Paused</option><option value="cancelled">Cancelled</option></>}</select></label>
        {!project && <><label>Start date<input required type="date" value={values.startDate} onChange={(event) => change("startDate", event.target.value)} /></label><label>End date<input required type="date" value={values.endDate} onChange={(event) => change("endDate", event.target.value)} /></label></>}
      </div>
      <label>Resident impact<input required maxLength={500} value={values.impact} onChange={(event) => change("impact", event.target.value)} /></label>
      <fieldset className="segment-picker"><legend>Road segment</legend>{segments.map((segment) => <label className="checkbox-row" key={segment.id}><input type="checkbox" checked={values.segmentIds.includes(segment.id)} onChange={() => toggleSegment(segment.id)} /><span>{segment.roadName} <small>{segment.fromLabel} to {segment.toLabel}</small></span></label>)}</fieldset>
      {!project && <fieldset className="window-fields"><legend>Optional flexibility window</legend><p>Enter both dates only when the schedule is flexible and the officer is authorized to set its bounds.</p><div className="form-grid"><label>Earliest start<input type="date" value={values.earliestStartDate} onChange={(event) => change("earliestStartDate", event.target.value)} /></label><label>Latest end<input type="date" value={values.latestEndDate} onChange={(event) => change("latestEndDate", event.target.value)} /></label></div></fieldset>}
      <label>Source label<input required maxLength={160} value={values.sourceLabel} onChange={(event) => change("sourceLabel", event.target.value)} /></label>
      {project && <label>Reason for this edit<textarea required minLength={10} maxLength={500} rows={2} value={values.reason} onChange={(event) => change("reason", event.target.value)} placeholder="Explain the change for the public record" /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">{project && <button type="button" className="button button-secondary" onClick={onCancelEdit}>Cancel</button>}<button className="button button-primary" disabled={saving || departments.length === 0 || segments.length === 0}>{saving ? "Saving…" : project ? "Save project changes" : "Create project"}</button></div>
    </form>
  );
}
