import type { IntakeResult, NoticeInput } from "../contracts.js";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

function blank(mode: "rules" | "manual", warning: string): IntakeResult {
  return {
    mode,
    draft: { title: null, description: null, workType: null, departmentId: null, impact: null, startDate: null, endDate: null, segmentIdCandidates: [] },
    evidence: [], warnings: [warning],
  };
}

function validIso(year: number, month: number, day: number): string | null {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function parseDates(text: string): { start: string; end: string; quote: string } | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\s*(?:to|through|–|—|-)\s*(\d{4})-(\d{2})-(\d{2})\b/i.exec(text);
  if (iso) {
    const start = validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const end = validIso(Number(iso[4]), Number(iso[5]), Number(iso[6]));
    return start && end && start <= end ? { start, end, quote: iso[0] } : null;
  }
  const range = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_PATTERN})\\s*(?:to|through|–|—|-)\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})[ ,]+(\\d{4})\\b`, "i").exec(text);
  if (!range) return null;
  const startMonth = MONTHS[range[2]!.toLowerCase()];
  const endMonth = MONTHS[range[4]!.toLowerCase()];
  const year = Number(range[5]);
  const start = validIso(year, startMonth!, Number(range[1]));
  const end = validIso(year, endMonth!, Number(range[3]));
  return start && end && start <= end ? { start, end, quote: range[0] } : null;
}

function aliasQuote(rawText: string, alias: string): string | null {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const match = new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, "i").exec(rawText);
  return match ? match[2]! : null;
}

export function extractNoticeFallback(input: NoticeInput, reason: string): IntakeResult {
  const draft: IntakeResult["draft"] = { title: null, description: null, workType: null, departmentId: null, impact: null, startDate: null, endDate: null, segmentIdCandidates: [] };
  const evidence: IntakeResult["evidence"] = [];
  const warnings: string[] = [`AI extraction unavailable (${reason}); rules/manual draft requires operator review.`];
  const dates = parseDates(input.rawText);
  if (dates) {
    draft.startDate = dates.start;
    draft.endDate = dates.end;
    evidence.push({ field: "startDate", quote: dates.quote }, { field: "endDate", quote: dates.quote });
  } else warnings.push("No supported date range was found; enter the dates manually.");

  const segmentMatches = input.segments.flatMap((segment) => {
    const quote = segment.aliases.map((alias) => aliasQuote(input.rawText, alias)).find((value) => value !== null);
    return quote ? [{ id: segment.id, quote }] : [];
  });
  if (segmentMatches.length) {
    draft.segmentIdCandidates = [...new Set(segmentMatches.map((match) => match.id))];
    for (const quote of [...new Set(segmentMatches.map((match) => match.quote))]) evidence.push({ field: "segmentIds", quote });
    if (draft.segmentIdCandidates.length > 1) warnings.push("Road segment aliases are ambiguous; operator selection is required.");
  } else warnings.push("No curated road alias was found; select a segment manually.");

  const deptMatches = input.departments.flatMap((department) => {
    const quote = aliasQuote(input.rawText, department.name);
    return quote ? [{ id: department.id, quote }] : [];
  });
  if (deptMatches.length === 1) {
    draft.departmentId = deptMatches[0]!.id;
    evidence.push({ field: "departmentId", quote: deptMatches[0]!.quote });
  } else if (deptMatches.length > 1) warnings.push("Department name is ambiguous; select a department manually.");

  const workTypeMatch = /\b(excavat(?:e|ion|ing)|dig(?:ging)?|trench(?:ing)?)\b/i.exec(input.rawText);
  const resurfacingMatch = /\b(resurfac(?:e|ing)|pav(?:e|ing))\b/i.exec(input.rawText);
  if (workTypeMatch) {
    draft.workType = "excavation";
    evidence.push({ field: "workType", quote: workTypeMatch[0] });
  } else if (resurfacingMatch) {
    draft.workType = "resurfacing";
    evidence.push({ field: "workType", quote: resurfacingMatch[0] });
  }

  if (dates || segmentMatches.length || deptMatches.length === 1 || workTypeMatch || resurfacingMatch) {
    warnings.push("Title, description, impact and any scheduling flexibility remain for officer entry.");
    return { mode: "rules", draft, evidence, warnings };
  }
  return blank("manual", "No reliable known aliases or date range were found; enter and review fields manually.");
}
