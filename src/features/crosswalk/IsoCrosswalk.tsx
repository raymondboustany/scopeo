import { Link } from 'react-router-dom'
import { BadgeCheck, Info } from 'lucide-react'
import { Tag } from '@/components/ui/primitives'
import { Tooltip } from '@/components/ui/controls'
import { SectionRule } from '@/components/ui/primitives'
import { ISO_STRUCTURAL_LABEL } from '@/data/iso27001'
import type { IsoControlStatus, IsoThemeSummary, IsoThemeView } from '@/engines/iso'
import { cn } from '@/lib/utils'
import { COLON, tr } from '@/i18n'
import { controlLabel } from '@/features/iso/labels'

/**
 * Affichage du croisement avec ISO/IEC 27001 dans la carte : une colonne dans
 * la matrice, et une section dans la fiche de l'exigence.
 */

const SUMMARY: Record<IsoThemeSummary, { label: string; tone: string; dot: string }> = {
  couvert: { label: tr('Couvert', 'Covered'), tone: 'bg-positive-wash text-positive', dot: 'bg-positive' },
  partiel: { label: tr('Partiel', 'Partial'), tone: 'bg-caution-wash text-caution', dot: 'bg-caution' },
  ecart: { label: tr('Non mis en œuvre', 'Not implemented'), tone: 'bg-critical-wash text-critical', dot: 'bg-critical' },
  exclu: { label: tr('Exclu', 'Excluded'), tone: 'bg-critical-wash text-critical', dot: 'bg-critical' },
  non_renseigne: { label: tr('À renseigner', 'To fill in'), tone: 'bg-overlay text-ink-3', dot: 'bg-rule-3' },
}

const CONTROL_STATUS: Record<IsoControlStatus, { label: string; dot: string }> = {
  mis_en_oeuvre: { label: tr('Mis en œuvre', 'Implemented'), dot: 'bg-positive' },
  partiel: { label: tr('Partiellement mis en œuvre', 'Partially implemented'), dot: 'bg-caution' },
  non_mis_en_oeuvre: { label: tr('Non mis en œuvre', 'Not implemented'), dot: 'bg-critical' },
  exclu: { label: tr('Non applicable', 'Not applicable'), dot: 'bg-critical' },
  non_renseigne: { label: tr('Non renseigné', 'Not filled in'), dot: 'bg-rule-3' },
}

export function IsoHeader() {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md bg-overlay px-1.5 text-[10px] font-medium text-ink-2">
      <BadgeCheck size={10} /> ISO 27001
    </span>
  )
}

/** Cellule de la matrice : l'état de la démarche pour cette exigence, en un coup d'œil. */
export function IsoCell({ view }: { view: IsoThemeView }) {
  if (view.kind === 'aucune') {
    return (
      <span className="text-ink-4" aria-label={tr('Pas de correspondance ISO 27001', 'No ISO 27001 match')}>
        ·
      </span>
    )
  }
  if (view.kind === 'structurel') {
    return (
      <Tooltip content={view.structural ? ISO_STRUCTURAL_LABEL[view.structural] : ''}>
        <span className="text-2xs text-ink-4">{tr('Hors ISO', 'Outside ISO')}</span>
      </Tooltip>
    )
  }
  const s = SUMMARY[view.summary]
  const tentative = view.confidence === 'a_valider'
  return (
    <Tooltip
      content={
        <span className="block max-w-xs space-y-1">
          {view.controls.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className={cn('size-1.5 shrink-0 rounded-full', CONTROL_STATUS[c.status].dot)} />
              <span className="ref">{controlLabel(c.id)}</span>
              <span className="truncate">{c.title}</span>
            </span>
          ))}
          {tentative ? <span className="block text-ink-4">{tr('Piste à faire valider', 'Lead to be validated')}</span> : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-xs px-1 py-0.5 text-[10px] font-medium',
          s.tone,
          tentative && 'border border-dashed border-rule-3',
        )}
      >
        <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
        {view.summary === 'non_renseigne' ? `${view.controls.length} ${tr('ctrl.', 'ctrl.')}` : s.label}
      </span>
    </Tooltip>
  )
}

/** Section de la fiche : les contrôles ISO qui recoupent l'exigence unifiée. */
export function IsoThemeSection({ view }: { view: IsoThemeView }) {
  return (
    <section>
      <SectionRule aside={<IsoHeader />}>{tr('Croisement avec ISO/IEC 27001', 'Overlap with ISO/IEC 27001')}</SectionRule>

      {view.kind === 'structurel' ? (
        <p className="mt-2.5 flex items-start gap-2 text-sm text-ink-2">
          <Info size={14} className="mt-0.5 shrink-0 text-ink-3" />
          {tr(
            `Hors du champ d'ISO 27001 par nature${COLON}${view.structural ? ISO_STRUCTURAL_LABEL[view.structural].toLowerCase() : ''}. Cette exigence ne se couvre pas par un contrôle de la norme et n'est jamais pré-remplie.`,
            `Outside the scope of ISO 27001 by nature${COLON}${view.structural ? ISO_STRUCTURAL_LABEL[view.structural].toLowerCase() : ''}. This requirement cannot be met by a control of the standard and is never pre-filled.`,
          )}
        </p>
      ) : view.kind === 'aucune' ? (
        <p className="mt-2.5 text-sm text-ink-3">{tr("Aucune correspondance ISO 27001 n'est établie pour cette exigence.", 'No ISO 27001 match is established for this requirement.')}</p>
      ) : (
        <div className="mt-2.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={view.summary === 'couvert' ? 'positive' : view.summary === 'partiel' ? 'caution' : view.summary === 'non_renseigne' ? 'neutral' : 'critical'}>
              {SUMMARY[view.summary].label}
            </Tag>
            {view.confidence === 'a_valider' ? <Tag tone="brass">{tr('Piste à faire valider', 'Lead to be validated')}</Tag> : null}
          </div>
          <ul className="space-y-1.5">
            {view.controls.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm text-ink-2">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', CONTROL_STATUS[c.status].dot)} aria-hidden />
                <span className="min-w-0">
                  <span className="ref mr-1.5 text-ink-3">{controlLabel(c.id)}</span>
                  {c.title}
                  <span className="ml-1.5 text-2xs text-ink-4">{CONTROL_STATUS[c.status].label}</span>
                </span>
              </li>
            ))}
          </ul>
          {view.capReason ? <p className="border-l border-rule-2 pl-2 text-xs italic leading-relaxed text-ink-3">{view.capReason}</p> : null}
          {view.note ? <p className="border-l border-rule-2 pl-2 text-xs italic leading-relaxed text-ink-3">{view.note}</p> : null}
          <p className="text-2xs text-ink-4">
            {view.confidence === 'a_valider'
              ? tr("Cette correspondance sert de piste : elle ne pré-remplit jamais l'évaluation.", 'This match is a lead only: it never pre-fills the assessment.')
              : tr("Cette correspondance alimente le pré-remplissage de l'évaluation, toujours modifiable.", 'This match feeds the pre-filling of the assessment, which stays editable.')}
          </p>
          <Link to="/app/iso27001" className="inline-block text-xs text-accent hover:underline">
            {tr('Ouvrir la checklist ISO 27001', 'Open the ISO 27001 checklist')}
          </Link>
        </div>
      )}
    </section>
  )
}
