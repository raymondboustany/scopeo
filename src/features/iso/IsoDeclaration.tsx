import { useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, ListChecks, TriangleAlert } from 'lucide-react'
import { Button, Dialog, Input, LinkButton, SegmentedControl } from '@/components/ui/controls'
import { Callout, Card, CardHeader } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useEntityEditor } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { tr } from '@/i18n'
import { isManualLevel, isoProgress, isoSuggestions, perimeterIsPartial } from '@/engines/iso'
import { ISO_THEMES, type IsoAssessment, type IsoPerimeter, type IsoProfile } from '@/types/domain'
import { IsoBadge } from './IsoBadge'
import { ISO_STATUS_OPTIONS, namedList } from './labels'

/**
 * Déclaration de la démarche ISO/IEC 27001 : statut, validité du certificat et
 * périmètre couvert.
 *
 * Elle vit dans le module ISO et à la fin du questionnaire de qualification,
 * jamais dans la fiche entité. Elle ne pré-remplit rien sans que l'utilisateur
 * l'ait demandé : « certifié » ou « conforme » propose le pré-remplissage,
 * « partiel » ou « aucune démarche » renvoie vers la checklist ou l'évaluation.
 */

export function IsoDeclaration({ showFollowUp = true }: { showFollowUp?: boolean }) {
  const scoping = useScoping()
  const { entity, readOnly, applicable, iso } = scoping
  const edit = useEntityEditor()
  const [confirmation, setConfirmation] = useState<{ count: number } | null>(null)

  const profile: IsoProfile | undefined = entity?.profile?.iso27001
  const status = profile?.status
  const current: IsoProfile = profile ?? {}
  const assessment: IsoAssessment = useMemo(() => entity?.iso_controls ?? {}, [entity?.iso_controls])
  const progress = isoProgress(assessment)
  const named = namedList(applicable)
  const asksPerimeter = status === 'certifie' || status === 'conforme' || status === 'partiel'
  const stale =
    profile?.perimeter &&
    profile.perimeterRegulations &&
    (profile.perimeterRegulations.length !== applicable.length || profile.perimeterRegulations.some((r) => !applicable.includes(r)))
  const perimeterKnown = Boolean(profile?.perimeter)
  const blocked = perimeterIsPartial(profile)

  const setProfile = (next: IsoProfile) => edit((cur) => ({ profile: { ...(cur.profile ?? {}), iso27001: next } }))

  // Ce que le pré-remplissage produirait, calculé sur l'état après application.
  const prefillPreview = useMemo(() => {
    const themes: IsoAssessment['themes'] = { ...(assessment.themes ?? {}) }
    for (const t of ISO_THEMES) if (!themes[t]?.applicability) themes[t] = { applicability: 'applicable', implementation: 'mis_en_oeuvre' }
    const next: IsoAssessment = { ...assessment, themes }
    const manual = entity?.coverage ?? {}
    const count = [...isoSuggestions({ ...iso.context, profile, assessment: next }).values()].filter((x) => x.level && !isManualLevel(manual[x.themeId])).length
    return { next, count }
  }, [assessment, iso.context, profile, entity?.coverage])

  function applyPrefill() {
    edit({ iso_controls: prefillPreview.next })
    setConfirmation({ count: prefillPreview.count })
  }

  const canPrefill = (status === 'certifie' || status === 'conforme') && perimeterKnown && !blocked && progress.assessed === 0

  return (
    <>
      <Card>
        <CardHeader
          title={tr('Démarche ISO/IEC 27001', 'ISO/IEC 27001 status')}
          subtitle={tr(
            'Facultatif. Où en est l’entité au regard de la norme ISO/IEC 27001 ?',
            'Optional. Where does the entity stand against the ISO/IEC 27001 standard?',
          )}
          icon={<BadgeCheck size={16} />}
          aside={<IsoBadge iso={profile} size="sm" />}
        />
        <div className="space-y-5 p-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={tr('Statut ISO 27001', 'ISO 27001 status')}>
            {ISO_STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={status === o.value}
                disabled={readOnly}
                onClick={() =>
                  setProfile({ ...current, status: o.value, ...(o.value === 'aucune' ? { perimeter: undefined, perimeterRegulations: undefined, validUntil: undefined } : {}) })
                }
                className={cn(
                  'rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                  'choice',
                )}
              >
                <span className={cn('block text-sm font-medium', status === o.value ? 'text-accent-strong' : 'text-ink')}>{o.label}</span>
                <span className="block text-2xs text-ink-3">{o.hint}</span>
              </button>
            ))}
          </div>

          {status === 'certifie' ? (
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Date de fin de validité du certificat', 'Certificate expiry date')}</span>
              <Input type="date" disabled={readOnly} value={current.validUntil ?? ''} onChange={(e) => setProfile({ ...current, validUntil: e.target.value })} />
            </label>
          ) : null}

          {asksPerimeter ? (
            <div className="rounded-xl border border-rule bg-raised p-4">
              <p className="text-sm font-medium text-ink">
                {tr(
                  `La démarche ISO 27001 couvre-t-elle l'intégralité du périmètre concerné par ${named}, ou seulement une partie ?`,
                  `Does the ISO 27001 initiative cover the entire scope concerned by ${named}, or only part of it?`,
                )}
              </p>
              <p className="mt-1 text-2xs text-ink-3">
                {tr(
                  'Périmètre de certification, systèmes, sites et activités inclus. Une couverture partielle désactive le pré-remplissage automatique : chaque exigence est alors à évaluer à la main.',
                  'Certification scope, systems, sites and activities included. Partial coverage turns off automatic pre-filling: each requirement must then be assessed by hand.',
                )}
              </p>
              <div className="mt-3">
                <SegmentedControl<IsoPerimeter>
                  ariaLabel={tr('Couverture du périmètre', 'Scope coverage')}
                  value={current.perimeter as IsoPerimeter}
                  onChange={(v) => !readOnly && setProfile({ ...current, perimeter: v, perimeterRegulations: applicable })}
                  options={[
                    { value: 'integral', label: tr("L'intégralité du périmètre", 'The entire scope') },
                    { value: 'partiel', label: tr('Une partie seulement', 'Only part of it') },
                  ]}
                />
              </div>
              {stale ? (
                <p className="mt-3 flex items-start gap-2 text-2xs text-caution">
                  <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                  {tr(
                    'Les textes applicables ont changé depuis cette réponse. Vérifiez qu’elle vaut toujours pour le périmètre actuel, puis confirmez-la.',
                    'The applicable texts have changed since this answer. Check that it still holds for the current scope, then confirm it.',
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {showFollowUp && (status === 'certifie' || status === 'conforme') && perimeterKnown ? (
            blocked ? (
              <Callout tone="caution" icon={<TriangleAlert size={14} />} title={tr('Pré-remplissage désactivé', 'Pre-filling turned off')}>
                {tr(
                  "La démarche ne couvre qu'une partie du périmètre : rien n'est pré-rempli, car on ne peut pas savoir quelles exigences elle recouvre. Évaluez chaque exigence à la main, ou renseignez la checklist ISO pour aller plus loin.",
                  'The initiative only covers part of the scope: nothing is pre-filled, because there is no way to know which requirements it covers. Assess each requirement by hand, or fill in the ISO checklist to go further.',
                )}
              </Callout>
            ) : progress.assessed === 0 ? (
              <div className="rounded-lg border border-accent-line bg-accent-wash p-4">
                <p className="text-sm font-medium text-ink">
                  {tr(
                    'Pré-remplir les exigences correspondantes à partir de votre démarche ISO 27001 ?',
                    'Pre-fill the matching requirements from your ISO 27001 initiative?',
                  )}
                </p>
                <p className="mt-1 text-2xs text-ink-2">
                  {tr(
                    "Les exigences NIS2 (ReCyF), DORA et CRA qui ont un contrôle ISO correspondant sont marquées « Renseigné via ISO 27001 ». Chacune reste modifiable, et rien n'est pré-rempli pour les délais de notification, la responsabilité personnelle des dirigeants et les tests de résilience avancés de DORA.",
                    'NIS2 (ReCyF), DORA and CRA requirements that have a matching ISO control are marked "Filled in via ISO 27001". Each one stays editable, and nothing is pre-filled for notification deadlines, the personal liability of managers or DORA advanced resilience testing.',
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" disabled={readOnly || !canPrefill} icon={<CheckCircle2 size={13} />} onClick={applyPrefill}>
                    {tr('Oui, pré-remplir', 'Yes, pre-fill')}
                  </Button>
                  <LinkButton to="/app/evaluation" size="md" icon={<ArrowRight size={13} />}>
                    {tr('Non, j’évalue à la main', 'No, I will assess by hand')}
                  </LinkButton>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-3">
                {tr(
                  'Les contrôles de l’annexe A sont déjà renseignés : le pré-remplissage des exigences suit ce que vous y avez déclaré.',
                  'The Annex A controls are already filled in: pre-filling of the requirements follows what you declared there.',
                )}
              </p>
            )
          ) : null}

          {showFollowUp && (status === 'partiel' || status === 'aucune') ? (
            <div className="rounded-xl border border-rule bg-raised p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <ListChecks size={14} className="text-ink-3" />
                {status === 'partiel'
                  ? tr('Faire correspondre ce qui est déjà en place', 'Match what is already in place')
                  : tr('Rien à pré-remplir pour le moment', 'Nothing to pre-fill for now')}
              </p>
              <p className="mt-1 text-2xs text-ink-3">
                {status === 'partiel'
                  ? tr(
                      "Vous pouvez renseigner la checklist ISO 27001, même sur quelques points seulement : les exigences correspondantes se pré-rempliront à mesure. Vous pouvez aussi cocher directement les exigences des textes, dans l'évaluation.",
                      'You can fill in the ISO 27001 checklist, even for a few points only: the matching requirements will be pre-filled as you go. You can also tick the requirements of the texts directly, in the assessment.',
                    )
                  : tr(
                      "Sans démarche ISO 27001, rien n'est pré-rempli. Vous cochez directement les exigences des textes dans l'évaluation. La checklist reste disponible si vous voulez faire le point sur les contrôles.",
                      'With no ISO 27001 initiative, nothing is pre-filled. You tick the requirements of the texts directly in the assessment. The checklist stays available if you want to take stock of the controls.',
                    )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === 'partiel' ? (
                  <LinkButton to="/app/iso27001" variant="primary" size="md" icon={<ListChecks size={13} />}>
                    {tr('Remplir la checklist ISO 27001', 'Fill in the ISO 27001 checklist')}
                  </LinkButton>
                ) : null}
                <LinkButton to="/app/evaluation" size="md" icon={<ArrowRight size={13} />}>
                  {tr("Aller à l'évaluation", 'Go to the assessment')}
                </LinkButton>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Dialog
        open={confirmation !== null}
        onOpenChange={(v) => !v && setConfirmation(null)}
        title={tr('Correspondance effectuée', 'Matching done')}
        description={tr('Les exigences ont été renseignées à partir de votre démarche ISO 27001.', 'Requirements were filled in from your ISO 27001 initiative.')}
        footer={
          <>
            <Button onClick={() => setConfirmation(null)}>{tr('Fermer', 'Close')}</Button>
            <LinkButton to="/app/evaluation" variant="primary" size="md" icon={<ArrowRight size={13} />}>
              {tr("Vérifier dans l'évaluation", 'Check in the assessment')}
            </LinkButton>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            {confirmation && confirmation.count > 0
              ? tr(
                  `${confirmation.count} exigence${confirmation.count > 1 ? 's' : ''} ${confirmation.count > 1 ? 'ont' : 'a'} été pré-remplie${confirmation.count > 1 ? 's' : ''} via ISO 27001. Elles portent la mention « Renseigné via ISO 27001 » dans l'évaluation.`,
                  `${confirmation.count} requirement${confirmation.count > 1 ? 's were' : ' was'} pre-filled via ISO 27001. They carry the "Filled in via ISO 27001" tag in the assessment.`,
                )
              : tr(
                  "Aucune exigence n'avait de contrôle ISO correspondant sur les textes applicables : rien n'a été pré-rempli.",
                  'No requirement had a matching ISO control among the applicable texts: nothing was pre-filled.',
                )}
          </p>
          <p>
            {tr(
              'Vérifiez ce résultat : chaque niveau reste modifiable à la main, et la checklist ISO permet de déclarer les contrôles exclus de votre déclaration d’applicabilité ou seulement partiellement en place.',
              'Please check the result: each level can still be changed by hand, and the ISO checklist lets you declare controls excluded from your Statement of Applicability or only partly in place.',
            )}
          </p>
          <p className="text-2xs text-ink-3">
            {tr(
              'Jamais pré-remplis : les délais de notification, la responsabilité personnelle des dirigeants et les tests de résilience avancés de DORA.',
              'Never pre-filled: notification deadlines, the personal liability of managers and DORA advanced resilience testing.',
            )}
          </p>
        </div>
      </Dialog>
    </>
  )
}
