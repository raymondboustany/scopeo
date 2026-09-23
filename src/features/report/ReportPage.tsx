import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Download, ExternalLink, FileText, Presentation, Siren, X } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/controls'
import { Card, Disclaimer, EmptyState, PageHeader, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { cn, slugify } from '@/lib/utils'
import { buildReportData } from './reportData'
import type { ReportKind } from './pdf/generate'

const loadEngine = () => import('./pdf/generate')

/** Exécute une tâche et mesure sa durée, en millisecondes. */
async function timed<T>(task: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now()
  const result = await task()
  return [result, Math.round(performance.now() - start)]
}

const KINDS: {
  id: ReportKind
  icon: React.ReactNode
  title: string
  audience: string
  length: string
  contents: string[]
}[] = [
  {
    id: 'comex',
    icon: <Presentation size={18} />,
    title: 'Note au comité de direction',
    audience: 'Pour décider — dirigeants, COMEX',
    length: '2 pages',
    contents: ['Message clé et quatre indicateurs', 'Couverture par texte, répartition des niveaux', 'Exposition et sanctions plafonds', 'Trois priorités, décisions attendues', 'Échéances et autorités à prévenir'],
  },
  {
    id: 'complet',
    icon: <FileText size={18} />,
    title: 'Rapport de cadrage complet',
    audience: 'Pour instruire — conseil, RSSI, DPO, équipe projet',
    length: '6 à 10 pages',
    contents: [
      'Synthèse chiffrée et graphiques',
      'Qualification détaillée, fondements et réserves',
      'Périmètre, couverture par domaine, écarts',
      'Points de friction entre textes',
      'Plan de traitement par vagues, nuage priorité / charge',
      'Signalement, échéancier, journal d’entretien, méthode',
    ],
  },
  {
    id: 'reflexe',
    icon: <Siren size={18} />,
    title: 'Fiche réflexe incident',
    audience: 'À diffuser en interne dès maintenant',
    length: '1 page',
    contents: ['Qui appeler, dans l’ordre, avec leurs coordonnées', 'Qui notifier et dans quel délai, selon les textes applicables', 'Les six réflexes des premières heures'],
  },
]

export default function ReportPage() {
  const scoping = useScoping()
  const entity = scoping.entity
  const [busy, setBusy] = useState<ReportKind | null>(null)
  const [preview, setPreview] = useState<{ kind: ReportKind; url: string; ms: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  // Le moteur PDF est volumineux : on le charge dès l'ouverture de la page,
  // pendant que l'utilisateur lit, pour que le premier clic soit rapide.
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const handle = idle ? idle(() => void loadEngine()) : window.setTimeout(() => void loadEngine(), 300)
    return () => window.clearTimeout(handle)
  }, [])

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview.url) : undefined), [preview])

  const data = useMemo(() => (scoping.qualification ? buildReportData(scoping) : null), [scoping])

  if (!entity) return null
  if (!scoping.qualified || !data) {
    return (
      <>
        <PageHeader eyebrow={entity.name} title="Rapports" />
        <EmptyState title="Qualification requise" action={<LinkButton to="/app/qualification" variant="primary">Qualifier l'entité</LinkButton>}>
          Les rapports restituent la qualification, le périmètre et le plan de traitement : ils supposent un questionnaire complet.
        </EmptyState>
      </>
    )
  }

  async function generate(kind: ReportKind, mode: 'apercu' | 'telecharger') {
    setBusy(kind)
    setError(null)
    try {
      const [blob, ms] = await timed(async () => {
        const { renderReport } = await loadEngine()
        return renderReport(kind, data!, entity!.updated_at)
      })
      const url = URL.createObjectURL(blob)
      if (mode === 'telecharger') {
        const a = document.createElement('a')
        a.href = url
        a.download = `${kind === 'comex' ? 'note-comex' : kind === 'reflexe' ? 'fiche-reflexe-incident' : 'rapport-cadrage'}-${slugify(entity!.name)}.pdf`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      } else {
        setPreview({ kind, url, ms })
        setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La génération a échoué.')
    } finally {
      setBusy(null)
    }
  }

  const evaluatedShare = data.coverage.themes ? data.coverage.evaluated / data.coverage.themes : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={entity.name}
        title="Rapports"
        lead="Trois documents PDF construits à partir du cadrage en cours : une note courte pour décider, un rapport complet pour instruire, une fiche réflexe à diffuser en interne."
      />

      {evaluatedShare < 1 ? (
        <p className="rounded-md border border-caution-line bg-caution-wash px-4 py-2.5 text-xs text-ink-2">
          {data.coverage.themes - data.coverage.evaluated} exigence{data.coverage.themes - data.coverage.evaluated > 1 ? 's' : ''} ne sont pas encore évaluées : les
          rapports les signalent comme telles, et la couverture affichée en tient compte.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {KINDS.map((k) => (
          <Card key={k.id} className="flex flex-col">
            <div className="flex items-start gap-3 border-b border-rule px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-rule-2 bg-sunken text-ink-2">{k.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">{k.title}</h2>
                  <Tag mono>{k.length}</Tag>
                </div>
                <p className="mt-0.5 text-xs text-ink-3">{k.audience}</p>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 px-5 py-4">
              {k.contents.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm text-ink-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-4" />
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-rule bg-sunken px-5 py-3">
              <Button variant="primary" disabled={busy !== null} onClick={() => generate(k.id, 'apercu')}>
                {busy === k.id ? 'Génération…' : 'Aperçu'}
              </Button>
              <Button icon={<Download size={14} />} disabled={busy !== null} onClick={() => generate(k.id, 'telecharger')}>
                Télécharger le PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {error ? <p className="text-sm text-critical">{error}</p> : null}

      {preview ? (
        <motion.div ref={previewRef} className="scroll-mt-20" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
              <div className="text-sm text-ink">
                {KINDS.find((k) => k.id === preview.kind)!.title}
                <span className="ml-2 font-mono text-2xs text-ink-4">généré en {preview.ms} ms</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule-2 bg-raised px-3 text-xs font-medium text-ink hover:bg-overlay"
                >
                  <ExternalLink size={13} /> Nouvel onglet
                </a>
                <Button size="sm" icon={<Download size={13} />} onClick={() => generate(preview.kind, 'telecharger')}>
                  Télécharger
                </Button>
                <Button size="sm" variant="ghost" aria-label="Fermer l'aperçu" onClick={() => setPreview(null)}>
                  <X size={14} />
                </Button>
              </div>
            </div>
            <iframe title="Aperçu du rapport" src={preview.url} className={cn('block h-[82vh] w-full bg-[#525659]')} />
          </Card>
        </motion.div>
      ) : null}

      <Disclaimer compact />
    </div>
  )
}
