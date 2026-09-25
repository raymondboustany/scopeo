import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Copy, ExternalLink, MessageSquarePlus } from 'lucide-react'
import { Button, Dialog, Input, Textarea, Tooltip } from '@/components/ui/controls'
import { cn, copyText } from '@/lib/utils'
import { tr } from '@/i18n'
import {
  FEEDBACK_KINDS,
  REPO_URL,
  canSubmit,
  feedbackText,
  githubIssueUrl,
  technicalInfo,
  type FeedbackDraft,
} from '@/lib/feedback'

const EMPTY: FeedbackDraft = { kind: 'bug', title: '', message: '', source: '', includeTechnical: true }

/** Bouton de la barre du haut : ouvre la fenêtre de signalement. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tooltip content={tr('Signaler un problème ou proposer une idée', 'Report a problem or suggest an idea')}>
        <button
          onClick={() => setOpen(true)}
          className="flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-tint hover:text-ink"
          aria-label={tr('Signaler un problème ou proposer une idée', 'Report a problem or suggest an idea')}
        >
          <MessageSquarePlus size={17} />
        </button>
      </Tooltip>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { pathname } = useLocation()
  const [draft, setDraft] = useState<FeedbackDraft>(EMPTY)
  const [copied, setCopied] = useState(false)
  const tech = technicalInfo(pathname)
  const valid = canSubmit(draft)
  const set = (patch: Partial<FeedbackDraft>) => setDraft((d) => ({ ...d, ...patch }))

  async function copy() {
    // Presse-papiers indisponible : le texte reste sélectionnable dans l'aperçu ci-dessous.
    if (!(await copyText(feedbackText(draft, tech)))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={tr('Signaler un problème ou proposer une idée', 'Report a problem or suggest an idea')}
      description={tr(
        "Rien n'est envoyé automatiquement : vous relisez le message, puis vous choisissez comment le transmettre.",
        'Nothing is sent automatically: you review the message, then choose how to send it.',
      )}
      footer={
        <>
          <Button onClick={copy} disabled={!valid} icon={copied ? <Check size={13} /> : <Copy size={13} />}>
            {copied ? tr('Copié', 'Copied') : tr('Copier le message', 'Copy the message')}
          </Button>
          {valid ? (
            <a
              href={githubIssueUrl(draft, tech)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 select-none items-center justify-center gap-1.5 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-ink transition-all hover:border-accent-hover hover:bg-accent-hover"
            >
              {tr('Ouvrir sur GitHub', 'Open on GitHub')}
              <ExternalLink size={13} />
            </a>
          ) : (
            <Button variant="primary" disabled icon={<ExternalLink size={13} />}>
              {tr('Ouvrir sur GitHub', 'Open on GitHub')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label={tr('Nature du signalement', 'Type of report')} className="grid gap-2 sm:grid-cols-3">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={draft.kind === k.value}
              onClick={() => set({ kind: k.value })}
              className={cn(
                'rounded-lg px-3 py-2.5 text-left transition-colors',
                'choice',
              )}
            >
              <span className={cn('block text-sm font-medium', draft.kind === k.value ? 'text-accent-strong' : 'text-ink')}>{k.label}</span>
              <span className="mt-0.5 block text-2xs text-ink-3">{k.hint}</span>
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Titre', 'Title')}</span>
          <Input value={draft.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder={tr('En une phrase', 'In one sentence')} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">
            {draft.kind === 'bug'
              ? tr('Ce qui s’est passé, et ce que vous attendiez', 'What happened, and what you expected')
              : draft.kind === 'idee'
                ? tr('Ce que vous aimeriez pouvoir faire, et pourquoi', 'What you would like to be able to do, and why')
                : tr('Ce qui est inexact, et ce qu’il faudrait écrire', 'What is inaccurate, and what it should say')}
          </span>
          <Textarea rows={5} value={draft.message} onChange={(e) => set({ message: e.target.value })} />
          <span className="mt-1 block text-2xs text-ink-4">{tr('Dix caractères au moins.', 'At least ten characters.')}</span>
        </label>

        {draft.kind === 'corpus' ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Source officielle', 'Official source')}</span>
            <Input value={draft.source} onChange={(e) => set({ source: e.target.value })} placeholder="https://eur-lex.europa.eu/…" />
            <span className="mt-1 block text-2xs text-ink-4">
              {tr('Une correction sans source officielle (EUR-Lex, Légifrance, autorité compétente) ne peut pas être intégrée.', 'A correction without an official source (EUR-Lex, Légifrance, competent authority) cannot be merged.')}
            </span>
          </label>
        ) : null}

        <label className="flex items-start gap-2.5 text-sm text-ink-2">
          <input type="checkbox" checked={draft.includeTechnical} onChange={(e) => set({ includeTechnical: e.target.checked })} className="mt-1 size-3.5 accent-[var(--c-accent)]" />
          <span>
            {tr('Joindre des informations techniques', 'Include technical information')}
            <span className="block text-2xs text-ink-3">
              {tr('Version, langue, écran et navigateur. Jamais vos réponses, vos entités ni vos contacts.', 'Version, language, screen and browser. Never your answers, entities or contacts.')}
            </span>
          </span>
        </label>

        <details className="rounded-lg border border-rule bg-sunken p-3 text-xs text-ink-3">
          <summary className="cursor-pointer font-medium text-ink-2">{tr('Aperçu du message', 'Message preview')}</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-2xs text-ink-2">{feedbackText(draft, tech)}</pre>
        </details>

        <p className="text-2xs text-ink-4">
          {tr(
            'Le bouton GitHub nécessite un compte GitHub. Sans compte, copiez le message et envoyez-le à la personne qui vous a fourni la plateforme, ou consultez ',
            'The GitHub button needs a GitHub account. Without one, copy the message and send it to the person who gave you the platform, or see ',
          )}
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {tr('les signalements existants', 'existing reports')}
          </a>
          .
        </p>
        <p className="text-2xs text-ink-4">
          {tr(
            "Une faille de sécurité ne se signale pas ici : utilisez le signalement privé décrit dans SECURITY.md.",
            'A security vulnerability must not be reported here: use the private reporting described in SECURITY.md.',
          )}
        </p>
      </div>
    </Dialog>
  )
}
