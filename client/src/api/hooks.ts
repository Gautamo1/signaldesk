import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type FindingsParams } from './client'
import type { Brief, Finding, Project, Source } from './types'
import { useToast } from '../components/ui/Toast'

export const keys = {
  projects: (status?: string) => ['projects', status ?? 'all'] as const,
  project: (id: string) => ['project', id] as const,
  findings: (params: FindingsParams) => ['findings', params] as const,
  sources: () => ['sources'] as const,
  briefs: (projectId?: string) => ['briefs', projectId ?? 'all'] as const,
  brief: (id: string) => ['brief', id] as const,
  activity: (limit?: number, projectId?: string) => ['activity', limit, projectId] as const,
  stats: () => ['stats'] as const,
  monitor: () => ['monitor-status'] as const,
  health: () => ['health'] as const,
}

export function useProjects(status?: string) {
  return useQuery({ queryKey: keys.projects(status), queryFn: () => api.projects.list({ status }) })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: keys.project(id ?? 'none'),
    queryFn: () => api.projects.get(id!),
    enabled: Boolean(id),
  })
}

export function useFindings(params: FindingsParams = {}) {
  return useQuery({ queryKey: keys.findings(params), queryFn: () => api.findings.list(params) })
}

export function useSources() {
  return useQuery({ queryKey: keys.sources(), queryFn: api.sources.list, refetchInterval: 60_000 })
}

export function useBriefs(projectId?: string) {
  return useQuery({ queryKey: keys.briefs(projectId), queryFn: () => api.briefs.list(projectId) })
}

export function useBrief(id: string | undefined) {
  return useQuery({
    queryKey: keys.brief(id ?? 'none'),
    queryFn: () => api.briefs.get(id!),
    enabled: Boolean(id),
  })
}

export function useActivity(limit = 30, projectId?: string) {
  return useQuery({
    queryKey: keys.activity(limit, projectId),
    queryFn: () => api.activity({ limit, project_id: projectId }),
    refetchInterval: 45_000,
  })
}

export function useStats() {
  return useQuery({ queryKey: keys.stats(), queryFn: api.stats, refetchInterval: 60_000 })
}

export function useMonitorStatus() {
  return useQuery({ queryKey: keys.monitor(), queryFn: api.monitorStatus, refetchInterval: 30_000 })
}

export function useHealth() {
  return useQuery({ queryKey: keys.health(), queryFn: api.health, refetchInterval: 60_000 })
}

/* ------------------------------- mutations ------------------------------- */

export function useCreateProject() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.projects.create(data),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success(`Project “${p.name}” created`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) => api.projects.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success('Project updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success('Project deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Finding> }) => api.findings.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['findings'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export function useDeleteFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.findings.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['findings'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
    },
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: Partial<Source>) => api.sources.create(data),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: keys.sources() })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success(`Source “${s.display_name}” added`)
    },
  })
}

export function useUpdateSource() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Source> }) => api.sources.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.sources() })
      toast.success('Source updated')
    },
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.sources.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.sources() })
      void qc.invalidateQueries({ queryKey: ['findings'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success('Source removed — its findings are kept as “Unknown source”')
    },
  })
}

export function useCheckSourceNow() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.sources.checkNow(id),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: keys.sources() })
      void qc.invalidateQueries({ queryKey: ['findings'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      if (res.status === 'error') toast.error('Source check failed — will retry on next interval')
      else if (res.created > 0) toast.success(`Check complete — ${res.created} new finding${res.created === 1 ? '' : 's'}`)
      else toast.info('Check complete — no new findings')
    },
  })
}

export function useCreateBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; project_id?: string | null }) => api.briefs.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['briefs'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
    },
  })
}

export function useDeleteBrief() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.briefs.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['briefs'] })
      void qc.invalidateQueries({ queryKey: keys.stats() })
      toast.success('Brief deleted')
    },
  })
}
