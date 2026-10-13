import { useEffect, useState } from "react";
import type { ReportCategory, ReportStatus } from "../../shared/contracts";
import { ApiClientError, trackReport } from "../api/client";

interface ReceiptPageProps {
  initialToken?: string;
  onBack(): void;
}

interface TrackedReceipt {
  reportId: string;
  projectId: string;
  category: ReportCategory;
  status: ReportStatus;
  operatorResponse: string | null;
  updatedAt: string;
}

function statusDescription(status: ReportStatus): string {
  if (status === "new") return "Your concern has been sent to the project team.";
  if (status === "in_review") return "The project team is reviewing your concern.";
  return "The project team has responded to your concern.";
}

export function ReceiptPage({ initialToken, onBack }: ReceiptPageProps) {
  const [token, setToken] = useState(initialToken ?? "");
  const [receipt, setReceipt] = useState<TrackedReceipt | null>(null);
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function checkReceipt(receiptToken: string) {
    setLoading(true);
    setError(null);
    try {
      setReceipt(await trackReport(receiptToken));
    } catch (loadError) {
      setReceipt(null);
      setError(loadError instanceof ApiClientError ? loadError.message : "Receipt status could not be checked. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialToken) void checkReceipt(initialToken);
  }, [initialToken]);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setError("Copy is unavailable here. Select and copy the receipt text manually.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await checkReceipt(token.trim());
  }

  return (
    <div className="receipt-page">
      <button className="text-link back-link" onClick={onBack}>← Back to public works</button>
      <section className="receipt-card">
        <div className="receipt-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">PRIVATE RECEIPT</p><h1>Your concern is on record.</h1>
        {initialToken && <>
          <p className="receipt-instruction">Save this receipt code. It is the private key to check for a response.</p>
          <div className="receipt-token-row"><code>{initialToken}</code><button className="button button-secondary" onClick={() => void copyToken()}>{copied ? "Copied" : "Copy receipt"}</button></div>
        </>}
        {loading && <p className="receipt-state" role="status"><span className="spinner" aria-hidden="true" />Checking receipt…</p>}
        {!loading && receipt && <div className="receipt-result" role="status">
          <span className={`status-chip status-${receipt.status}`}>{receipt.status.replaceAll("_", " ")}</span>
          <h2>{statusDescription(receipt.status)}</h2>
          {receipt.operatorResponse && <div className="operator-response"><p className="eyebrow">PROJECT TEAM RESPONSE</p><p>{receipt.operatorResponse}</p></div>}
          <p className="receipt-updated">Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.updatedAt))}</p>
        </div>}
        {!loading && error && <p className="form-error" role="alert">{error}</p>}
        <form className="track-form" onSubmit={(event) => void submit(event)}>
          <label>Check a receipt code<input type="text" autoComplete="off" spellCheck={false} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your private receipt code" /></label>
          <button className="button button-primary" disabled={!token.trim() || loading}>{loading ? "Checking…" : "Check status"}</button>
        </form>
      </section>
    </div>
  );
}
