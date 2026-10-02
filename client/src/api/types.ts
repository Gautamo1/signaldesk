export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type ProjectStatus = 'active' | 'paused' | 'archived' | 'completed'
export type FindingStatus = 'unread' | 'read' | 'reviewed'
export type FindingCategory = 'document' | 'filing' | 'statement' | 'dataset' | 'correspondence' | 'imagery'
export type SourceCategory =
  | 'wire-service'
  | 'financial-media'
  | 'regulatory-filings'
  | 'sanctions-data'
  | 'public-records'
  | 'academic'
  | 'other'
export type SourceStatus = 'idle' | 'ok' | 'new-findings' | 'error'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  tags: string[]
  created_at: string
  updated_at: string
  findings_count?: number
  sources_count?: number
  briefs_count?: number
  last_activity_at?: string | null
  sources?: Source[]
}

export interface Source {
  id: string
  url: string
  display_name: string
  category: SourceCategory
  check_interval_min: number
  enabled: boolean
  last_checked_at: string | null
  last_status: SourceStatus
  notes: string
  created_at: string
  updated_at: string
  findings_count?: number
  monitoring_projects?: Array<{ id: string; name: string }>
}

export interface Finding {
  id: string
  title: string
  summary: string
  source_id: string | null
  project_id: string | null
  category: FindingCategory
  confidence: number
  priority: Priority
  status: FindingStatus
  archived: boolean
  tags: string[]
  created_at: string
  updated_at: string
  source_name?: string | null
  source_url?: string | null
  project_name?: string | null
}

export interface KeyFinding {
  id: string
  text: string
  finding_ids: string[]
  finding_titles?: string[]
}

export interface EvidenceRef {
  type: 'finding' | 'source'
  id: string
  label: string
}

export interface TimelineEntry {
  date: string
  label: string
  detail?: string
}

export interface Brief {
  id: string
  project_id: string | null
  title: string
  executive_summary: string
  key_findings: KeyFinding[]
  evidence_refs: EvidenceRef[]
  timeline: TimelineEntry[]
  open_questions: string[]
  analyst_notes: string
  conclusions: string
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
  project_name?: string | null
}

export interface ActivityEvent {
  id: number
  type: string
  entity_type: string
  entity_id: string | null
  project_id: string | null
  message: string
  meta: Record<string, unknown>
  created_at: string
}

export interface StatsAlert {
  type: 'finding' | 'source'
  id: string
  title: string
  detail: string
  created_at: string
  href: string
}

export interface Stats {
  sources: { total: number; enabled: number; failing: number }
  findings: { total: number; last30: number; last7: number; unread: number; highPriorityUnread: number }
  projects: { total: number; active: number }
  briefs: { total: number; final: number; draft: number }
  series14d: Array<{ date: string; count: number }>
  byCategory: Array<{ category: string; n: number }>
  alerts: StatsAlert[]
}

export interface MonitorStatus {
  total: number
  enabled: number
  last_check: string | null
  sim: boolean
}

export interface Health {
  ok: boolean
  db: 'ok' | 'degraded'
  sim: boolean
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pages: number
  page_size: number
}
