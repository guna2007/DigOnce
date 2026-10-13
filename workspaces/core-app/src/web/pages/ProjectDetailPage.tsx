import { useEffect, useState } from "react";
import type { ProjectDetail } from "../../shared/contracts";
import { ApiClientError, getProject } from "../api/client";
import { ReportForm } from "../components/ReportForm";

interface ProjectDetailPageProps {
  id: string;
  onBack(): void;
  onReceipt(token: string): void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00.000Z`));
}

export function ProjectDetailPage({ id, onBack, onReceipt }: ProjectDetailPageProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void getProject(id).then((result) => {
      if (current) setProject(result);
    }).catch((loadError) => {
      if (current) setError(loadError instanceof ApiClientError && loadError.status === 404
        ? "This project could not be found. It may have been removed."
        : "Project details are unavailable right now. Try again.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [id]);

  if (loading) return <div className="state-card detail-state" role="status"><span className="spinner" aria-hidden="true" />Loading project details…</div>;
  if (error || !project) return (
    <div className="detail-page">
      <button className="text-link back-link" onClick={onBack}>← Back to public works</button>
      <div className="state-card error-state" role="alert"><h1>Project unavailable</h1><p>{error ?? "Project details could not be loaded."}</p></div>
    </div>
  );

  return (
    <div className="detail-page">
      <button className="text-link back-link" onClick={onBack}>← Back to public works</button>
      <article className="detail-hero">
        <div className="project-card-top">
          <span className={`status-chip status-${project.status}`}>{project.status.replaceAll("_", " ")}</span>
          {project.isDemo && <span className="demo-mini">Illustrative demo data</span>}
        </div>
        <p className="eyebrow">{project.workType.replaceAll("_", " ").toUpperCase()} · {project.department.name.toUpperCase()}</p>
        <h1>{project.title}</h1>
        <p className="detail-description">{project.description}</p>
        <p className="detail-impact"><strong>What to expect</strong><br />{project.impact}</p>
        <p className="source-line">Source: {project.sourceLabel}</p>
      </article>

      <div className="detail-columns">
        <section className="detail-section schedule-card">
          <p className="eyebrow">SCHEDULE</p><h2>Planned dates</h2>
          <p className="schedule-dates">{formatDate(project.startDate)} <span aria-hidden="true">→</span> {formatDate(project.actualEndDate ?? project.endDate)}</p>
          {project.actualEndDate && <p>Completed on {formatDate(project.actualEndDate)}</p>}
          {project.segments.map((segment) => <p key={segment.id} className="project-road">{segment.roadName}<br />{segment.fromLabel} to {segment.toLabel}</p>)}
          <p className="report-count">{project.reportCount} resident {project.reportCount === 1 ? "concern" : "concerns"} submitted</p>
        </section>
        <section className="detail-section timeline-section">
          <p className="eyebrow">PUBLIC RECORD</p><h2>Project timeline</h2>
          {project.events.length === 0 ? <p className="muted-copy">No updates have been published yet.</p> : (
            <ol className="timeline">
              {project.events.map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div><p className="timeline-date">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p>
                    <h3>{event.summary}</h3>{event.reason && <p>{event.reason}</p>}
                    {(event.previousStartDate || event.newStartDate) && <p className="timeline-dates">{event.previousStartDate ? formatDate(event.previousStartDate) : "—"} → {event.newStartDate ? formatDate(event.newStartDate) : "—"}</p>}
                    <p className="timeline-author">Published by {event.authorLabel}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section className="resident-report-section"><ReportForm key={project.id} projectId={project.id} onReceipt={onReceipt} /></section>
    </div>
  );
}
