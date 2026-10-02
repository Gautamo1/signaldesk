-- SignalDesk initial schema

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  url_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  check_interval_min INTEGER NOT NULL DEFAULT 60 CHECK (check_interval_min >= 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'idle' CHECK (last_status IN ('idle', 'ok', 'new-findings', 'error')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_sources (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, source_id)
);

CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'document',
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'reviewed')),
  archived BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  key_findings JSONB NOT NULL DEFAULT '[]',
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  timeline JSONB NOT NULL DEFAULT '[]',
  open_questions JSONB NOT NULL DEFAULT '[]',
  analyst_notes TEXT NOT NULL DEFAULT '',
  conclusions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_project_created ON findings (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_findings_source ON findings (source_id);
CREATE INDEX IF NOT EXISTS idx_findings_created ON findings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_updated ON briefs (updated_at DESC);
