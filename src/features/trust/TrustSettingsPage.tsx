import { useState } from 'react'
import { Check, Copy, ExternalLink, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, Switch } from '@/components/ui/controls'
import { Callout, Card, CardHeader, EmptyState, PageHeader, SectionRule } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useShare } from '@/lib/queries'
import { buildSnapshot } from '@/engines/scores'
import { SnapshotView } from './SnapshotView'

const PUBLISHED = [
  'Nom de l’entité et secteur',
  'Textes applicables et qualification retenue',
  'Score global, par référentiel et par domaine',
  'Date de mise à jour',
]
const WITHHELD = [
  'Réponses au questionnaire, effectifs, chiffre d’affaires',
  'Sanctions encourues et montants',
  'Détail de l’évaluation : notes, preuves, responsables',
  'Contacts internes et incidents',
]

function publicUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/trust/${token}`
}

export default function TrustSettingsPage() {
  const { entity, qualification, prioritised, applicable, readOnly } = useScoping()
  const share = useShare()
  const [copied, setCopied] = useState(false)

  if (!entity) return null
  const snapshot = qualification ? buildSnapshot(entity.answers, qualification, prioritised, applicable) : null
  const enabled = entity.share_enabled || entity.is_demo
  const url = publicUrl(entity.share_token)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Restitution"
        title="Trust Center"
        lead="Publiez une vue en lecture seule de la posture réglementaire de l'entité, à destination d'un client, d'un partenaire ou d'un auditeur. Rien de sensible ne sort."
      />

      <Card>
        <CardHeader
          title="Lien public"
          subtitle={enabled ? 'Toute personne disposant du lien peut consulter la vue ci-dessous.' : 'Le partage est désactivé : le lien répond comme s’il n’existait pas.'}
          icon={<ShieldCheck size={16} />}
          aside={
            readOnly ? null : (
              <Switch checked={entity.share_enabled} onCheckedChange={(v) => share.mutate({ id: entity.id, enabled: v })} label="Activer le partage" />
            )
          }
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <code className={`min-w-0 flex-1 truncate rounded-md border border-rule-2 bg-sunken px-3 py-2 font-mono text-xs ${enabled ? 'text-ink' : 'text-ink-4 line-through'}`}>
              {url}
            </code>
            <Button size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copy} disabled={!enabled}>
              {copied ? 'Copié' : 'Copier'}
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-rule-2 bg-raised px-3 text-xs font-medium text-ink hover:bg-overlay ${enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <ExternalLink size={13} /> Ouvrir
            </a>
            {readOnly ? null : (
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={() => {
                  if (window.confirm('Renouveler le lien ? L’ancien cessera immédiatement de fonctionner.')) {
                    share.mutate({ id: entity.id, enabled: entity.share_enabled, rotate: true })
                  }
                }}
              >
                Renouveler
              </Button>
            )}
          </div>
          {readOnly ? (
            <Callout tone="accent">La démonstration est partagée en permanence, au lien public /trust/demo.</Callout>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-positive-line bg-positive-wash/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                <Check size={14} className="text-positive" /> Publié
              </div>
              <ul className="space-y-1 text-xs text-ink-2">
                {PUBLISHED.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-rule-2 bg-sunken p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                <EyeOff size={14} className="text-ink-3" /> Jamais publié
              </div>
              <ul className="space-y-1 text-xs text-ink-3">
                {WITHHELD.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <SectionRule aside="Mis à jour automatiquement à chaque modification">Aperçu de la vue publique</SectionRule>
        {snapshot ? (
          <SnapshotView name={entity.name} snapshot={snapshot} />
        ) : (
          <EmptyState title="Rien à publier pour l'instant">Terminez la qualification pour que la vue publique affiche le périmètre et le score.</EmptyState>
        )}
      </section>
    </div>
  )
}
