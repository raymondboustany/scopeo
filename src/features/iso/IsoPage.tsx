import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, ChevronRight, Download, FileSpreadsheet, Info, Lock, TriangleAlert, Upload, X } from 'lucide-react'
import { Button, Input, LinkButton, SegmentedControl, Tooltip } from '@/components/ui/controls'
import { Callout, Card, CardHeader, EmptyState, PageHeader, RegChip, SectionRule, Stat, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useEntityEditor } from '@/lib/queries'
import { api, type StoredFile } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { COLON, tr } from '@/i18n'
import { ISO_CONTROLS, ISO_MAPPING, ISO_STRUCTURAL_LABEL, ISO_THEME_META } from '@/data/iso27001'
import { CROSSWALK_BY_ID } from '@/data/crosswalk'
import { REGULATIONS } from '@/data/regulations'
import { effectiveControl, isoOverlap, isoProgress, perimeterIsPartial, type IsoOverlapCategory } from '@/engines/iso'
import { IsoBadge } from './IsoBadge'
import { parseSoa, type SoaParseResult } from './soa'
import { ISO_STATUS_OPTIONS } from '@/features/iso/labels'
import {
  ISO_THEMES,
  type IsoAssessment,
  type IsoApplicability,
  type IsoControlEntry,
  type IsoImplementation,
  type IsoThemeId,
} from '@/types/domain'

/**
 * Module ISO/IEC 27001.
 *
 * Facultatif et toujours contournable : il ne conditionne ni la qualification
 * ni l'évaluation. Il n'est proposé qu'une fois le cadrage réglementaire
 * établi, parce que ce qu'il apporte (pré-remplissage, alertes, recoupement)
 * dépend des textes retenus.
 */

const APPLICABILITY: { value: IsoApplicability; label: string }[] = [
  { value: 'applicable', label: tr('Applicable', 'Applicable') },
  { value: 'non_applicable', label: tr('Non applicable', 'Not applicable') },
]

const IMPLEMENTATION: { value: IsoImplementation; label: string; tone: string }[] = [
  { value: 'mis_en_oeuvre', label: tr('Mis en œuvre', 'Implemented'), tone: 'border-positive-line bg-positive-wash text-positive' },
  { value: 'partiel', label: tr('Partiellement mis en œuvre', 'Partially implemented'), tone: 'border-caution-line bg-caution-wash text-caution' },
  { value: 'non_mis_en_oeuvre', label: tr('Non mis en œuvre', 'Not implemented'), tone: 'border-critical-line bg-critical-wash text-critical' },
]

type Mode = 'checklist' | 'import'

export default function IsoPage() {
  const scoping = useScoping()
  const { entity, readOnly, qualified } = scoping
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('checklist')

  if (!entity) return null
  if (!qualified) {
    return (
      <>
        <PageHeader eyebrow={entity.name} title="ISO/IEC 27001" />
        <EmptyState
          title={tr('Qualification requise', 'Scoping required')}
          action={
            <LinkButton to="/app/qualification" variant="primary">
              {tr("Qualifier l'entité", 'Scope the entity')}
            </LinkButton>
          }
        >
          {tr(
            'Le module ISO 27001 s’appuie sur les textes applicables à l’entité. Il devient disponible une fois la qualification terminée.',
            'The ISO 27001 module relies on the texts applicable to the entity. It becomes available once scoping is complete.',
          )}
        </EmptyState>
      </>
    )
  }

  const iso = entity.profile?.iso27001
  const assessment: IsoAssessment = entity.iso_controls ?? {}
  const progress = isoProgress(assessment)
  const focus = params.get('controle')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={entity.name}
        title={tr('Démarche ISO/IEC 27001', 'ISO/IEC 27001 initiative')}
        lead={tr(
          "Détail des 93 contrôles de l'annexe A (édition 2022). Module facultatif : il pré-remplit l'évaluation des exigences NIS2, DORA et CRA qui ont un contrôle correspondant, sans jamais la remplacer.",
          'Detail of the 93 Annex A controls (2022 edition). Optional module: it pre-fills the assessment of NIS2, DORA and CRA requirements that have a matching control, without ever replacing it.',
        )}
        actions={
          <>
            <IsoBadge iso={iso} />
            {readOnly ? (
              <Tag>
                <Lock size={10} /> {tr('Démonstration, lecture seule', 'Demo, read-only')}
              </Tag>
            ) : null}
          </>
        }
      />

      <Card>
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={tr('Statut déclaré', 'Declared status')}
            value={<span className="text-lg">{ISO_STATUS_OPTIONS.find((o) => o.value === iso?.status)?.label ?? tr('Non renseigné', 'Not provided')}</span>}
            hint={
              <Link to="/app/fiche" className="text-accent hover:underline">
                {tr('Modifier dans la fiche entité', 'Edit in the entity profile')}
              </Link>
            }
          />
          <Stat
            label={tr('Contrôles renseignés', 'Controls filled in')}
            value={progress.assessed}
            unit={`/ ${progress.total}`}
            hint={tr(`${progress.notApplicable} non applicable${progress.notApplicable > 1 ? 's' : ''}`, `${progress.notApplicable} not applicable`)}
          />
          <Stat label={tr('Mis en œuvre', 'Implemented')} value={progress.implemented} tone="positive" hint={tr(`${progress.partial} partiellement`, `${progress.partial} partially`)} />
          <Stat label={tr('Non mis en œuvre', 'Not implemented')} value={progress.notImplemented} tone="critical" />
        </div>
      </Card>

      <Callout tone="neutral" icon={<Info size={14} />} title={tr('Un module toujours contournable', 'A module you can always skip')}>
        {tr(
          "Rempli, partiellement rempli ou jamais ouvert : la qualification et l'évaluation des exigences NIS2, DORA et CRA restent accessibles directement. Les niveaux proposés par ISO 27001 sont signalés comme tels dans l'évaluation, et chacun reste modifiable à la main.",
          'Filled in, partly filled in or never opened: scoping and the assessment of NIS2, DORA and CRA requirements remain directly available. Levels suggested by ISO 27001 are flagged as such in the assessment, and each one can be changed by hand.',
        )}
      </Callout>

      {perimeterIsPartial(iso) ? (
        <Callout tone="caution" icon={<TriangleAlert size={14} />} title={tr('Pré-remplissage désactivé', 'Pre-filling turned off')}>
          {tr(
            "La démarche ISO 27001 ne couvre qu'une partie du périmètre réglementaire. Ses contrôles ne peuvent donc pas être tenus pour acquis sur l'ensemble des exigences : chacune est à évaluer à la main.",
            'The ISO 27001 initiative only covers part of the regulatory scope. Its controls cannot therefore be taken for granted across all requirements: each one must be assessed by hand.',
          )}
        </Callout>
      ) : null}

      <SegmentedControl<Mode>
        ariaLabel={tr('Mode de saisie', 'Input mode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'checklist', label: tr('Checklist manuelle', 'Manual checklist') },
          { value: 'import', label: tr("Importer une déclaration d'applicabilité", 'Import a Statement of Applicability') },
        ]}
      />

      {mode === 'checklist' ? <Checklist assessment={assessment} readOnly={readOnly} focus={focus} /> : <SoaImport assessment={assessment} readOnly={readOnly} onDone={() => setMode('checklist')} />}

      <ExclusionAlerts />
      <Overlap />
    </div>
  )
}

/* ==========================================================================
   Saisie : applicabilité puis mise en œuvre
   ========================================================================== */

function Decision({
  value,
  inherited,
  disabled,
  onChange,
  label,
}: {
  value: IsoControlEntry
  /** Valeur héritée du thème, affichée en retrait tant qu'aucune saisie propre n'existe. */
  inherited?: IsoControlEntry
  disabled: boolean
  onChange: (patch: IsoControlEntry) => void
  label: string
}) {
  const shown = value.applicability ? value : inherited ?? {}
  const muted = !value.applicability && Boolean(inherited?.applicability)
  return (
    <div className={cn('space-y-2', muted && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={tr(`Applicabilité : ${label}`, `Applicability: ${label}`)}>
        {APPLICABILITY.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={shown.applicability === a.value}
            disabled={disabled}
            onClick={() =>
              onChange(
                a.value === 'non_applicable'
                  ? { applicability: 'non_applicable', implementation: undefined, justification: value.justification }
                  : { applicability: 'applicable', implementation: shown.implementation, justification: value.justification },
              )
            }
            className={cn(
              'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed',
              shown.applicability === a.value
                ? a.value === 'applicable'
                  ? 'border-accent-line bg-accent-wash text-accent-strong'
                  : 'border-rule-3 bg-overlay text-ink'
                : 'border-rule-2 text-ink-3 hover:text-ink',
            )}
          >
            {a.label}
          </button>
        ))}
        {shown.applicability === 'applicable' ? (
          <>
            <span className="mx-1 h-4 w-px bg-rule-2" aria-hidden />
            <span className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr(`Mise en œuvre : ${label}`, `Implementation: ${label}`)}>
              {IMPLEMENTATION.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  role="radio"
                  aria-checked={shown.implementation === i.value}
                  disabled={disabled}
                  onClick={() => onChange({ applicability: 'applicable', implementation: i.value, justification: value.justification })}
                  className={cn(
                    'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed',
                    shown.implementation === i.value ? i.tone : 'border-rule-2 text-ink-3 hover:text-ink',
                  )}
                >
                  {i.label}
                </button>
              ))}
            </span>
          </>
        ) : null}
      </div>
      {muted ? <p className="text-[10px] text-ink-4">{tr('Hérité de la saisie du thème', 'Inherited from the theme entry')}</p> : null}
    </div>
  )
}

function JustificationInput({ value, disabled, onChange }: { value: string | undefined; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <Input
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={tr('Justification (facultative)', 'Justification (optional)')}
      className="h-8 text-xs"
    />
  )
}

function Checklist({ assessment, readOnly, focus }: { assessment: IsoAssessment; readOnly: boolean; focus: string | null }) {
  const edit = useEntityEditor()
  const focusTheme = focus ? ISO_CONTROLS.find((c) => c.id === focus)?.theme : undefined

  const update = (fn: (cur: IsoAssessment) => IsoAssessment) => edit((cur) => ({ iso_controls: fn(cur.iso_controls ?? {}) }))
  const setTheme = (t: IsoThemeId, patch: IsoControlEntry) =>
    update((cur) => ({ ...cur, themes: { ...(cur.themes ?? {}), [t]: { ...(cur.themes?.[t] ?? {}), ...patch } } }))
  const setControl = (id: string, patch: IsoControlEntry) =>
    update((cur) => ({ ...cur, controls: { ...(cur.controls ?? {}), [id]: { ...(cur.controls?.[id] ?? {}), ...patch } } }))
  const resetControl = (id: string) =>
    update((cur) => {
      const next = { ...(cur.controls ?? {}) }
      delete next[id]
      return { ...cur, controls: next }
    })
  const toggleDetail = (t: IsoThemeId) =>
    update((cur) => {
      const d = new Set(cur.detailed ?? [])
      if (d.has(t)) d.delete(t)
      else d.add(t)
      return { ...cur, detailed: [...d] }
    })

  return (
    <Card>
      <CardHeader
        title={tr('Les quatre thèmes de l’annexe A', 'The four Annex A themes')}
        subtitle={tr(
          'Saisie groupée par thème ; dépliez un thème pour traiter ses contrôles un à un. Une saisie par contrôle prime sur celle du thème.',
          'Grouped entry per theme; expand a theme to handle its controls one by one. A per-control entry takes precedence over the theme entry.',
        )}
        icon={<BadgeCheck size={16} />}
      />
      <ul className="divide-y divide-rule">
        {ISO_THEMES.map((t) => {
          const meta = ISO_THEME_META[t]
          const entry = assessment.themes?.[t] ?? {}
          const open = (assessment.detailed ?? []).includes(t) || focusTheme === t
          const controls = ISO_CONTROLS.filter((c) => c.theme === t)
          const own = controls.filter((c) => assessment.controls?.[c.id]?.applicability).length
          return (
            <li key={t} className="px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-4">{meta.code}</span>
                    <span className="text-sm font-semibold text-ink">{meta.label}</span>
                  </div>
                  <div className="mt-0.5 text-2xs text-ink-3">
                    {tr(`${meta.count} contrôles`, `${meta.count} controls`)}
                    {own > 0 ? tr(` · ${own} détaillé${own > 1 ? 's' : ''}`, ` · ${own} detailed`) : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDetail(t)}
                    disabled={readOnly && !open}
                    className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline disabled:text-ink-4"
                    aria-expanded={open}
                  >
                    <ChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} />
                    {open ? tr('Replier les contrôles', 'Collapse controls') : tr('Traiter contrôle par contrôle', 'Handle control by control')}
                  </button>
                </div>
                <div className="space-y-2">
                  <Decision value={entry} disabled={readOnly} label={meta.label} onChange={(p) => setTheme(t, p)} />
                  <JustificationInput value={entry.justification} disabled={readOnly} onChange={(v) => setTheme(t, { justification: v })} />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {open ? (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-2 overflow-hidden border-l-2 border-rule pl-4"
                  >
                    {controls.map((c) => {
                      const ownEntry = assessment.controls?.[c.id] ?? {}
                      return (
                        <li
                          key={c.id}
                          id={`iso-${c.id}`}
                          className={cn('grid gap-2 rounded-md bg-sunken px-3 py-2.5 lg:grid-cols-[15rem_1fr]', focus === c.id && 'ring-2 ring-accent')}
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-2xs text-ink-4">A.{c.id}</span>
                            <p className="text-xs leading-snug text-ink">{c.title}</p>
                            {ownEntry.applicability && !readOnly ? (
                              <button type="button" onClick={() => resetControl(c.id)} className="mt-1 text-[10px] text-ink-4 hover:text-accent">
                                {tr('Revenir à la saisie du thème', 'Back to the theme entry')}
                              </button>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Decision value={ownEntry} inherited={entry} disabled={readOnly} label={`A.${c.id}`} onChange={(p) => setControl(c.id, p)} />
                            {ownEntry.applicability ? (
                              <JustificationInput value={ownEntry.justification} disabled={readOnly} onChange={(v) => setControl(c.id, { justification: v })} />
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </motion.ul>
                ) : null}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-rule px-5 py-3 text-[10px] leading-snug text-ink-4">
        {tr(
          "Numéros et intitulés des contrôles tels que documentés publiquement. Le texte de la norme ISO/IEC 27001:2022 et de l'ISO/IEC 27002 n'est pas reproduit.",
          'Control numbers and titles as publicly documented. The text of ISO/IEC 27001:2022 and ISO/IEC 27002 is not reproduced.',
        )}
      </p>
    </Card>
  )
}

/* ==========================================================================
   Import d'une déclaration d'applicabilité
   ========================================================================== */

function SoaImport({ assessment, readOnly, onDone }: { assessment: IsoAssessment; readOnly: boolean; onDone: () => void }) {
  const { entity } = useScoping()
  const edit = useEntityEditor()
  const input = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<SoaParseResult | null>(null)
  const [stored, setStored] = useState<StoredFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pick(f: File) {
    setError(null)
    setParsed(null)
    setStored(null)
    setFile(f)
    setBusy(true)
    try {
      const [result, saved] = await Promise.all([parseSoa(f), api.uploadSoa(entity!.id, f)])
      setParsed(result)
      setStored(saved)
      edit((cur) => ({
        iso_controls: { ...(cur.iso_controls ?? {}), soa: { id: saved.id, name: saved.name, size: saved.size, uploadedAt: saved.created_at, imported: 0 } },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function apply() {
    if (!parsed) return
    const themes = new Set<IsoThemeId>()
    for (const id of Object.keys(parsed.entries)) {
      const theme = ISO_CONTROLS.find((c) => c.id === id)?.theme
      if (theme) themes.add(theme)
    }
    edit((cur) => {
      const prev = cur.iso_controls ?? {}
      return {
        iso_controls: {
          ...prev,
          controls: { ...(prev.controls ?? {}), ...parsed.entries },
          detailed: [...new Set([...(prev.detailed ?? []), ...themes])],
          soa: prev.soa ? { ...prev.soa, imported: parsed.recognized } : prev.soa,
        },
      }
    })
    onDone()
  }

  async function download() {
    const blob = await api.downloadSoa(entity!.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = assessment.soa?.name ?? 'declaration-applicabilite'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function remove() {
    await api.deleteSoa(entity!.id)
    edit((cur) => {
      const next = { ...(cur.iso_controls ?? {}) }
      delete next.soa
      return { iso_controls: next }
    })
    setFile(null)
    setParsed(null)
    setStored(null)
  }

  const counts = parsed
    ? Object.values(parsed.entries).reduce(
        (acc, e) => {
          if (e.applicability === 'non_applicable') acc.na += 1
          else if (e.implementation === 'mis_en_oeuvre') acc.done += 1
          else if (e.implementation === 'partiel') acc.partial += 1
          else if (e.implementation === 'non_mis_en_oeuvre') acc.none += 1
          else acc.applicable += 1
          return acc
        },
        { na: 0, done: 0, partial: 0, none: 0, applicable: 0 },
      )
    : null

  return (
    <Card>
      <CardHeader
        title={tr("Déclaration d'applicabilité existante", 'Existing Statement of Applicability')}
        subtitle={tr(
          'CSV, TSV, XLSX ou ODS : les lignes portant un numéro de contrôle sont lues, puis soumises à votre validation. Un PDF est conservé comme pièce de référence, à reporter dans la checklist.',
          'CSV, TSV, XLSX or ODS: rows carrying a control number are read, then submitted for your review. A PDF is kept as a reference document, to be transcribed into the checklist.',
        )}
        icon={<FileSpreadsheet size={16} />}
      />
      <div className="space-y-4 p-5">
        {assessment.soa ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-sunken px-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{assessment.soa.name}</span>
              <span className="block text-2xs text-ink-3">
                {tr(`Déposée le ${formatDate(assessment.soa.uploadedAt)}`, `Uploaded on ${formatDate(assessment.soa.uploadedAt)}`)}
                {assessment.soa.imported ? tr(` · ${assessment.soa.imported} contrôles importés`, ` · ${assessment.soa.imported} controls imported`) : ''}
              </span>
            </span>
            <span className="flex gap-1.5">
              <Button size="sm" icon={<Download size={13} />} onClick={download}>
                {tr('Télécharger', 'Download')}
              </Button>
              {readOnly ? null : (
                <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={remove}>
                  {tr('Retirer', 'Remove')}
                </Button>
              )}
            </span>
          </div>
        ) : null}

        {readOnly ? (
          <p className="text-sm text-ink-3">{tr('Import indisponible sur la démonstration.', 'Import is not available on the demo.')}</p>
        ) : (
          <>
            <input
              ref={input}
              type="file"
              className="hidden"
              accept=".csv,.tsv,.txt,.xlsx,.ods,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pick(f)
                e.target.value = ''
              }}
            />
            <Button icon={<Upload size={14} />} disabled={busy} onClick={() => input.current?.click()}>
              {busy ? tr('Lecture…', 'Reading…') : tr('Choisir un fichier', 'Choose a file')}
            </Button>
          </>
        )}

        {error ? <p className="text-xs text-critical">{error}</p> : null}

        {file && parsed && stored ? (
          parsed.unreadable ? (
            <Callout tone="caution" title={tr('Fichier conservé, lecture automatique impossible', 'File kept, automatic reading not possible')}>
              {tr(
                "Aucun numéro de contrôle exploitable n'a été trouvé. Le fichier reste disponible en téléchargement ; reportez son contenu dans la checklist manuelle.",
                'No usable control number was found. The file remains available for download; transcribe its content into the manual checklist.',
              )}
            </Callout>
          ) : (
            <div className="rounded-lg border border-rule-2 p-4">
              <p className="text-sm text-ink">
                {tr(`${parsed.recognized} contrôles reconnus sur 93.`, `${parsed.recognized} of 93 controls recognised.`)}
              </p>
              {counts ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Tag tone="positive">{tr(`${counts.done} mis en œuvre`, `${counts.done} implemented`)}</Tag>
                  <Tag tone="caution">{tr(`${counts.partial} partiellement`, `${counts.partial} partially`)}</Tag>
                  <Tag tone="critical">{tr(`${counts.none} non mis en œuvre`, `${counts.none} not implemented`)}</Tag>
                  <Tag>{tr(`${counts.na} non applicables`, `${counts.na} not applicable`)}</Tag>
                  {counts.applicable ? <Tag>{tr(`${counts.applicable} applicables sans état`, `${counts.applicable} applicable, no state`)}</Tag> : null}
                </div>
              ) : null}
              <p className="mt-3 text-2xs text-ink-3">
                {tr(
                  'Les contrôles reconnus remplacent les saisies existantes pour ces mêmes contrôles ; les autres ne sont pas modifiés. Tout reste modifiable ensuite dans la checklist.',
                  'Recognised controls replace existing entries for the same controls; others are unchanged. Everything remains editable afterwards in the checklist.',
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm" onClick={apply}>
                  {tr('Appliquer à la checklist', 'Apply to the checklist')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setParsed(null)}>
                  {tr('Ignorer', 'Ignore')}
                </Button>
              </div>
            </div>
          )
        ) : null}
      </div>
    </Card>
  )
}

/* ==========================================================================
   Étape 9 : contrôles exclus d'exigences obligatoires
   ========================================================================== */

function ExclusionAlerts() {
  const { iso } = useScoping()
  const alerts = [...iso.alerts.values()]
  if (alerts.length === 0) return null
  return (
    <Card>
      <CardHeader
        title={tr('Contrôles exclus, exigences toujours obligatoires', 'Excluded controls, requirements still mandatory')}
        subtitle={tr(
          'Un contrôle déclaré non applicable dans la démarche ISO ne supprime pas l’obligation réglementaire correspondante.',
          'A control declared not applicable in the ISO initiative does not remove the corresponding regulatory obligation.',
        )}
        icon={<TriangleAlert size={16} />}
      />
      <ul className="divide-y divide-rule">
        {alerts.map((a) => {
          const theme = CROSSWALK_BY_ID.get(a.themeId)
          return (
            <li key={a.themeId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link to={`/app/evaluation`} className="text-sm font-medium text-ink hover:text-accent">
                  {theme?.title}
                </Link>
                <p className="mt-0.5 text-2xs text-caution">
                  {tr(
                    `Exclu de la démarche ISO 27001 (${a.controls.map((c) => `A.${c}`).join(', ')}) mais obligatoire au titre de ${a.regulations.map((r) => REGULATIONS[r].shortName).join(', ')}.`,
                    `Excluded from the ISO 27001 initiative (${a.controls.map((c) => `A.${c}`).join(', ')}) but mandatory under ${a.regulations.map((r) => REGULATIONS[r].shortName).join(', ')}.`,
                  )}
                </p>
              </div>
              <span className="flex gap-1">
                {a.regulations.map((r) => (
                  <RegChip key={r} id={r} size="sm" />
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ==========================================================================
   Étape 10 : recoupement par référentiel
   ========================================================================== */

const CATEGORY_META: Record<Exclude<IsoOverlapCategory, 'sans_correspondance'>, { label: string; hint: string; bar: string; dot: string }> = {
  couvert: {
    label: tr('Couvertes par ISO 27001', 'Covered by ISO 27001'),
    hint: tr('Un contrôle correspondant est mis en œuvre, au moins partiellement.', 'A matching control is implemented, at least partially.'),
    bar: 'bg-positive',
    dot: 'bg-positive',
  },
  ecart: {
    label: tr('Contrôle correspondant exclu ou absent', 'Matching control excluded or missing'),
    hint: tr(
      'Un contrôle correspondant existe, mais il est non applicable, non mis en œuvre ou non renseigné.',
      'A matching control exists, but it is not applicable, not implemented or not filled in.',
    ),
    bar: 'bg-caution',
    dot: 'bg-caution',
  },
  structurel: {
    label: tr('Hors du champ d’ISO 27001', 'Outside the scope of ISO 27001'),
    hint: tr(
      'Délais de notification, responsabilité personnelle des dirigeants, tests avancés de DORA : sans équivalent par nature.',
      'Notification deadlines, personal liability of management, DORA advanced testing: no equivalent by nature.',
    ),
    bar: 'bg-ink-4',
    dot: 'bg-ink-4',
  },
}

const ORDER = ['couvert', 'ecart', 'structurel'] as const

function Overlap() {
  const { applicable, iso } = useScoping()
  const [openReg, setOpenReg] = useState<string | null>(null)
  const rows = useMemo(
    () =>
      applicable.map((r) => {
        const items = isoOverlap(r, iso.context)
        return { regulation: r, items }
      }),
    [applicable, iso.context],
  )

  return (
    <section className="space-y-3">
      <SectionRule>{tr('Recoupement avec les référentiels applicables', 'Overlap with the applicable frameworks')}</SectionRule>
      <Card>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-rule px-5 py-3" aria-label={tr('Légende', 'Legend')}>
          {ORDER.map((c) => (
            <Tooltip key={c} content={CATEGORY_META[c].hint}>
              <span className="inline-flex items-center gap-2 text-2xs text-ink-2">
                <span className={cn('size-2.5 rounded-[3px]', CATEGORY_META[c].dot)} aria-hidden />
                {CATEGORY_META[c].label}
              </span>
            </Tooltip>
          ))}
        </div>
        <ul className="divide-y divide-rule">
          {rows.map(({ regulation, items }) => {
            const counted = items.filter((i) => i.category !== 'sans_correspondance')
            const unmapped = items.length - counted.length
            const total = counted.length
            const n = (c: IsoOverlapCategory) => counted.filter((i) => i.category === c).length
            const open = openReg === regulation
            return (
              <li key={regulation} className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpenReg(open ? null : regulation)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  aria-expanded={open}
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight size={13} className={cn('text-ink-4 transition-transform', open && 'rotate-90')} />
                    <RegChip id={regulation} size="sm" />
                    <span className="text-2xs text-ink-3">{tr(`${total} obligations dans le périmètre`, `${total} obligations in scope`)}</span>
                  </span>
                  <span className="flex gap-3 text-2xs text-ink-2">
                    {ORDER.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1">
                        <span className={cn('size-2 rounded-[2px]', CATEGORY_META[c].dot)} aria-hidden />
                        <span className="tabular font-semibold text-ink">{n(c)}</span>
                      </span>
                    ))}
                  </span>
                </button>
                {total > 0 ? (
                  <div className="mt-2.5 flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={ORDER.map((c) => `${CATEGORY_META[c].label}${COLON}${n(c)}`).join(', ')}>
                    {ORDER.filter((c) => n(c) > 0).map((c) => (
                      <Tooltip key={c} content={`${CATEGORY_META[c].label}${COLON}${n(c)} / ${total}`}>
                        <motion.span
                          className={cn('h-full first:rounded-l-[4px] last:rounded-r-[4px]', CATEGORY_META[c].bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${(n(c) / total) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </Tooltip>
                    ))}
                  </div>
                ) : null}
                {unmapped > 0 ? (
                  <p className="mt-1.5 text-[10px] text-ink-4">
                    {tr(
                      `${unmapped} obligation${unmapped > 1 ? 's' : ''} sans correspondance ISO établie, non comptée${unmapped > 1 ? 's' : ''} dans les trois catégories.`,
                      `${unmapped} obligation${unmapped > 1 ? 's' : ''} without an established ISO match, not counted in the three categories.`,
                    )}
                  </p>
                ) : null}
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {ORDER.map((c) => (
                          <div key={c} className="rounded-md bg-sunken p-3">
                            <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-ink-2">
                              <span className={cn('size-2 rounded-[2px]', CATEGORY_META[c].dot)} aria-hidden />
                              {CATEGORY_META[c].label}
                            </div>
                            <ul className="space-y-1">
                              {counted
                                .filter((i) => i.category === c)
                                .map((i) => (
                                  <li key={i.obligation.id} className="text-xs leading-snug">
                                    <Link to={`/app/corpus?obligation=${i.obligation.id}`} className="text-ink hover:text-accent">
                                      <span className="ref text-ink-4">{i.obligation.shortRef ?? i.obligation.article}</span> {i.obligation.title}
                                    </Link>
                                    {i.structural ? <span className="block text-[10px] text-ink-4">{ISO_STRUCTURAL_LABEL[i.structural]}</span> : null}
                                    {c !== 'structurel' ? (
                                      <span className="block text-[10px] text-ink-4">
                                        {i.controls
                                          .filter((id) => !id.startsWith('C'))
                                          .slice(0, 6)
                                          .map((id) => {
                                            const s = effectiveControl(iso.context.assessment, id)
                                            return `A.${id}${s.applicability === 'non_applicable' ? ' (NA)' : ''}`
                                          })
                                          .join(' · ')}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
        <p className="border-t border-rule px-5 py-3 text-[10px] leading-snug text-ink-4">
          {tr(
            `Table de correspondance : ${ISO_MAPPING.filter((m) => m.confidence === 'etablie').length} exigences unifiées reliées à des contrôles ISO de façon établie, ${ISO_MAPPING.filter((m) => m.confidence === 'a_valider').length} pistes à valider, non utilisées pour le pré-remplissage.`,
            `Mapping table: ${ISO_MAPPING.filter((m) => m.confidence === 'etablie').length} unified requirements linked to ISO controls with an established match, ${ISO_MAPPING.filter((m) => m.confidence === 'a_valider').length} leads to be validated, not used for pre-filling.`,
          )}
        </p>
      </Card>
    </section>
  )
}
