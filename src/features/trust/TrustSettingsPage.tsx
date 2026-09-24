import { useState } from 'react'
import { Check, Construction, Copy, ExternalLink, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, Switch } from '@/components/ui/controls'
import { Callout, Card, CardHeader, EmptyState, PageHeader, SectionRule, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useShare } from '@/lib/queries'
import { buildSnapshot } from '@/engines/scores'
import { SnapshotView } from './SnapshotView'
import { tr } from '@/i18n'

const PUBLISHED = [
  tr('Nom de l’entité et secteur', 'Entity name and sector'),
  tr('Textes applicables et qualification retenue', 'Applicable texts and scoping outcome'),
  tr('Score global, par référentiel et par domaine', 'Overall score, by framework and by domain'),
  tr('Certification ISO 27001 et sa date de validité, si l’entité est certifiée', 'ISO 27001 certification and its expiry date, if the entity is certified'),
  tr('Date de mise à jour', 'Last update date'),
]
const WITHHELD = [
  tr('Réponses au questionnaire, effectifs, chiffre d’affaires', 'Questionnaire answers, headcount, turnover'),
  tr('Sanctions encourues et montants', 'Penalties and amounts at stake'),
  tr('Détail de l’évaluation : notes, preuves, responsables', 'Assessment details: notes, evidence, owners'),
  tr('Détail des contrôles ISO 27001 et déclaration d’applicabilité', 'ISO 27001 control details and Statement of Applicability'),
  tr('Contacts internes et incidents', 'Internal contacts and incidents'),
]

function publicUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/trust/${token}`
}

export default function TrustSettingsPage() {
  const { entity, qualification, prioritised, applicable, readOnly } = useScoping()
  const share = useShare()
  const [copied, setCopied] = useState(false)

  if (!entity) return null
  const snapshot = qualification ? buildSnapshot(entity.answers, qualification, prioritised, applicable, entity.profile?.iso27001) : null
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
        eyebrow={tr('Restitution', 'Reporting')}
        title="Trust Center"
        lead={tr("Préparez une vue en lecture seule de la posture réglementaire de l'entité, à destination d'un client, d'un partenaire ou d'un auditeur. Rien de sensible ne sort.", "Prepare a read-only view of the entity's regulatory posture, for a client, a partner or an auditor. Nothing sensitive leaves.")}
        actions={<Tag tone="caution">{tr('Démonstration', 'Demo')}</Tag>}
      />

      <Callout tone="caution" icon={<Construction size={14} />} title={tr('Fonctionnalité en démonstration, locale uniquement', 'Demo feature, local only')}>
        {tr("Le Trust Center fonctionne pour l'instant sur ce poste : le lien public n'est consultable que depuis la machine qui fait tourner Scopeo. Le partage en ligne, accessible à un tiers depuis internet, arrivera dans une prochaine mise à jour.", 'The Trust Center currently runs on this machine only: the public link can only be opened from the computer running Scopeo. Online sharing, reachable by a third party over the internet, will come in a future update.')}
      </Callout>

      <Card>
        <CardHeader
          title={tr('Lien de partage (local)', 'Share link (local)')}
          subtitle={
            enabled
              ? tr('Depuis ce poste, le lien ouvre la vue ci-dessous.', 'From this machine, the link opens the view below.')
              : tr('Le partage est désactivé : le lien répond comme s’il n’existait pas.', 'Sharing is off: the link responds as if it did not exist.')
          }
          icon={<ShieldCheck size={16} />}
          aside={
            readOnly ? null : (
              <Switch checked={entity.share_enabled} onCheckedChange={(v) => share.mutate({ id: entity.id, enabled: v })} label={tr('Activer le partage', 'Enable sharing')} />
            )
          }
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <code className={`min-w-0 flex-1 truncate rounded-md border border-rule-2 bg-sunken px-3 py-2 font-mono text-xs ${enabled ? 'text-ink' : 'text-ink-4 line-through'}`}>
              {url}
            </code>
            <Button size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copy} disabled={!enabled}>
              {copied ? tr('Copié', 'Copied') : tr('Copier', 'Copy')}
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-rule-2 bg-raised px-3 text-xs font-medium text-ink hover:bg-overlay ${enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <ExternalLink size={13} /> {tr('Ouvrir', 'Open')}
            </a>
            {readOnly ? null : (
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={() => {
                  if (window.confirm(tr('Renouveler le lien ? L’ancien cessera immédiatement de fonctionner.', 'Renew the link? The old one will stop working immediately.'))) {
                    share.mutate({ id: entity.id, enabled: entity.share_enabled, rotate: true })
                  }
                }}
              >
                {tr('Renouveler', 'Renew')}
              </Button>
            )}
          </div>
          {readOnly ? (
            <Callout tone="accent">{tr('La démonstration est partagée en permanence, au lien /trust/demo.', 'The demo is always shared, at the /trust/demo link.')}</Callout>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-positive-line bg-positive-wash/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                <Check size={14} className="text-positive" /> {tr('Publié', 'Published')}
              </div>
              <ul className="space-y-1 text-xs text-ink-2">
                {PUBLISHED.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-rule-2 bg-sunken p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                <EyeOff size={14} className="text-ink-3" /> {tr('Jamais publié', 'Never published')}
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
        <SectionRule aside={tr('Mis à jour automatiquement à chaque modification', 'Updated automatically on every change')}>{tr('Aperçu de la vue publique', 'Preview of the public view')}</SectionRule>
        {snapshot ? (
          <SnapshotView name={entity.name} snapshot={snapshot} />
        ) : (
          <EmptyState title={tr("Rien à publier pour l'instant", 'Nothing to publish yet')}>{tr('Terminez la qualification pour que la vue publique affiche le périmètre et le score.', 'Finish scoping for the public view to show the scope and score.')}</EmptyState>
        )}
      </section>
    </div>
  )
}
