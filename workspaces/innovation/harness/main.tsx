import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzeScenario } from "@onedig/innovation/engine";
import { CoordinationStudio } from "@onedig/innovation/ui";
import { NoticeIntakePanel } from "@onedig/innovation/ui";
import { extractNoticeFallback } from "../src/intake/fallback.js";
import type { CreateProject, Department, ProjectDetail, ScenarioCandidate, ScenarioSnapshot, Segment } from "@onedig/innovation/contracts";
import { marketRoadNotice, marketRoadSnapshot } from "../fixtures/marketRoad.js";

const departments: Department[] = [{ id: "water", name: "Water Department", contactLabel: null }];
const intakeSegments: Segment[] = [{
  id: "seg-market-1", roadName: "Market Road", fromLabel: "Library", toLabel: "Bus Stand",
  aliases: ["Market Road", "Library to Bus Stand"],
  geometry: { type: "LineString", coordinates: [[72.8, 19.0], [72.801, 19.001]] }, center: { lat: 19.0005, lng: 72.8005 },
}];

function makeMockDetail(snapshot: ScenarioSnapshot, reason: string): ProjectDetail {
  const project = snapshot.projects.find((item) => item.id === snapshot.focusProjectId)!;
  const segment = snapshot.segments[0]!;
  return {
    id: project.id,
    title: project.title,
    description: "Illustrative water main replacement for the local fixture harness.",
    workType: project.workType,
    department: { id: "water", name: "Water Department (illustrative)", contactLabel: null },
    status: project.status,
    impact: "Illustrative lane access impact",
    startDate: project.startDate,
    endDate: project.endDate,
    actualEndDate: project.actualEndDate,
    earliestStartDate: project.earliestStartDate,
    latestEndDate: project.latestEndDate,
    segments: [{
      ...segment,
      aliases: ["Market Road", "Library to Bus Stand"],
      geometry: { type: "LineString", coordinates: [[72.8, 19.0], [72.801, 19.001]] },
      center: { lat: 19.0005, lng: 72.8005 },
    }],
    sourceLabel: "Illustrative demo data",
    isDemo: true,
    reportCount: 0,
    version: project.version,
    updatedAt: "2026-10-13T12:00:00.000Z",
    events: [{
      id: "mock-reschedule", type: "reschedule", summary: "Illustrative schedule adjustment",
      reason, previousStartDate: "2026-10-30", newStartDate: project.startDate,
      previousEndDate: "2026-11-04", newEndDate: project.endDate,
      authorLabel: "Fixture harness mock", createdAt: "2026-10-13T12:00:00.000Z",
    }],
  };
}

function Harness() {
  const [snapshot, setSnapshot] = useState(marketRoadSnapshot);
  const [screen, setScreen] = useState<"studio" | "intake">("studio");
  const snapshotRef = useRef(snapshot);
  const analysis = useMemo(() => analyzeScenario(snapshot), [snapshot]);

  async function onRefresh() {
    return analyzeScenario(snapshotRef.current);
  }

  async function onApply(candidate: ScenarioCandidate, reason: string) {
    const updated: ScenarioSnapshot = {
      ...snapshotRef.current,
      projects: snapshotRef.current.projects.map((project) => project.id === snapshotRef.current.focusProjectId
        ? { ...project, startDate: candidate.startDate, endDate: candidate.endDate, version: project.version + 1 }
        : project),
    };
    snapshotRef.current = updated;
    setSnapshot(updated);
    return makeMockDetail(updated, reason);
  }

  async function onExtract(rawText: string) {
    return extractNoticeFallback({ rawText, departments, segments: intakeSegments }, "fixture harness has no server API key");
  }

  async function onConfirm(project: CreateProject): Promise<ProjectDetail> {
    const segment = intakeSegments.find((item) => item.id === project.segmentIds[0])!;
    return {
      id: "mock-confirmed-project", title: project.title, description: project.description, workType: project.workType,
      department: departments.find((item) => item.id === project.departmentId)!, status: project.status, impact: project.impact,
      startDate: project.startDate, endDate: project.endDate, actualEndDate: null,
      earliestStartDate: project.earliestStartDate ?? null, latestEndDate: project.latestEndDate ?? null,
      segments: [segment], sourceLabel: project.sourceLabel, isDemo: true, reportCount: 0, version: 1,
      updatedAt: "2026-10-13T12:00:00.000Z", events: [],
    };
  }

  return <main className="harness-shell">
    <header className="harness-header">
      <p className="harness-label">Illustrative demo data · synthetic schedule</p>
      <h1>OneDig · Dig Once Studio</h1>
      <p>Market Road fixture · road resurfacing and a proposed water main excavation.</p>
      <span className="harness-mode">Mock callbacks · no live API or database</span>
      <nav className="harness-nav" aria-label="Fixture screens">
        <button type="button" aria-pressed={screen === "studio"} onClick={() => setScreen("studio")}>Dig Once Studio</button>
        <button type="button" aria-pressed={screen === "intake"} onClick={() => setScreen("intake")}>Notice intake</button>
      </nav>
    </header>
    {screen === "studio"
      ? <CoordinationStudio analysis={analysis} busy={false} onRefresh={onRefresh} onApply={onApply} />
      : <NoticeIntakePanel departments={departments} segments={intakeSegments} onExtract={onExtract} onConfirm={onConfirm} />}
  </main>;
}

const style = document.createElement("style");
style.textContent = `body{margin:0;background:#edf2ee;color:#17231e;font-family:system-ui,sans-serif}.harness-shell{max-width:980px;margin:0 auto;padding:clamp(1rem,4vw,2.5rem)}.harness-header{margin-bottom:1.25rem}.harness-header h1{margin:.25rem 0;font-size:clamp(1.7rem,5vw,2.5rem)}.harness-header p{color:#52655b}.harness-label{font-size:.8rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#176b4d!important}.harness-mode{display:inline-block;padding:.25rem .65rem;border:1px solid #98aa9e;border-radius:2rem;font-size:.8rem;font-weight:650}.harness-nav{display:flex;gap:.5rem;margin-top:1rem}.harness-nav button{min-height:2.6rem;padding:.5rem .8rem;border:1px solid #98aa9e;border-radius:.5rem;background:white;color:#17231e;font:inherit;font-weight:700}.harness-nav button[aria-pressed=true]{background:#176b4d;color:white}`;
document.head.append(style);
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
