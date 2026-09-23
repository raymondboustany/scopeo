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

/**
 * Préparation au signalement.
 *
 * L'outil ne pilote pas une crise : il établit, au moment du cadrage, qui
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
      a.download = `fiche-reflexe-incident-${slugify(entity.name)}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } finally {
      setBusy(false)
    }
  }

  if (!qualified) {
    return (
      <>
        <PageHeader eyebrow={entity.name} title="Qui notifier en cas d'incident" />
        <EmptyState title="Qualification requise" action={<LinkButton to="/app/qualification" variant="primary">Qualifier l'entité</LinkButton>}>
          Les autorités à prévenir et les délais de notification découlent des textes applicables à l'entité.
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
        title="Qui notifier en cas d'incident"
        lead="Les obligations de notification s'appliquent dès aujourd'hui, même si la mise en conformité n'est pas terminée. Cette page dit, pour cette entité, quelle autorité prévenir, dans quel délai et qui appeler en interne : une information à diffuser tout de suite."
        actions={
          <Button variant="primary" icon={<Download size={14} />} onClick={downloadSheet} disabled={busy}>
            {busy ? 'Génération…' : 'Fiche réflexe (PDF)'}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader title="Autorités à notifier" subtitle="Selon les textes applicables et le type d'établissement" icon={<Landmark size={16} />} />
          <div className="p-5">
            <AuthorityCards applicable={applicable} answers={entity.answers} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="État de préparation"
            subtitle="Ce que le cadrage doit avoir établi"
            icon={<ListChecks size={16} />}
            aside={<Tag tone={done === items.length ? 'positive' : 'caution'}>{done} / {items.length}</Tag>}
          />
          <div className="px-5 py-2">
            <ReadinessList items={items} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Chaîne d'escalade interne" subtitle="Numérotée dans l'ordre d'appel : sécurité, données, direction" icon={<Users size={16} />} />
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
            <span className="block text-base font-semibold text-ink">Tester un scénario</span>
            <span className="block text-xs text-ink-3">
              Facultatif. Imaginez un incident détecté maintenant : l'outil montre quelles déclarations il déclencherait et à quelle heure
              chacune arriverait à échéance. Rien n'est enregistré.
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
          La loi française de transposition de NIS 2 n'étant pas promulguée, la notification à l'ANSSI n'est pas encore juridiquement exigible ;
          le signalement au CERT-FR reste recommandé, avec les délais de la directive.
        </Callout>
      ) : null}

      <Disclaimer compact />
      <NextStep to="/app/rapport" label="Restituer : rapports PDF" hint="Note COMEX et rapport de cadrage complet" />
    </div>
  )
}
