import { useCallback, useEffect, useState } from "react";
import type { CreateProject, ProjectSummary, PublishUpdate } from "../../shared/contracts";
import {
  ApiClientError, createProject, editProject, getDepartments, getOperatorSession, getProjects,
  getSegments, loginOperator, logoutOperator, publishProjectUpdate, rescheduleProject,
} from "../api/client";
import type { Department, Segment } from "../../shared/contracts";
import { ProjectForm } from "../components/ProjectForm";
import { UpdateForm } from "../components/UpdateForm";
import { OperatorReportsPage } from "./OperatorReportsPage";

interface OperatorDashboardPageProps {
  onOpenProject(id: string): void;
  onOpenStudio(id?: string): void;
  onOpenIntake(): void;
}

type ViewState = "checking" | "signed-out" | "loading" | "ready";

export function OperatorDashboardPage({ onOpenProject, onOpenStudio, onOpenIntake }: OperatorDashboardPageProps) {
  const [view, setView] = useState<ViewState>("checking");
  const [operatorLabel, setOperatorLabel] = useState("Operator");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editing, setEditing] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleReason, setScheduleReason] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const refresh = useCallback(async (selectId?: string) => {
    setView("loading");
    setGlobalError(null);
    try {
      const [projectResult, departmentResult, segmentResult] = await Promise.all([getProjects(), getDepartments(), getSegments()]);
      setProjects(projectResult.items);
      setDepartments(departmentResult.items);
      setSegments(segmentResult.items);
      setSelectedProjectId(selectId ?? ((current) => projectResult.items.some((project) => project.id === current) ? current : projectResult.items[0]?.id ?? ""));
      setView("ready");
    } catch (error) {
      setGlobalError(error instanceof ApiClientError ? error.message : "Operator workspace could not be loaded.");
      setView("ready");
    }
  }, []);

  useEffect(() => {
    let current = true;
    void getOperatorSession().then((session) => {
      if (!current) return;
      if (!session.authenticated) setView("signed-out");
      else void refresh();
    }).catch((error) => {
      if (!current) return;
      setLoginError(error instanceof ApiClientError ? error.message : "Could not check operator access.");
      setView("signed-out");
    });
    return () => { current = false; };
  }, [refresh]);

  useEffect(() => {
    if (!selectedProject) return;
    setScheduleStart(selectedProject.startDate);
    setScheduleEnd(selectedProject.endDate);
    setScheduleReason("");
    setScheduleError(null);
    setScheduleSaved(false);
  }, [selectedProject?.id]);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    try {
      const session = await loginOperator(password);
      setPassword("");
      setOperatorLabel(session.operatorLabel);
      await refresh();
    } catch (error) {
      setLoginError(error instanceof ApiClientError ? error.message : "Sign-in failed. Try again.");
    }
  }

  async function signOut() {
    try {
      await logoutOperator();
      setView("signed-out");
      setProjects([]);
      setPassword("");
    } catch (error) {
      setGlobalError(error instanceof ApiClientError ? error.message : "Could not sign out.");
    }
  }

  if (view === "checking" || view === "loading") {
    return <div className="operator-page"><div className="state-card" role="status"><span className="spinner" aria-hidden="true" />{view === "checking" ? "Checking operator access…" : "Loading the operator workspace…"}</div></div>;
  }

  if (view === "signed-out") {
    return (
      <div className="operator-page login-page">
        <section className="login-card">
          <p className="eyebrow">OPERATOR ACCESS</p><h1>Sign in to OneDig</h1>
          <p>Use the operator password configured for this local demo.</p>
          <form className="operator-form" onSubmit={(event) => void submitLogin(event)}>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {loginError && <p role="alert" className="form-error">{loginError}</p>}
            <button className="button button-primary">Sign in</button>
          </form>
        </section>
      </div>
    );
  }

  async function handleCreate(input: CreateProject) {
    const created = await createProject(input);
    await refresh(created.id);
    setEditing(false);
  }

  async function handleEdit(project: ProjectSummary, reason: string, changes: Record<string, unknown>) {
    const updated = await editProject(project.id, { version: project.version, reason, changes });
    await refresh(updated.id);
    setEditing(false);
  }

  async function handleReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setScheduleError(null);
    setScheduleSaved(false);
    try {
      const result = await rescheduleProject(selectedProject.id, {
        version: selectedProject.version,
        startDate: scheduleStart,
        endDate: scheduleEnd,
        reason: scheduleReason,
      });
      await refresh(result.id);
      setScheduleSaved(true);
    } catch (error) {
      setScheduleError(error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : "Schedule could not be saved.");
    }
  }

  async function handleUpdate(update: PublishUpdate) {
    if (!selectedProject) return;
    await publishProjectUpdate(selectedProject.id, update);
    await refresh(selectedProject.id);
  }

  return (
    <div className="operator-page">
      <section className="operator-intro">
        <div><p className="eyebrow">OPERATOR WORKSPACE</p><h1>Keep the public record current.</h1><p>Manage planned work and publish changes residents can see.</p></div>
        <div className="operator-user"><span>Signed in as <strong>{operatorLabel}</strong></span><button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></div>
      </section>
      {globalError && <div className="state-card error-state" role="alert"><p>{globalError}</p><button className="button button-secondary" onClick={() => void refresh()}>Reload workspace</button></div>}
      <div className="integration-actions" aria-label="Integrated coordination tools">
        <div><strong>Turn a departmental notice into a reviewed draft.</strong><span>Evidence remains visible and nothing is saved until you confirm it.</span><button className="button button-secondary" onClick={onOpenIntake}>Open notice intake</button></div>
        <div><strong>Compute a safer street schedule.</strong><span>Analyze live project dates and apply only after an operator supplies a public reason.</span><button className="button button-primary" onClick={() => onOpenStudio(selectedProject?.id)}>Open Dig Once Studio</button></div>
      </div>
      <div className="operator-grid">
        <section className="operator-panel">
          <ProjectForm
            key={editing && selectedProject ? `edit-${selectedProject.id}-${selectedProject.version}` : "create-project"}
            departments={departments} segments={segments} project={editing ? selectedProject : undefined}
            onCreate={handleCreate} onEdit={handleEdit} onCancelEdit={() => setEditing(false)}
          />
        </section>
        <section className="operator-panel workflow-panel">
          <p className="eyebrow">PUBLISHED RECORDS</p><h2>Manage a project</h2>
          {projects.length === 0 ? <p className="muted-copy">No projects are available yet. Create one to get started.</p> : <>
            <label className="project-select">Project<select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setEditing(false); }}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.status}</option>)}
            </select></label>
            {selectedProject && <>
              <div className="operator-project-summary"><span className={`status-chip status-${selectedProject.status}`}>{selectedProject.status}</span><span>Version {selectedProject.version}</span></div>
              {!editing && <button className="text-link edit-trigger" onClick={() => setEditing(true)}>Edit project details →</button>}
              <form className="operator-form compact-form schedule-form" onSubmit={(event) => void handleReschedule(event)}>
                <p className="eyebrow">MANUAL SCHEDULE</p><h3>Reschedule this project</h3>
                <div className="form-grid"><label>Start date<input type="date" required value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} /></label><label>End date<input type="date" required value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} /></label></div>
                <label>Public reason<textarea required minLength={10} maxLength={500} rows={2} value={scheduleReason} onChange={(event) => setScheduleReason(event.target.value)} /></label>
                {scheduleError && <p className="form-error" role="alert">{scheduleError}</p>}
                {scheduleSaved && <p className="form-success" role="status">Schedule saved and visible on the resident record.</p>}
                <button className="button button-primary" disabled={selectedProject.status !== "planned"}>Save schedule</button>
                {selectedProject.status !== "planned" && <p className="form-hint">Only planned projects can be rescheduled.</p>}
              </form>
              <UpdateForm key={`${selectedProject.id}-${selectedProject.version}`} project={selectedProject} onPublish={handleUpdate} />
              <button className="text-link resident-preview-link" onClick={() => onOpenProject(selectedProject.id)}>Open resident project record →</button>
            </>}
          </>}
        </section>
      </div>
      <OperatorReportsPage />
    </div>
  );
}
