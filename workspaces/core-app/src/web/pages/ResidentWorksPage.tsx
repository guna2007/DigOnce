import { useCallback, useEffect, useState } from "react";
import type { Department, ProjectStatus, ProjectSummary } from "../../shared/contracts";
import { ApiClientError, getDepartments, getProjects } from "../api/client";
import { WorksMap } from "../components/WorksMap";

interface ResidentWorksPageProps {
  onOpenProject(id: string): void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00.000Z`));
}

function statusLabel(status: ProjectStatus): string {
  return status.replaceAll("_", " ");
}

export function ResidentWorksPage({ onOpenProject }: ResidentWorksPageProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjects({
        ...(status ? { status: status as ProjectStatus } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
      });
      setProjects(result.items);
    } catch (loadError) {
      setError(loadError instanceof ApiClientError ? loadError.message : "Works could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, [departmentId, query, status]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void getDepartments().then((result) => setDepartments(result.items)).catch(() => setDepartments([]));
  }, []);

  return (
    <div className="resident-page">
      <section className="resident-intro">
        <div>
          <p className="eyebrow">PUBLIC WORKS RECORD</p>
          <h1>Know what’s happening on your street.</h1>
          <p className="intro-copy">Browse planned and active work, understand its impact, and follow every published update.</p>
        </div>
        <div className="provenance-badge"><span aria-hidden="true">●</span> Demo records are illustrative</div>
      </section>

      <div className="works-layout">
        <section className="works-list-panel" aria-labelledby="works-heading">
          <div className="section-heading list-heading">
            <div>
              <p className="eyebrow">SHARED STREET SCHEDULE</p>
              <h2 id="works-heading">Public works</h2>
            </div>
            <span className="result-count" aria-live="polite">{loading ? "Loading" : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}</span>
          </div>
          <div className="filters" aria-label="Filter public works">
            <label className="search-field">
              <span>Search projects</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Street or type of work" />
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label>
              <span>Department</span>
              <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
          </div>

          {loading && <div className="state-card" role="status"><span className="spinner" aria-hidden="true" />Loading the public works schedule…</div>}
          {!loading && error && (
            <div className="state-card error-state" role="alert">
              <h3>Couldn’t load public works</h3><p>{error}</p>
              <button className="button button-secondary" onClick={() => void loadProjects()}>Try again</button>
            </div>
          )}
          {!loading && !error && projects.length === 0 && (
            <div className="state-card empty-state"><h3>No projects match these filters</h3><p>Clear a filter or check back when new work is published.</p></div>
          )}
          {!loading && !error && projects.length > 0 && (
            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  <div className="project-card-top">
                    <span className={`status-chip status-${project.status}`}>{statusLabel(project.status)}</span>
                    {project.isDemo && <span className="demo-mini">Illustrative</span>}
                  </div>
                  <button className="project-title-link" onClick={() => onOpenProject(project.id)}>
                    <h3>{project.title}</h3>
                  </button>
                  <p className="project-road">{project.segments.map((segment) => `${segment.roadName} · ${segment.fromLabel} to ${segment.toLabel}`).join("; ") || "Location to be confirmed"}</p>
                  <p className="project-description">{project.description}</p>
                  <div className="project-card-footer">
                    <span>{project.department.name}</span>
                    <span>{formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
                  </div>
                  <button className="text-link" onClick={() => onOpenProject(project.id)}>View project details <span aria-hidden="true">→</span></button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="works-map-column">
          {!loading && !error && projects.length > 0 && <WorksMap projects={projects} onSelectProject={onOpenProject} />}
          {(loading || error || projects.length === 0) && (
            <div className="map-placeholder"><p className="eyebrow">STREET VIEW</p><h2>Works map</h2><p>The map will appear when projects are available.</p></div>
          )}
          <section className="resident-help-card">
            <p className="eyebrow">HAVE A CONCERN?</p>
            <h2>Tell us what you’re seeing.</h2>
            <p>Open a project to report an access, safety or quality concern and receive a private tracking receipt.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
