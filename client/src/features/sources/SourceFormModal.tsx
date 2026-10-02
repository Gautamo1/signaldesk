import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Source, SourceCategory } from '../../api/types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Toggle'
import { useCreateSource, useUpdateSource } from '../../api/hooks'
import { isUrl } from '../../lib/validation'
import { FREQUENCIES, SOURCE_CATEGORIES } from '../../lib/constants'

interface Props {
  open: boolean
  onClose: () => void
  source?: Source | null
}

const EMPTY = {
  display_name: '',
  url: '',
  category: 'other' as SourceCategory,
  check_interval_min: 60,
  enabled: true,
  notes: '',
}

export function SourceFormModal({ open, onClose, source }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createMut = useCreateSource()
  const updateMut = useUpdateSource()

  useEffect(() => {
    if (open) {
      setErrors({})
      setForm(
        source
          ? {
              display_name: source.display_name,
              url: source.url,
              category: source.category,
              check_interval_min: source.check_interval_min,
              enabled: source.enabled,
              notes: source.notes,
            }
          : EMPTY,
      )
    }
  }, [open, source])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (form.display_name.trim().length < 2) errs.display_name = 'Display name must be at least 2 characters'
    if (!isUrl(form.url)) errs.url = 'Enter a valid http(s) URL'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const payload = { ...form, display_name: form.display_name.trim() }
    try {
      if (source) await updateMut.mutateAsync({ id: source.id, data: payload })
      else await createMut.mutateAsync(payload)
      onClose()
    } catch (err) {
      const e2 = err as Error & { fields?: Record<string, string>; code?: string }
      if (e2.code === 'duplicate' || /already exists/i.test(e2.message)) errs.url = 'A source with this URL already exists'
      else errs._form = e2.message
      setErrors(errs)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={source ? 'Edit source' : 'Add monitored source'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={createMut.isPending || updateMut.isPending} form="source-form" type="submit">
            {source ? 'Save changes' : 'Add source'}
          </Button>
        </>
      }
    >
      <form id="source-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {errors._form && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
            {errors._form}
          </p>
        )}
        <Field label="Display name" required error={errors.display_name}>
          <Input
            data-autofocus
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder="e.g. Reuters World Desk"
            invalid={Boolean(errors.display_name)}
            maxLength={120}
          />
        </Field>
        <Field label="URL" required error={errors.url} hint="Used for duplicate detection; SignalDesk does not scrape it.">
          <Input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://example.com/feed"
            invalid={Boolean(errors.url)}
            inputMode="url"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SourceCategory }))}>
              {SOURCE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Check frequency">
            <Select
              value={String(form.check_interval_min)}
              onChange={(e) => setForm((f) => ({ ...f, check_interval_min: Number(e.target.value) }))}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
          <span className="text-[12.5px] font-medium">Enabled</span>
          <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} label="Enable source" />
        </label>
        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Why is this source being monitored?"
            rows={2}
            maxLength={2000}
          />
        </Field>
      </form>
    </Modal>
  )
}
