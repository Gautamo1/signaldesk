import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Priority, Project, ProjectStatus, Source } from '../../api/types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { TagInput } from './TagInput'
import { useSources, useCreateProject, useUpdateProject } from '../../api/hooks'
import { required } from '../../lib/validation'

interface Props {
  open: boolean
  onClose: () => void
  project?: Project | null
  onCreated?: (p: Project) => void
}

interface FormState {
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  tags: string[]
  source_ids: string[]
}

const EMPTY: FormState = { name: '', description: '', status: 'active', priority: 'medium', tags: [], source_ids: [] }

export function ProjectFormModal({ open, onClose, project, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const sources = useSources()
  const createMut = useCreateProject()
  const updateMut = useUpdateProject()

  useEffect(() => {
    if (open) {
      setErrors({})
      setForm(
        project
          ? {
              name: project.name,
              description: project.description,
              status: project.status,
              priority: project.priority,
              tags: project.tags,
              source_ids: (project.sources ?? []).map((s) => s.id),
            }
          : EMPTY,
      )
    }
  }, [open, project])

  const mut = project ? updateMut : createMut

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const nameErr = required(form.name)
    if (nameErr) errs.name = nameErr
    if (form.name.trim().length > 0 && form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = { ...form, name: form.name.trim() }
      if (project) {
        await updateMut.mutateAsync({ id: project.id, data: payload })
        onClose()
      } else {
        const created = await createMut.mutateAsync(payload)
        onClose()
        onCreated?.(created)
      }
    } catch (err) {
      setErrors({ name: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  function toggleSource(id: string) {
    setForm((f) => ({
      ...f,
      source_ids: f.source_ids.includes(id) ? f.source_ids.filter((x) => x !== id) : [...f.source_ids, id],
    }))
  }

  const list = (sources.data ?? []) as Source[]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving || mut.isPending} form="project-form" type="submit">
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" required error={errors.name}>
          <Input
            data-autofocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Meridian Holdings Ownership Network"
            invalid={Boolean(errors.name)}
            maxLength={120}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What are we investigating and why?"
            rows={3}
            maxLength={2000}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as typeof f.priority }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
        </div>
        <Field label="Tags" hint="Press Enter or comma to add.">
          <TagInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
        </Field>
        <Field label="Monitored sources" hint="Findings from these sources route to this project by default.">
          <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-surface p-1">
            {list.length === 0 && <p className="px-2 py-3 text-xs text-ink-3">No sources configured yet — add some in Source Monitor.</p>}
            {list.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-raised">
                <input
                  type="checkbox"
                  checked={form.source_ids.includes(s.id)}
                  onChange={() => toggleSource(s.id)}
                  className="size-3.5 accent-[var(--sd-accent)]"
                />
                <span className="flex-1 truncate text-[12.5px]">{s.display_name}</span>
                <span className="font-mono text-[10px] uppercase text-ink-3">{s.category}</span>
              </label>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  )
}
