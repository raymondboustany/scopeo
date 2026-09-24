import { useState } from 'react'
import { ChevronRight, Download, FlaskConical, Landmark, ListChecks, Users } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/controls'
import { Callout, Card, CardHeader, Disclaimer, EmptyState, PageHeader, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { cn, slugify } from '@/lib/utils'
import { buildReportData } from '@/features/report/reportData'
import { readiness } from '@/engines/incidents'
import { NextStep } from '@/components/layout/NextStep'
import { AuthorityCards, ContactCards, ReadinessList, Simulator } from './components'
import { tr } from '@/i18n'

/**
 * Préparation au signalement.
 *
 * La plateforme ne pilote pas une crise : elle établit, au moment du cadrage, qui
 * devrait être prévenu, dans quels délais et par qui en interne. La simulation
 * permet d'exercer ces horloges sans rien enregistrer.
 */
export default function SignalementPage() {
  const scoping = useScoping()
  const { entity, applicable, readOnly, qualified } = scoping
  const [simOpen, setSimOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!entity) return null

  const downloadSheet = async () => {
    setBusy(true)
    try {
      const { renderReport } = await import('@/features/report/pdf/generate')
      const blob = await renderReport('reflexe', buildReportData(scoping), entity.updated_at)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${tr('fiche-reflexe-incident', 'incident-quick-reference')}-${slugify(entity.name)}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } finally {
      setBusy(false)
    }
  }

  if (!qualified) {
    return (
      <>
        <PageHeader eyebrow={entity.name} title={tr("Qui notifier en cas d'incident", 'Who to notify in case of an incident')} />
        <EmptyState title={tr('Qualification requise', 'Scoping required')} action={<LinkButton to="/app/qualification" variant="primary">{tr("Qualifier l'entité", 'Scope the entity')}</LinkButton>}>
          {tr("Les autorités à prévenir et les délais de notification découlent des textes applicables à l'entité.", 'The authorities to notify and the notification deadlines follow from the texts that apply to the entity.')}
        </EmptyState>
      </>
    )
  }

  const items = readiness(applicable, entity.answers, entity.contacts)
  const done = items.filter((i) => i.ok).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={entity.name}
        title={tr("Qui notifier en cas d'incident", 'Who to notify in case of an incident')}
        lead={tr("Les obligations de notification s'appliquent dès aujourd'hui, même si la mise en conformité n'est pas terminée. Cette page dit, pour cette entité, quelle autorité prévenir, dans quel délai et qui appeler en interne : une information à diffuser tout de suite.", 'Notification duties apply today, even if compliance work is not finished. This page tells you, for this entity, which authority to notify, how fast and whom to call internally: information to share right away.')}
        actions={
          <Button variant="primary" icon={<Download size={14} />} onClick={downloadSheet} disabled={busy}>
            {busy ? tr('Génération…', 'Generating…') : tr('Fiche réflexe (PDF)', 'Quick-reference sheet (PDF)')}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader title={tr('Autorités à notifier', 'Authorities to notify')} subtitle={tr("Selon les textes applicables et le type d'établissement", 'Based on the applicable texts and the type of institution')} icon={<Landmark size={16} />} />
          <div className="p-5">
            <AuthorityCards applicable={applicable} answers={entity.answers} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title={tr('État de préparation', 'Readiness')}
            subtitle={tr('Ce que le cadrage doit avoir établi', 'What scoping must have established')}
            icon={<ListChecks size={16} />}
            aside={<Tag tone={done === items.length ? 'positive' : 'caution'}>{done} / {items.length}</Tag>}
          />
          <div className="px-5 py-2">
            <ReadinessList items={items} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={tr("Chaîne d'escalade interne", 'Internal escalation chain')} subtitle={tr("Numérotée dans l'ordre d'appel : sécurité, données, direction", 'Numbered in call order: security, data, management')} icon={<Users size={16} />} />
        <div className="p-5">
          <ContactCards contacts={entity.contacts} readOnly={readOnly} />
        </div>
      </Card>

      <Card>
        <button
          onClick={() => setSimOpen((v) => !v)}
          aria-expanded={simOpen}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-raised"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-strong">
            <FlaskConical size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-ink">{tr('Tester un scénario', 'Test a scenario')}</span>
            <span className="block text-xs text-ink-3">
              {tr("Facultatif. Imaginez un incident détecté maintenant : la plateforme montre quelles déclarations il déclencherait et à quelle heure chacune arriverait à échéance. Rien n'est enregistré.", 'Optional. Imagine an incident detected now: the platform shows which reports it would trigger and when each would fall due. Nothing is saved.')}
            </span>
          </span>
          <ChevronRight size={16} className={cn('shrink-0 text-ink-4 transition-transform', simOpen && 'rotate-90')} />
        </button>
        {simOpen ? (
          <div className="border-t border-rule p-5">
            <Simulator applicable={applicable} answers={entity.answers} />
          </div>
        ) : null}
      </Card>

      {applicable.includes('NIS2') ? (
        <Callout tone="neutral" className="text-xs">
          {tr("La loi française de transposition de NIS2 n'étant pas promulguée, la notification à l'ANSSI n'est pas encore juridiquement exigible ; le signalement au CERT-FR reste recommandé, avec les délais de la directive.", "As the French NIS2 transposition act has not been enacted, notification to ANSSI is not yet legally enforceable; reporting to CERT-FR is still recommended, using the directive's deadlines.")}
        </Callout>
      ) : null}

      <Disclaimer compact />
      <NextStep to="/app/rapport" label={tr('Restituer : rapports PDF', 'Report: PDF deliverables')} hint={tr('Note COMEX et rapport de cadrage complet', 'Executive note and full scoping report')} />
    </div>
  )
}
