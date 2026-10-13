import { useState } from "react";
import type { ProjectSummary, PublishUpdate } from "../../shared/contracts";
import { ApiClientError } from "../api/client";

interface UpdateFormProps {
  project: ProjectSummary;
  onPublish(update: PublishUpdate): Promise<void>;
}

export function UpdateForm({ project, onPublish }: UpdateFormProps) {
  const [type, setType] = useState<PublishUpdate["type"]>("progress");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [revisedEndDate, setRevisedEndDate] = useState(project.endDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onPublish({
        version: project.version, type, summary,
        ...(reason.trim() ? { reason } : {}),
        ...(type === "delay" ? { revisedEndDate } : {}),
      });
      setSummary("");
      setReason("");
    } catch (submitError) {
      setError(submitError instanceof ApiClientError ? submitError.message : submitError instanceof Error ? submitError.message : "Update could not be published.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="operator-form compact-form" onSubmit={(event) => void submit(event)}>
      <p className="eyebrow">PUBLIC UPDATE</p><h3>Publish progress or a delay</h3>
      <label>Update type<select value={type} onChange={(event) => setType(event.target.value as PublishUpdate["type"])}><option value="progress">Progress</option><option value="delay">Delay</option></select></label>
      <label>Resident-facing summary<textarea required minLength={5} maxLength={240} rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      {type === "delay" && <>
        <label>Why is the work delayed?<textarea required minLength={10} maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label>Revised end date<input required type="date" min={project.endDate} value={revisedEndDate} onChange={(event) => setRevisedEndDate(event.target.value)} /></label>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={saving}>{saving ? "Publishing…" : "Publish update"}</button>
    </form>
  );
}
