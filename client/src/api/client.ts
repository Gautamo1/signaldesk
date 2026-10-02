import type {
  ActivityEvent,
  Brief,
  Finding,
  Health,
  MonitorStatus,
  Paged,
  Project,
  Source,
  Stats,
} from './types'

/** Normalized API error. `fields` carries per-field validation messages;
 *  `server` carries the server-side copy of a resource on conflict (409). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
    public code?: string,
    public server?: unknown,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'Network error — check your connection')
  }
  if (res.status === 204) return undefined as T
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fields?: Record<string, string>; code?: string; server?: unknown }
    throw new ApiError(res.status, b.error ?? `Request failed (${res.status})`, b.fields, b.code, b.server)
  }
  return body as T
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (!entries.length) return ''
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`
}

export interface FindingsParams {
  q?: string
  project_id?: string
  source_id?: string
  category?: string
  status?: string
  priority?: string
  tag?: string
  archived?: 'active' | 'archived' | 'all'
  sort?: 'created_at' | 'confidence' | 'priority'
  order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export const api = {
  health: () => request<Health>('/api/health'),
  monitorStatus: () => request<MonitorStatus>('/api/monitor'),
  stats: () => request<Stats>('/api/stats'),

  projects: {
    list: (params: { status?: string; q?: string } = {}) =>
      request<Project[]>(`/api/projects${qs(params)}`),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (data: Partial<Project>) => request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) =>
      request<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  },

  findings: {
    list: (params: FindingsParams = {}) => request<Paged<Finding>>(`/api/findings${qs(params as Record<string, string | number | undefined>)}`),
    byIds: (ids: string[]) => request<Array<{ id: string; title: string }>>(`/api/findings/by-ids${qs({ ids: ids.join(',') })}`),
    create: (data: Partial<Finding>) => request<Finding>('/api/findings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Finding>) =>
      request<Partial<Finding>>(`/api/findings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/findings/${id}`, { method: 'DELETE' }),
  },

  sources: {
    list: () => request<Source[]>('/api/sources'),
    get: (id: string) => request<Source>(`/api/sources/${id}`),
    create: (data: Partial<Source>) => request<Source>('/api/sources', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Source>) =>
      request<Source>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/sources/${id}`, { method: 'DELETE' }),
    checkNow: (id: string) => request<{ status: string; created: number }>(`/api/sources/${id}/check-now`, { method: 'POST' }),
  },

  briefs: {
    list: (projectId?: string) => request<Brief[]>(`/api/briefs${qs({ project_id: projectId })}`),
    get: (id: string) => request<Brief>(`/api/briefs/${id}`),
    create: (data: { title: string; project_id?: string | null }) =>
      request<Brief>('/api/briefs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Brief>(`/api/briefs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/briefs/${id}`, { method: 'DELETE' }),
  },

  activity: (params: { limit?: number; project_id?: string } = {}) =>
    request<ActivityEvent[]>(`/api/activity${qs(params)}`),
}
