import type { IntakeField, IntakeResult, NoticeInput, WorkType } from "../contracts.js";
import { dateToEpochDay } from "../engine/date.js";

export interface ProposedField<T> { value: T | null; quote: string | null }
export interface ProposedNotice {
  title: ProposedField<string>;
  description: ProposedField<string>;
  workType: ProposedField<WorkType>;
  departmentId: ProposedField<string>;
  startDate: ProposedField<string>;
  endDate: ProposedField<string>;
  impact: ProposedField<string>;
  segments: ProposedField<string[]>;
}

const EMPTY_DRAFT = () => ({
  title: null, description: null, workType: null, departmentId: null, impact: null,
  startDate: null, endDate: null, segmentIdCandidates: [] as string[],
});
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function addWarning(warnings: string[], message: string): void {
  if (!warnings.includes(message)) warnings.push(message);
}

function hasEvidence(input: NoticeInput, quote: string | null): quote is string {
  return typeof quote === "string" && quote.trim().length > 0 && input.rawText.includes(quote);
}

function validDate(value: string | null): value is string {
  if (typeof value !== "string") return false;
  try { dateToEpochDay(value); return true; } catch { return false; }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function aliasMatches(quote: string, alias: string): boolean {
  const normalizedQuote = ` ${normalize(quote)} `;
  const normalizedAlias = normalize(alias);
  return normalizedAlias.length > 0 && normalizedQuote.includes(` ${normalizedAlias} `);
}

export function validateProposedNotice(input: NoticeInput, proposed: ProposedNotice): IntakeResult {
  const draft: IntakeResult["draft"] = EMPTY_DRAFT();
  const evidence: IntakeResult["evidence"] = [];
  const warnings: string[] = [];
  const acceptString = (field: "title" | "description" | "impact", item: ProposedField<string>, label: string) => {
    if (item.value === null && item.quote === null) return;
    if (typeof item.value !== "string" || item.value.trim().length === 0 || !hasEvidence(input, item.quote)) {
      addWarning(warnings, `${label} was not supported by exact source evidence.`);
      return;
    }
    draft[field] = item.value.trim();
    evidence.push({ field, quote: item.quote });
  };

  acceptString("title", proposed.title, "Title");
  acceptString("description", proposed.description, "Description");
  acceptString("impact", proposed.impact, "Impact");

  if (proposed.workType.value !== null || proposed.workType.quote !== null) {
    const quote = proposed.workType.quote;
    const supportingWork = typeof quote === "string" && /\b(excavat(?:e|ion|ing)|dig(?:ging)?|resurfac(?:e|ing)|pav(?:e|ing)|repair|replace|install|construct|maintain)\b/i.test(quote);
    if (!hasEvidence(input, quote) || !["excavation", "resurfacing", "other"].includes(proposed.workType.value ?? "") || !supportingWork) {
      addWarning(warnings, "Work type was not supported by exact source evidence.");
    } else {
      draft.workType = proposed.workType.value;
      evidence.push({ field: "workType", quote });
    }
  }

  if (proposed.departmentId.value !== null || proposed.departmentId.quote !== null) {
    const department = input.departments.find((entry) => entry.id === proposed.departmentId.value);
    const quote = proposed.departmentId.quote;
    if (!department || !hasEvidence(input, quote) || !aliasMatches(quote, department.name)) {
      addWarning(warnings, "Department was not matched to a known department name in the source.");
    } else {
      draft.departmentId = department.id;
      evidence.push({ field: "departmentId", quote });
    }
  }

  const acceptDate = (field: "startDate" | "endDate", item: ProposedField<string>) => {
    if (item.value === null && item.quote === null) return;
    if (!validDate(item.value) || !hasEvidence(input, item.quote)) {
      addWarning(warnings, `${field === "startDate" ? "Start date" : "End date"} was not a real date supported by exact source evidence.`);
      return;
    }
    // Require date digits or a recognizable date fragment in the supporting source quote.
    const isoParts = item.value.split("-");
    const [year, month, day] = isoParts;
    const quote = normalize(item.quote);
    const monthNumber = Number(month);
    const monthName = MONTH_NAMES[monthNumber - 1];
    const dateSupported = item.quote.includes(item.value) || (
      quote.includes(String(Number(day))) &&
      (quote.includes(String(monthNumber)) || quote.includes(monthName!) || quote.includes(monthName!.slice(0, 3))) &&
      quote.includes(year!)
    );
    if (!dateSupported) {
      addWarning(warnings, `${field === "startDate" ? "Start date" : "End date"} quote does not identify the extracted date.`);
      return;
    }
    draft[field] = item.value;
    evidence.push({ field, quote: item.quote });
  };
  acceptDate("startDate", proposed.startDate);
  acceptDate("endDate", proposed.endDate);
  if (draft.startDate && draft.endDate && dateToEpochDay(draft.endDate) < dateToEpochDay(draft.startDate)) {
    draft.startDate = null;
    draft.endDate = null;
    for (let index = evidence.length - 1; index >= 0; index--) {
      if (evidence[index]?.field === "startDate" || evidence[index]?.field === "endDate") evidence.splice(index, 1);
    }
    addWarning(warnings, "Date range ends before it starts; both dates need operator review.");
  }

  if (proposed.segments.value !== null || proposed.segments.quote !== null) {
    const quote = proposed.segments.quote;
    if (!Array.isArray(proposed.segments.value) || !hasEvidence(input, quote)) {
      addWarning(warnings, "Road segment was not supported by exact source evidence.");
    } else {
      const matches = input.segments.filter((segment) => segment.aliases.some((alias) => aliasMatches(quote, alias)));
      const supplied = [...new Set(proposed.segments.value)];
      const allowed = new Set(matches.map((segment) => segment.id));
      if (matches.length === 0 || supplied.some((id) => !allowed.has(id))) {
        addWarning(warnings, "Road segment candidates did not match curated aliases in the source.");
      } else {
        draft.segmentIdCandidates = matches.map((segment) => segment.id);
        evidence.push({ field: "segmentIds", quote });
        if (matches.length > 1) addWarning(warnings, "Road segment name is ambiguous; operator selection is required.");
      }
    }
  }

  const labels: [IntakeField, string][] = [
    ["title", "Title"], ["description", "Description"], ["workType", "Work type"],
    ["departmentId", "Department"], ["startDate", "Start date"], ["endDate", "End date"],
    ["impact", "Impact"], ["segmentIds", "Road segment"],
  ];
  for (const [field, label] of labels) {
    const present = field === "segmentIds" ? draft.segmentIdCandidates.length > 0 : draft[field] !== null;
    if (!present) addWarning(warnings, `${label} is not stated or needs operator review.`);
  }
  return { mode: "ai", draft, evidence, warnings };
}
