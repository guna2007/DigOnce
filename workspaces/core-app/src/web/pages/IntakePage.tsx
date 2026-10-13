import { useEffect, useState } from "react";
import { NoticeIntakePanel } from "@onedig/innovation/ui";
import type { CreateProject as InnovationCreateProject } from "@onedig/innovation/contracts";
import type { Department, ProjectDetail, Segment } from "../../shared/contracts";
import { ApiClientError, createProject, extractNoticeDraft, getDepartments, getOperatorSession, getSegments } from "../api/client";

interface IntakePageProps {
  onBack(): void;
  onOpenStudio(id: string): void;
}

export function IntakePage({ onBack, onOpenStudio }: IntakePageProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [created, setCreated] = useState<ProjectDetail | null>(null);
  const [state, setState] = useState<"checking" | "signed-out" | "loading" | "ready">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void getOperatorSession().then(async (session) => {
      if (!current) return;
      if (!session.authenticated) { setState("signed-out"); return; }
      setState("loading");
      const [departmentResult, segmentResult] = await Promise.all([getDepartments(), getSegments()]);
      if (!current) return;
      setDepartments(departmentResult.items);
      setSegments(segmentResult.items);
      setState("ready");
    }).catch((caught) => {
      if (!current) return;
      setError(caught instanceof ApiClientError ? caught.message : "Notice intake could not be loaded.");
      setState("ready");
    });
    return () => { current = false; };
  }, []);

  async function confirm(input: InnovationCreateProject): Promise<ProjectDetail> {
    const project = await createProject(input);
    setCreated(project);
    return project;
  }

  if (state === "checking" || state === "loading") return <div className="operator-page"><div className="state-card" role="status"><span className="spinner" aria-hidden="true" />Loading notice intake…</div></div>;
  if (state === "signed-out") return <div className="operator-page"><div className="state-card error-state"><h1>Operator sign-in required</h1><p>Sign in before extracting or confirming a departmental notice.</p><button className="button button-primary" onClick={onBack}>Go to operator sign-in</button></div></div>;

  return <div className="operator-page innovation-page">
    <section className="operator-intro"><div><p className="eyebrow">OPERATOR WORKSPACE</p><h1>Notice intake</h1><p>Extract a reviewable draft with evidence, then confirm through the ordinary project workflow.</p></div><button className="button button-secondary" onClick={onBack}>Back to operator</button></section>
    {error && <div className="state-card error-state" role="alert">{error}</div>}
    {created && <div className="integration-success" role="status"><strong>Project persisted to the shared record.</strong><span>It is now available for residents and live coordination analysis.</span><button className="button button-primary" onClick={() => onOpenStudio(created.id)}>Analyze this project</button></div>}
    <NoticeIntakePanel departments={departments} segments={segments} onExtract={extractNoticeDraft} onConfirm={confirm} />
  </div>;
}
