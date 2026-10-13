import { useCallback, useEffect, useState } from "react";
import { CoordinationStudio } from "@onedig/innovation/ui";
import type { ScenarioAnalysis, ScenarioCandidate } from "@onedig/innovation/contracts";
import type { ProjectDetail, ProjectSummary } from "../../shared/contracts";
import { analyzeCoordination, ApiClientError, getOperatorSession, getProjects, rescheduleProject } from "../api/client";

interface StudioPageProps {
  initialProjectId?: string | null;
  onBack(): void;
  onOpenProject(id: string): void;
}

export function StudioPage({ initialProjectId, onBack, onOpenProject }: StudioPageProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [focusId, setFocusId] = useState(initialProjectId ?? "");
  const [analysis, setAnalysis] = useState<ScenarioAnalysis | null>(null);
  const [state, setState] = useState<"checking" | "signed-out" | "loading" | "ready">("checking");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (id = focusId): Promise<ScenarioAnalysis> => {
    if (!id) throw new Error("Choose a focus project.");
    setError(null);
    try {
      const next = await analyzeCoordination(id);
      setAnalysis(next);
      return next;
    } catch (caught) {
      const message = caught instanceof ApiClientError ? caught.message : "Schedule analysis could not be computed.";
      setError(message);
      throw caught;
    }
  }, [focusId]);

  useEffect(() => {
    let current = true;
    void getOperatorSession().then(async (session) => {
      if (!current) return;
      if (!session.authenticated) { setState("signed-out"); return; }
      setState("loading");
      const result = await getProjects();
      if (!current) return;
      const planned = result.items.filter((project) => project.status === "planned");
      setProjects(planned);
      const chosen = planned.some(({ id }) => id === initialProjectId) ? initialProjectId! : planned[0]?.id ?? "";
      setFocusId(chosen);
      setState("ready");
    }).catch((caught) => {
      if (!current) return;
      setError(caught instanceof ApiClientError ? caught.message : "The Studio could not be loaded.");
      setState("ready");
    });
    return () => { current = false; };
  }, [initialProjectId]);

  useEffect(() => {
    if (state !== "ready" || !focusId) return;
    setAnalysis(null);
    void refresh(focusId).catch(() => undefined);
  }, [focusId, state, refresh]);

  async function apply(candidate: ScenarioCandidate, publicReason: string): Promise<ProjectDetail> {
    if (!analysis) throw new Error("Refresh the analysis before applying a schedule.");
    const updated = await rescheduleProject(analysis.focusProjectId, {
      version: analysis.focusVersion,
      startDate: candidate.startDate,
      endDate: candidate.endDate,
      reason: publicReason,
      expectedPeerVersions: candidate.expectedPeerVersions,
    });
    const latestProjects = await getProjects();
    setProjects(latestProjects.items.filter((project) => project.status === "planned"));
    return updated;
  }

  if (state === "checking" || state === "loading") return <div className="operator-page"><div className="state-card" role="status"><span className="spinner" aria-hidden="true" />Loading Dig Once Studio…</div></div>;
  if (state === "signed-out") return <div className="operator-page"><div className="state-card error-state"><h1>Operator sign-in required</h1><p>Sign in from the operator workspace before opening schedule analysis.</p><button className="button button-primary" onClick={onBack}>Go to operator sign-in</button></div></div>;

  return <div className="operator-page innovation-page">
    <section className="operator-intro">
      <div><p className="eyebrow">OPERATOR WORKSPACE</p><h1>Dig Once Studio</h1><p>Review computed schedule alternatives against the live public-works record.</p></div>
      <button className="button button-secondary" onClick={onBack}>Back to operator</button>
    </section>
    <section className="operator-panel innovation-picker">
      <label>Focus project<select value={focusId} onChange={(event) => setFocusId(event.currentTarget.value)}>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.title} · version {project.version}</option>)}
      </select></label>
      {focusId && <button className="text-link" onClick={() => onOpenProject(focusId)}>Open resident record →</button>}
    </section>
    {error && <div className="state-card error-state" role="alert"><p>{error}</p>{focusId && <button className="button button-secondary" onClick={() => void refresh().catch(() => undefined)}>Retry analysis</button>}</div>}
    {projects.length === 0 ? <div className="state-card"><p>No planned projects are available for analysis.</p></div> : analysis ? <CoordinationStudio analysis={analysis} busy={false} onRefresh={refresh} onApply={apply} /> : !error && <div className="state-card" role="status"><span className="spinner" aria-hidden="true" />Computing warnings and alternatives…</div>}
  </div>;
}
