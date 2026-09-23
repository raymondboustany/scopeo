import { useState } from 'react'
import { Button } from '@/components/ui/controls'
import { cn } from '@/lib/utils'
import { NOTE_TAGS, type NoteTag } from '@/types/domain'
import { TAG_META } from './notes'

const TONE_CLASS: Record<string, string> = {
  caution: 'bg-caution-wash text-caution',
  accent: 'bg-accent-wash text-accent-strong',
  positive: 'bg-positive-wash text-positive',
  brass: 'bg-brass-wash text-brass',
  neutral: 'bg-overlay text-ink-2',
}

export function TagBadge({ tag, className }: { tag: NoteTag; className?: string }) {
  const m = TAG_META[tag]
  return <span className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-semibold', TONE_CLASS[m.tone], className)}>{m.label}</span>
}

/** Saisie d'une note : étiquette d'abord, texte ensuite, Ctrl + Entrée pour valider. */
export function NoteComposer({ onSubmit, autoFocus = false, compact = false }: { onSubmit: (tag: NoteTag, text: string) => void; autoFocus?: boolean; compact?: boolean }) {
  const [tag, setTag] = useState<NoteTag>('verifier')
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    onSubmit(tag, text)
    setText('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Type de note">
        {NOTE_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tag === t}
            title={TAG_META[t].hint}
            onClick={() => setTag(t)}
            className={cn(
              'h-6 rounded-md px-2 text-[11px] font-medium transition-colors',
              tag === t ? TONE_CLASS[TAG_META[t].tone] : 'text-ink-3 hover:bg-raised hover:text-ink',
            )}
          >
            {TAG_META[t].label}
          </button>
        ))}
      </div>
      <textarea
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Ex. : confirmer que l'agrément ACPR couvre aussi l'émission de monnaie électronique"
        className="w-full resize-none rounded-md border border-rule-2 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-accent-line"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-4">Ctrl + Entrée pour ajouter</span>
        <Button size="sm" variant="primary" disabled={!text.trim()} onClick={submit}>
          Ajouter
        </Button>
      </div>
    </div>
  )
}
