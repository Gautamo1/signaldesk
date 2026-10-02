import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cx } from '../../lib/utils'
import { TagChip } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Field'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  max?: number
}

/** Chip-style tag editor: type + Enter/comma to add, Backspace to remove last. */
export function TagInput({ value, onChange, placeholder = 'Add a tag…', max = 8 }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit() {
    const t = draft.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (t && !value.includes(t) && value.length < max) onChange([...value, t])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
      {value.map((t) => (
        <TagChip key={t} tag={t} onRemove={() => onChange(value.filter((x) => x !== t))} />
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={value.length >= max ? `Max ${max} tags` : placeholder}
        disabled={value.length >= max}
        className={cx('min-w-[100px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-3')}
        aria-label="Add tag"
      />
    </div>
  )
}
