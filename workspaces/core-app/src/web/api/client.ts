import type { CreateProject, Department, ListResponse, OperatorReport, ProjectDetail, ProjectStatus, ProjectSummary, PublishUpdate, ReportCategory, ReportStatus, Reschedule, Segment } from "../../shared/contracts";
import type { IntakeResult, ScenarioAnalysis } from "@onedig/innovation/contracts";

export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(0, "NETWORK_UNAVAILABLE", "The service could not be reached. Check your connection and try again.");
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    throw new ApiClientError(
      response.status,
      result?.error?.code ?? "REQUEST_FAILED",
      result?.error?.message ?? "The request could not be completed.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getProjects(filters: { status?: ProjectStatus; departmentId?: string; q?: string } = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.departmentId) query.set("departmentId", filters.departmentId);
  if (filters.q) query.set("q", filters.q);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return request<ListResponse<ProjectSummary>>(`/projects${suffix}`);
}

export async function getProject(id: string) {
  return request<ProjectDetail>(`/projects/${encodeURIComponent(id)}`);
}

export async function getSegments() {
  return request<ListResponse<Segment>>("/segments");
}

export async function getDepartments() {
  return request<ListResponse<Department>>("/departments");
}

export function getOperatorSession() {
  return request<{ authenticated: boolean }>("/operator/session");
}

export function loginOperator(password: string) {
  return request<{ authenticated: true; operatorLabel: string }>("/operator/session", {
    method: "POST", body: JSON.stringify({ password }),
  });
}

export function logoutOperator() {
  return request<void>("/operator/session", { method: "DELETE" });
}

export function createProject(input: CreateProject) {
  return request<ProjectDetail>("/operator/projects", { method: "POST", body: JSON.stringify(input) });
}

export function editProject(id: string, input: { version: number; reason: string; changes: Record<string, unknown> }) {
  return request<ProjectDetail>(`/operator/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function rescheduleProject(id: string, input: Reschedule) {
  return request<ProjectDetail>(`/operator/projects/${encodeURIComponent(id)}/reschedule`, { method: "POST", body: JSON.stringify(input) });
}

export function publishProjectUpdate(id: string, input: PublishUpdate) {
  return request<unknown>(`/operator/projects/${encodeURIComponent(id)}/updates`, { method: "POST", body: JSON.stringify(input) });
}

export function submitReport(input: { projectId: string; category: ReportCategory; description: string }) {
  return request<{ reportId: string; receiptToken: string; status: "new"; createdAt: string }>("/reports", { method: "POST", body: JSON.stringify(input) });
}

export function trackReport(receiptToken: string) {
  return request<{ reportId: string; projectId: string; category: ReportCategory; status: ReportStatus; operatorResponse: string | null; updatedAt: string }>("/reports/track", { method: "POST", body: JSON.stringify({ receiptToken }) });
}

export function getOperatorReports(status?: ReportStatus) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<ListResponse<OperatorReport>>(`/operator/reports${suffix}`);
}

export function updateOperatorReport(id: string, status: ReportStatus, operatorResponse: string | null) {
  return request<OperatorReport>(`/operator/reports/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify({ status, operatorResponse }),
  });
}

export function analyzeCoordination(focusProjectId: string) {
  return request<ScenarioAnalysis>("/operator/coordination/analyze", {
    method: "POST", body: JSON.stringify({ focusProjectId }),
  });
}

export function extractNoticeDraft(rawText: string) {
  return request<IntakeResult>("/operator/intake/extract", {
    method: "POST", body: JSON.stringify({ rawText }),
  });
}
