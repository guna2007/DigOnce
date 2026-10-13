import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { CoreDatabase } from "../db/database";
import type { OperatorReport, ReportCategory, ReportStatus } from "../../shared/contracts";
import { ApiFailure } from "../errors";

export interface ReceiptCreated {
  reportId: string;
  receiptToken: string;
  status: "new";
  createdAt: string;
}

export interface TrackedReport {
  reportId: string;
  projectId: string;
  category: ReportCategory;
  status: ReportStatus;
  operatorResponse: string | null;
  updatedAt: string;
}

function invalid(field: string, message: string): never {
  throw new ApiFailure(400, "VALIDATION_ERROR", message, { field });
}

function hashReceipt(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function validateText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 10 || trimmed.length > 500) invalid(field, `${field} must be between 10 and 500 characters.`);
  return trimmed;
}

export function createReport(
  database: CoreDatabase,
  input: { projectId: string; category: ReportCategory; description: string },
): ReceiptCreated {
  if (!database.prepare("SELECT 1 FROM projects WHERE id = ?").get(input.projectId)) {
    throw new ApiFailure(404, "NOT_FOUND", "Project not found.");
  }
  const description = validateText(input.description, "description");
  const reportId = `rpt_${randomUUID()}`;
  const receiptToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO reports (id, project_id, category, description, status, operator_response,
      receipt_token_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'new', NULL, ?, ?, ?)
  `).run(reportId, input.projectId, input.category, description, hashReceipt(receiptToken), now, now);
  return { reportId, receiptToken, status: "new", createdAt: now };
}

export function trackReport(database: CoreDatabase, receiptToken: string): TrackedReport {
  const report = database.prepare(`
    SELECT id, project_id, category, status, operator_response, updated_at
    FROM reports WHERE receipt_token_hash = ?
  `).get(hashReceipt(receiptToken)) as {
    id: string; project_id: string; category: ReportCategory; status: ReportStatus;
    operator_response: string | null; updated_at: string;
  } | undefined;
  if (!report) throw new ApiFailure(404, "NOT_FOUND", "Receipt not found.");
  return {
    reportId: report.id,
    projectId: report.project_id,
    category: report.category,
    status: report.status,
    operatorResponse: report.operator_response,
    updatedAt: report.updated_at,
  };
}

export function listOperatorReports(database: CoreDatabase, status?: ReportStatus): OperatorReport[] {
  const rows = status
    ? database.prepare(`SELECT id, project_id, category, description, status, operator_response, created_at, updated_at
        FROM reports WHERE status = ? ORDER BY created_at DESC, rowid DESC LIMIT 100`).all(status)
    : database.prepare(`SELECT id, project_id, category, description, status, operator_response, created_at, updated_at
        FROM reports ORDER BY created_at DESC, rowid DESC LIMIT 100`).all();
  return (rows as Array<{
    id: string; project_id: string; category: ReportCategory; description: string; status: ReportStatus;
    operator_response: string | null; created_at: string; updated_at: string;
  }>).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    description: row.description,
    status: row.status,
    operatorResponse: row.operator_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function updateOperatorReport(
  database: CoreDatabase,
  id: string,
  status: ReportStatus,
  operatorResponse: string | null,
): OperatorReport {
  const update = database.transaction(() => {
    const current = database.prepare("SELECT status FROM reports WHERE id = ?").get(id) as { status: ReportStatus } | undefined;
    if (!current) throw new ApiFailure(404, "NOT_FOUND", "Report not found.");

    const validTransition = (current.status === "new" && status === "in_review") ||
      (current.status === "in_review" && status === "resolved");
    if (!validTransition) invalid("status", "Reports must move from new to in review, then to resolved.");

    let response: string | null = null;
    if (status === "resolved") {
      if (operatorResponse === null) invalid("operatorResponse", "A response is required to resolve a report.");
      response = validateText(operatorResponse, "operatorResponse");
    } else if (operatorResponse !== null) {
      invalid("operatorResponse", "A response can only be saved when resolving a report.");
    }

    database.prepare("UPDATE reports SET status = ?, operator_response = ?, updated_at = ? WHERE id = ?")
      .run(status, response, new Date().toISOString(), id);
  });
  update.immediate();
  const result = listOperatorReports(database).find((report) => report.id === id);
  if (!result) throw new ApiFailure(404, "NOT_FOUND", "Report not found.");
  return result;
}
