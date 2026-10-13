PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_label TEXT
);

CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  road_name TEXT NOT NULL,
  from_label TEXT NOT NULL,
  to_label TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(aliases_json)),
  geometry_json TEXT NOT NULL CHECK (json_valid(geometry_json)),
  center_lat REAL NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lng REAL NOT NULL CHECK (center_lng BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  work_type TEXT NOT NULL CHECK (work_type IN ('excavation', 'resurfacing', 'other')),
  department_id TEXT NOT NULL REFERENCES departments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  impact TEXT NOT NULL,
  start_date TEXT NOT NULL CHECK (date(start_date) = start_date),
  end_date TEXT NOT NULL CHECK (date(end_date) = end_date AND end_date >= start_date),
  actual_end_date TEXT CHECK (actual_end_date IS NULL OR date(actual_end_date) = actual_end_date),
  earliest_start_date TEXT CHECK (earliest_start_date IS NULL OR date(earliest_start_date) = earliest_start_date),
  latest_end_date TEXT CHECK (latest_end_date IS NULL OR date(latest_end_date) = latest_end_date),
  source_label TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((earliest_start_date IS NULL AND latest_end_date IS NULL) OR
         (earliest_start_date IS NOT NULL AND latest_end_date IS NOT NULL)),
  CHECK (earliest_start_date IS NULL OR earliest_start_date <= start_date),
  CHECK (latest_end_date IS NULL OR end_date <= latest_end_date)
);

CREATE TABLE IF NOT EXISTS project_segments (
  project_id TEXT NOT NULL REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES segments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (project_id, segment_id)
);

CREATE TABLE IF NOT EXISTS project_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created', 'edit', 'reschedule', 'progress', 'delay', 'completed')),
  summary TEXT NOT NULL,
  reason TEXT,
  previous_start_date TEXT CHECK (previous_start_date IS NULL OR date(previous_start_date) = previous_start_date),
  new_start_date TEXT CHECK (new_start_date IS NULL OR date(new_start_date) = new_start_date),
  previous_end_date TEXT CHECK (previous_end_date IS NULL OR date(previous_end_date) = previous_end_date),
  new_end_date TEXT CHECK (new_end_date IS NULL OR date(new_end_date) = new_end_date),
  author_label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('safety', 'access', 'quality', 'other')),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
  operator_response TEXT,
  receipt_token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status != 'resolved' OR (operator_response IS NOT NULL AND length(operator_response) BETWEEN 10 AND 500))
);

CREATE INDEX IF NOT EXISTS idx_projects_status_start ON projects(status, start_date);
CREATE INDEX IF NOT EXISTS idx_projects_department_status ON projects(department_id, status);
CREATE INDEX IF NOT EXISTS idx_project_segments_segment ON project_segments(segment_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_project_created ON project_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_project_created ON reports(project_id, created_at DESC);
