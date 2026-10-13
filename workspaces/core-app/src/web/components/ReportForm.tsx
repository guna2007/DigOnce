import { useState } from "react";
import type { ReportCategory } from "../../shared/contracts";
import { ApiClientError, submitReport } from "../api/client";

interface ReportFormProps {
  projectId: string;
  onReceipt(token: string): void;
}

export function ReportForm({ projectId, onReceipt }: ReportFormProps) {
  const [category, setCategory] = useState<ReportCategory>("access");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const receipt = await submitReport({ projectId, category, description });
      setDescription("");
      onReceipt(receipt.receiptToken);
    } catch (submitError) {
      setError(submitError instanceof ApiClientError ? submitError.message : "Your concern could not be submitted. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="report-form" onSubmit={(event) => void submit(event)}>
      <p className="eyebrow">RESIDENT FEEDBACK</p><h2>Report a concern</h2>
      <p>Your report is private. No name or contact details are requested. Save the receipt shown after you submit.</p>
      <label>Concern type<select value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)}><option value="access">Access</option><option value="safety">Safety</option><option value="quality">Work quality</option><option value="other">Other</option></select></label>
      <label>What would you like the project team to know?<textarea required minLength={10} maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the concern without including personal information" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={sending}>{sending ? "Submitting…" : "Submit concern"}</button>
    </form>
  );
}
