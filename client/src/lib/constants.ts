import type { FindingCategory, Priority, ProjectStatus, SourceCategory } from '../api/types'

export const PRIORITY_META: Record<Priority, { label: string; cls: string; dot: string }> = {
  critical: { label: 'Critical', cls: 'text-danger bg-danger/10 border-danger/25', dot: 'bg-danger' },
  high: { label: 'High', cls: 'text-warn bg-warn/10 border-warn/25', dot: 'bg-warn' },
  medium: { label: 'Medium', cls: 'text-info bg-info/10 border-info/25', dot: 'bg-info' },
  low: { label: 'Low', cls: 'text-ink-3 bg-ink-3/10 border-ink-3/25', dot: 'bg-ink-3' },
}

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; dot: string }> = {
  active: { label: 'Active', dot: 'bg-ok' },
  paused: { label: 'Paused', dot: 'bg-warn' },
  archived: { label: 'Archived', dot: 'bg-ink-3' },
  completed: { label: 'Completed', dot: 'bg-info' },
}

export const FINDING_STATUS_META: Record<'unread' | 'read' | 'reviewed', { label: string; cls: string }> = {
  unread: { label: 'Unread', cls: 'text-accent bg-accent-soft border-accent/30' },
  read: { label: 'Read', cls: 'text-ink-2 bg-ink-3/10 border-ink-3/25' },
  reviewed: { label: 'Reviewed', cls: 'text-ok bg-ok/10 border-ok/25' },
}

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  document: 'Document',
  filing: 'Filing',
  statement: 'Statement',
  dataset: 'Dataset',
  correspondence: 'Correspondence',
  imagery: 'Imagery',
}

export const SOURCE_CATEGORIES: Array<{ value: SourceCategory; label: string }> = [
  { value: 'wire-service', label: 'Wire service' },
  { value: 'financial-media', label: 'Financial media' },
  { value: 'regulatory-filings', label: 'Regulatory filings' },
  { value: 'sanctions-data', label: 'Sanctions data' },
  { value: 'public-records', label: 'Public records' },
  { value: 'academic', label: 'Academic' },
  { value: 'other', label: 'Other' },
]

export const FREQUENCIES: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Every minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Hourly' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Daily' },
]

export const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
